import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RESET_POLICIES,
  ResetFailure,
  acquireProjectLock,
  assertActiveProfile,
  buildComposeCommand,
  buildContainerRemovalCommands,
  buildMigrationCommand,
  buildSnapshotComposeCommand,
  buildSqlCommand,
  createResetPlan,
  createInvocationContext,
  applicationTableQuery,
  removeVerifiedTarget,
  runResetWorkflow,
  verifyStablePlan,
  validateDevInvocation,
  validatePersonalConfirmation,
  volumeFingerprint,
} from "./reset-local-database.mjs";

const composePath = fileURLToPath(new URL("../docker-compose.yml", import.meta.url));
const devResetPath = fileURLToPath(new URL("./reset-dev-database.mjs", import.meta.url));
const personalResetPath = fileURLToPath(new URL("./guard-personal-reset.mjs", import.meta.url));

const readComposeService = (service) => {
  const lines = readFileSync(composePath, "utf8").split(/\r?\n/);
  const start = lines.indexOf(`  ${service}:`);
  assert.notEqual(start, -1, `Expected ${service} in docker-compose.yml`);
  const end = lines.findIndex((line, index) => index > start && (/^  \S/.test(line) || line === "volumes:"));
  const block = lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
  return {
    containerName: block.match(/container_name: (.+)/)?.[1],
    database: block.match(/POSTGRES_DB: (.+)/)?.[1],
    port: block.match(/([0-9]+):5432/)?.[1],
    volume: block.match(/- ([^:]+):\/var\/lib\/postgresql\/data/)?.[1],
    hasComposeProfiles: /^    profiles:/m.test(block),
  };
};

test("frozen reset policies match the repository Compose topology", () => {
  const dev = readComposeService("postgres-dev");
  const personal = readComposeService("postgres-personal");
  assert.equal(Object.isFrozen(RESET_POLICIES), true);
  assert.equal(RESET_POLICIES.dev.files[0], "docker-compose.yml");
  assert.equal(RESET_POLICIES.dev.applicationProfile, "dev");
  assert.equal(RESET_POLICIES.personal.applicationProfile, "personal");
  assert.deepEqual(RESET_POLICIES.dev.composeProfiles, []);
  assert.deepEqual(RESET_POLICIES.personal.composeProfiles, []);
  assert.equal(dev.hasComposeProfiles, false);
  assert.equal(personal.hasComposeProfiles, false);
  assert.equal(RESET_POLICIES.dev.service, "postgres-dev");
  assert.equal(RESET_POLICIES.personal.service, "postgres-personal");
  assert.equal(RESET_POLICIES.dev.database, dev.database);
  assert.equal(RESET_POLICIES.personal.database, personal.database);
  assert.equal(RESET_POLICIES.dev.port, dev.port);
  assert.equal(RESET_POLICIES.personal.port, personal.port);
  assert.equal(RESET_POLICIES.dev.logicalVolume, dev.volume);
  assert.equal(RESET_POLICIES.personal.logicalVolume, personal.volume);
  assert.throws(() => { RESET_POLICIES.dev.service = "postgres-personal"; }, TypeError);
});

test("invocation context builds explicit Compose argv and removes ambient Compose defaults", () => {
  const context = createInvocationContext({
    policyName: "dev",
    cwd: "C:/repo",
    sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
    environment: {
      HOME: "must-not-leak",
      DATABASE_URL: "must-not-leak",
    },
  });

  assert.deepEqual(context, {
    cwd: "C:/repo",
    projectName: "repo",
    composeFiles: [{ path: "C:/repo/docker-compose.yml", sha256: "compose-hash" }],
    applicationProfile: "dev",
    composeProfiles: [],
    envFile: { path: "C:/repo/.env", sha256: "env-hash" },
    composeEnv: {},
    service: "postgres-dev",
    database: "appfinanzas_dev",
    port: "5433",
    logicalVolume: "appfinanzas_postgres_dev_data",
    renderedConfig: null,
  });
  assert.deepEqual(buildComposeCommand(context, ["config", "--format", "json"]), [
    "docker",
    [
      "compose",
      "--project-name", "repo",
      "--project-directory", "C:/repo",
      "--file", "C:/repo/docker-compose.yml",
      "--env-file", "C:/repo/.env",
      "config", "--format", "json",
    ],
    context.composeEnv,
  ]);
});

