import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RESET_POLICIES,
  ResetFailure,
  buildComposeCommand,
  createResetPlan,
  createInvocationContext,
  removeVerifiedTarget,
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

test("public reset wrappers fail closed until the reset engine is wired", () => {
  const dev = spawnSync(process.execPath, [devResetPath], { encoding: "utf8" });
  const personal = spawnSync(process.execPath, [
    personalResetPath,
    "--confirm", "RESET_APPFINANZAS_PERSONAL",
    "--profile", "appfinanzas_personal",
  ], { encoding: "utf8" });

  for (const result of [dev, personal]) {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /reset engine is not wired.*No database mutation was performed\./i);
  }
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

const verifiedVolume = {
  Name: "repo_appfinanzas_postgres_dev_data",
  Driver: "local",
  Scope: "local",
  Options: {},
  Labels: { "com.docker.compose.project": "repo", "com.docker.compose.volume": "appfinanzas_postgres_dev_data" },
  CreatedAt: "2026-08-10T00:00:00Z",
  Mountpoint: "/var/lib/docker/volumes/repo_appfinanzas_postgres_dev_data/_data",
};

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