test("invocation context rejects conflicting or unallowlisted Compose environment", () => {
  assert.throws(
    () => createInvocationContext({
      policyName: "dev",
      cwd: "/repo",
      sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
      environment: { COMPOSE_PROJECT_NAME: "other-project" },
    }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
  assert.throws(
    () => createInvocationContext({
      policyName: "dev",
      cwd: "/repo",
      sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
      environment: { COMPOSE_PARALLEL_LIMIT: "4" },
    }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
});

test("invocation context deeply freezes nested policy snapshots", () => {
  const context = createInvocationContext({
    policyName: "dev",
    cwd: "/repo",
    sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
  });

  assert.equal(Object.isFrozen(context.composeFiles[0]), true);
  assert.equal(Object.isFrozen(context.envFile), true);
  assert.throws(() => { context.composeFiles[0].path = "/attacker/docker-compose.yml"; }, TypeError);
  assert.throws(() => { context.composeFiles[0].sha256 = "attacker-hash"; }, TypeError);
  assert.throws(() => { context.envFile.sha256 = "attacker-hash"; }, TypeError);
});

test("public reset wrappers route valid invocations into guarded preflight", () => {
  const environment = { ...process.env, COMPOSE_PROJECT_NAME: "unsafe-override" };
  const dev = spawnSync(process.execPath, [devResetPath], { encoding: "utf8", env: environment });
  const personal = spawnSync(process.execPath, [
    personalResetPath,
    "--confirm", "RESET_APPFINANZAS_PERSONAL",
    "--profile", "appfinanzas_personal",
  ], { encoding: "utf8", env: environment });

  for (const result of [dev, personal]) {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /PREFLIGHT_REJECTED: Compose environment variable is not allowed: COMPOSE_PROJECT_NAME/);
    assert.doesNotMatch(result.stderr, /reset engine is not wired/i);
  }
});

test("active root environment must select the requested reset profile before mutation", () => {
  assert.equal(
    assertActiveProfile("dev", 'DATABASE_URL="postgresql://postgres:postgres@localhost:5433/appfinanzas_dev?schema=public"'),
    "dev",
  );
  assert.equal(
    assertActiveProfile("personal", 'DATABASE_URL="postgresql://postgres:postgres@localhost:5434/appfinanzas_personal?schema=public"'),
    "personal",
  );
  assert.throws(
    () => assertActiveProfile("dev", 'DATABASE_URL="postgresql://postgres:postgres@localhost:5434/appfinanzas_personal?schema=public"'),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
});

test("reconstruction uses the verified rendered snapshot and stops a running target before removal", () => {
  const context = resetContext();
  assert.deepEqual(buildContainerRemovalCommands("container-id"), [
    ["stop", "container-id"],
    ["rm", "container-id"],
  ]);
  assert.deepEqual(buildSnapshotComposeCommand(context, "/private/verified-compose.json", ["up", "--wait", "-d", context.service]), [
    "docker",
    [
      "compose",
      "--project-name", "repo",
      "--project-directory", "/repo",
      "--file", "/private/verified-compose.json",
      "up", "--wait", "-d", "postgres-dev",
    ],
    context.composeEnv,
  ]);
});

test("post-reset commands exclude migration control data, quiet psql tags, and shell pnpm.cmd on Windows", () => {
  assert.match(applicationTableQuery(), /table_name NOT IN \('_prisma_migrations', 'MonthlyLedgerBackfillControl'\)/);
  assert.deepEqual(buildMigrationCommand("dev", "win32"), ["pnpm.cmd", ["prisma:dev:migrate"], { shell: true }]);
  assert.deepEqual(buildMigrationCommand("personal", "linux"), ["pnpm", ["prisma:personal:migrate"], { shell: false }]);
  assert.deepEqual(buildSqlCommand("container-id", "appfinanzas_dev", "SELECT 1"), ["docker", ["exec", "container-id", "psql", "-U", "postgres", "-d", "appfinanzas_dev", "-q", "-tAc", "SELECT 1"]]);
});

test("personal reset requires the exact ordered dual confirmation without extra arguments", () => {
  assert.deepEqual(
    validatePersonalConfirmation(["--confirm", "RESET_APPFINANZAS_PERSONAL", "--profile", "appfinanzas_personal"]),
    { profile: "personal" },
  );
  assert.throws(
    () => validatePersonalConfirmation(["--profile", "appfinanzas_personal", "--confirm", "RESET_APPFINANZAS_PERSONAL"]),
    (error) => error instanceof ResetFailure && error.code === "CONFIRMATION_REJECTED",
  );
  assert.throws(
    () => validatePersonalConfirmation(["--confirm", "RESET_APPFINANZAS_PERSONAL", "--profile", "appfinanzas_personal", "--force"]),
    (error) => error instanceof ResetFailure && error.code === "CONFIRMATION_REJECTED",
  );
});

test("dev reset accepts no arguments and rejects accidental override arguments", () => {
  assert.deepEqual(validateDevInvocation([]), { profile: "dev" });
  assert.throws(
    () => validateDevInvocation(["--profile", "personal"]),
    (error) => error instanceof ResetFailure && error.code === "CONFIRMATION_REJECTED",
  );
});

test("reset failures expose stable pre- and post-mutation taxonomy", () => {
  const confirmationFailure = new ResetFailure("CONFIRMATION_REJECTED", "confirmation missing");
  assert.equal(confirmationFailure.name, "ResetFailure");
  assert.equal(confirmationFailure.code, "CONFIRMATION_REJECTED");
  assert.equal(confirmationFailure.phase, "pre-mutation");
  assert.equal(confirmationFailure.message, "confirmation missing");
  const mutationFailure = new ResetFailure("MUTATION_FAILED", "volume removal failed");
  assert.equal(mutationFailure.code, "MUTATION_FAILED");
  assert.equal(mutationFailure.phase, "post-mutation");
  assert.throws(() => new ResetFailure("UNKNOWN", "invalid"), /Unknown reset failure code/);
});

const resetContext = () => createInvocationContext({
  policyName: "dev",
  cwd: "/repo",
  sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
});

const verifiedTarget = {
  id: "container-id",
  name: "appfinanzas-postgres-dev",
  labels: { "com.docker.compose.project": "repo", "com.docker.compose.service": "postgres-dev" },
  mounts: [{ Name: "repo_appfinanzas_postgres_dev_data", Destination: "/var/lib/postgresql/data", RW: true }],
  port: "5433",
  database: "appfinanzas_dev",
  marker: "dev:system-id",
  systemIdentifier: "system-id",
  dataDirectory: "/var/lib/postgresql/data/base",
  volume: {
    Name: "repo_appfinanzas_postgres_dev_data",
    Driver: "local",
    Scope: "local",
    Options: {},
    Labels: { "com.docker.compose.project": "repo", "com.docker.compose.volume": "appfinanzas_postgres_dev_data" },
    CreatedAt: "2026-08-10T00:00:00Z",
    Mountpoint: "/var/lib/docker/volumes/repo_appfinanzas_postgres_dev_data/_data",
  },
  consumers: ["container-id"],
};

const renderedDevService = () => JSON.stringify({
  services: {
    "postgres-dev": {
      container_name: "appfinanzas-postgres-dev",
      environment: { POSTGRES_DB: "appfinanzas_dev" },
      ports: ["5433:5432"],
      volumes: ["appfinanzas_postgres_dev_data:/var/lib/postgresql/data"],
    },
    "postgres-personal": { container_name: "appfinanzas-postgres-personal" },
  },
  volumes: { appfinanzas_postgres_dev_data: {} },
});

test("reset plans bind the rendered target, runtime volume, fingerprint, and sole owner", () => {
  const render = renderedDevService;
  const plan = createResetPlan({ context: resetContext(), render, inspectTarget: () => verifiedTarget });

  assert.equal(plan.renderedConfig.sha256.length, 64);
  assert.equal(plan.target.containerId, "container-id");
  assert.equal(plan.target.volume.name, "repo_appfinanzas_postgres_dev_data");
  assert.equal(plan.target.volume.fingerprint.length, 64);
  assert.throws(
    () => createResetPlan({ context: resetContext(), render, inspectTarget: () => ({ ...verifiedTarget, marker: null }) }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
  assert.throws(
    () => createResetPlan({ context: resetContext(), render, inspectTarget: () => ({ ...verifiedTarget, consumers: ["container-id", "other-container"] }) }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
});

test("stable-plan validation rejects source, rendered, proof, and containment drift", () => {
  const render = renderedDevService;
  const plan = createResetPlan({ context: resetContext(), render, inspectTarget: () => verifiedTarget });

  assert.throws(
    () => verifyStablePlan({ plan, sourceHashes: { "docker-compose.yml": "changed", ".env": "env-hash" }, render, inspectTarget: () => verifiedTarget }),
    (error) => error instanceof ResetFailure && error.code === "PLAN_DRIFT",
  );
  assert.throws(
    () => verifyStablePlan({ plan, sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" }, render: () => "{}", inspectTarget: () => verifiedTarget }),
    (error) => error instanceof ResetFailure && error.code === "PLAN_DRIFT",
  );
  assert.throws(
    () => verifyStablePlan({ plan, sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" }, render, inspectTarget: () => ({ ...verifiedTarget, systemIdentifier: "changed", marker: "dev:changed" }) }),
    (error) => error instanceof ResetFailure && error.code === "PLAN_DRIFT",
  );
  assert.throws(
    () => createResetPlan({ context: resetContext(), render, inspectTarget: () => ({ ...verifiedTarget, dataDirectory: "/var/lib/postgresql/data-old/base" }) }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
});

const verifiedVolume = verifiedTarget.volume;

test("volume fingerprint is canonical and mutation removes only the saved target without force", () => {
  const first = volumeFingerprint({ volume: verifiedVolume, containerId: "container-id", mount: "/var/lib/postgresql/data" });
  const reordered = volumeFingerprint({ volume: { ...verifiedVolume, Labels: { "com.docker.compose.volume": "appfinanzas_postgres_dev_data", "com.docker.compose.project": "repo" } }, containerId: "container-id", mount: "/var/lib/postgresql/data" });
  const calls = [];
  const plan = { target: { containerId: "container-id", volume: { name: verifiedVolume.Name, fingerprint: first } } };
  let volumeInspection = 0;

  removeVerifiedTarget({
    plan,
    acquireLock: () => () => calls.push("unlock"),
    removeContainer: (id) => calls.push(["container", id]),
    inspectVolume: () => ({ volume: verifiedVolume, consumers: volumeInspection++ === 0 ? ["container-id"] : [], mount: "/var/lib/postgresql/data" }),
    removeVolume: (name, args) => calls.push(["volume", name, args]),
  });

  assert.equal(first, reordered);
  assert.deepEqual(calls, [["container", "container-id"], ["volume", verifiedVolume.Name, []], "unlock"]);
});

test("mutation fails closed when lock, volume identity, attachment, or removal fails", () => {
  const fingerprint = volumeFingerprint({ volume: verifiedVolume, containerId: "container-id", mount: "/var/lib/postgresql/data" });
  const plan = { target: { containerId: "container-id", volume: { name: verifiedVolume.Name, fingerprint } } };
  const dependencies = { acquireLock: () => () => {}, removeContainer: () => {}, removeVolume: () => {} };

  for (const inspectVolume of [
    () => ({ volume: { ...verifiedVolume, Driver: "other" }, consumers: [], mount: "/var/lib/postgresql/data" }),
    () => ({ volume: verifiedVolume, consumers: ["other-container"], mount: "/var/lib/postgresql/data" }),
  ]) {
    assert.throws(
      () => removeVerifiedTarget({ plan, inspectVolume, ...dependencies }),
      (error) => error instanceof ResetFailure && error.code === "MUTATION_FAILED",
    );
  }
  assert.throws(
    () => removeVerifiedTarget({ plan, inspectVolume: () => ({ volume: verifiedVolume, consumers: [], mount: "/var/lib/postgresql/data" }), acquireLock: () => { throw new Error("locked"); }, removeContainer: () => {}, removeVolume: () => {} }),
    (error) => error instanceof ResetFailure && error.code === "MUTATION_FAILED",
  );
});

test("reset plans accept Docker Compose's normalized port and volume representation", () => {
  const rendered = JSON.stringify({
    services: {
      "postgres-dev": {
        container_name: "appfinanzas-postgres-dev",
        environment: { POSTGRES_DB: "appfinanzas_dev" },
        ports: [{ published: "5433", target: 5432, protocol: "tcp" }],
        volumes: [{ type: "volume", source: "appfinanzas_postgres_dev_data", target: "/var/lib/postgresql/data" }],
      },
    },
    volumes: { appfinanzas_postgres_dev_data: {} },
  });

  const plan = createResetPlan({ context: resetContext(), render: () => rendered, inspectTarget: () => verifiedTarget });
  assert.equal(plan.target.containerId, "container-id");
});

test("reset planning classifies Docker inspection failures as pre-mutation rejections", () => {
  assert.throws(
    () => createResetPlan({ context: resetContext(), render: renderedDevService, inspectTarget: () => { throw new Error("Docker unavailable"); } }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED" && error.phase === "pre-mutation",
  );
});

test("project lock prevents a second local reset from entering the mutation boundary", () => {
  const cwd = mkdtempSync(join(tmpdir(), "appfinanzas-reset-lock-"));
  const release = acquireProjectLock(cwd);
  try {
    assert.throws(() => acquireProjectLock(cwd), /exclusive reset lock/);
  } finally {
    release();
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("reset workflow recreates only the verified target, marks it, migrates, and proves an empty usable database", () => {
  const calls = [];
  const plan = createResetPlan({ context: resetContext(), render: renderedDevService, inspectTarget: () => verifiedTarget });
  const dependencies = {
    sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
    render: renderedDevService,
    inspectTarget: () => verifiedTarget,
    acquireLock: () => () => calls.push("unlock"),
    removeContainer: (id) => calls.push(["container", id]),
    inspectVolume: (() => { let count = 0; return () => ({ volume: verifiedVolume, consumers: count++ ? [] : ["container-id"], mount: "/var/lib/postgresql/data" }); })(),
    removeVolume: (name, args) => calls.push(["volume", name, args]),
    recreate: (context) => calls.push(["recreate", context.service]),
    verifyHealth: (context) => calls.push(["health", context.service]),
    readSystemIdentifier: () => "recreated-system-id",
    executeSql: (sql) => calls.push(["sql", sql]),
    migrate: (profile) => calls.push(["migrate", profile]),
    verifyEmpty: (database) => calls.push(["empty", database]),
    verifyUsable: (database) => calls.push(["usable", database]),
  };

  const result = runResetWorkflow({ plan, ...dependencies });
  assert.equal(result.phase, "complete");
  assert.deepEqual(calls, [
    ["container", "container-id"], ["volume", verifiedVolume.Name, []],
    ["recreate", "postgres-dev"], ["health", "postgres-dev"],
    ["sql", "ALTER DATABASE appfinanzas_dev SET appfinanzas.reset_profile = 'dev:recreated-system-id'"],
    ["migrate", "dev"], ["empty", "appfinanzas_dev"], ["usable", "appfinanzas_dev"], "unlock",
  ]);
  assert.equal(calls.some((call) => Array.isArray(call) && call[0] === "seed"), false);
});

test("reset workflow reports recreation failures as post-mutation operational failures", () => {
  const plan = createResetPlan({ context: resetContext(), render: renderedDevService, inspectTarget: () => verifiedTarget });
  const dependencies = {
    sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" }, render: renderedDevService, inspectTarget: () => verifiedTarget,
    acquireLock: () => () => {}, removeContainer: () => {},
    inspectVolume: (() => { let count = 0; return () => ({ volume: verifiedVolume, consumers: count++ ? [] : ["container-id"], mount: "/var/lib/postgresql/data" }); })(),
    removeVolume: () => {}, recreate: () => { throw new Error("Docker unavailable"); },
  };
  assert.throws(
    () => runResetWorkflow({ plan, ...dependencies }),
    (error) => error instanceof ResetFailure && error.code === "OPERATIONAL_FAILED" && error.phase === "post-mutation",
  );
});
