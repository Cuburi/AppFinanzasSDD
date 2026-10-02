import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const failurePhases = Object.freeze({
  CONFIRMATION_REJECTED: "pre-mutation",
  PREFLIGHT_REJECTED: "pre-mutation",
  PLAN_DRIFT: "pre-mutation",
  MUTATION_FAILED: "post-mutation",
  OPERATIONAL_FAILED: "post-mutation",
});

const freezePolicy = (policy) => Object.freeze({
  ...policy,
  files: Object.freeze([...policy.files]),
  composeProfiles: Object.freeze([...policy.composeProfiles]),
  ...(policy.confirmation ? { confirmation: Object.freeze([...policy.confirmation]) } : {}),
});

export const RESET_POLICIES = Object.freeze({
  dev: freezePolicy({
    files: ["docker-compose.yml"],
    applicationProfile: "dev",
    composeProfiles: [],
    envFile: ".env",
    service: "postgres-dev",
    database: "appfinanzas_dev",
    port: "5433",
    logicalVolume: "appfinanzas_postgres_dev_data",
    marker: "dev",
  }),
  personal: freezePolicy({
    files: ["docker-compose.yml"],
    applicationProfile: "personal",
    composeProfiles: [],
    envFile: ".env",
    service: "postgres-personal",
    database: "appfinanzas_personal",
    port: "5434",
    logicalVolume: "appfinanzas_postgres_personal_data",
    marker: "personal",
    confirmation: ["RESET_APPFINANZAS_PERSONAL", "appfinanzas_personal"],
  }),
});

export class ResetFailure extends Error {
  constructor(code, message) {
    if (!failurePhases[code]) throw new Error(`Unknown reset failure code: ${code}`);
    super(message);
    this.name = "ResetFailure";
    this.code = code;
    this.phase = failurePhases[code];
  }
}

const absolutePath = (cwd, relativePath) => `${cwd.replace(/[\\/]$/, "")}/${relativePath}`;
const composeProjectName = (cwd) => cwd.replace(/[\\/]$/, "").split(/[\\/]/).at(-1).toLowerCase();

const assertAllowedComposeEnvironment = (environment) => {
  for (const [key, value] of Object.entries(environment)) {
    if (!key.startsWith("COMPOSE_") || value === undefined) continue;
    throw new ResetFailure("PREFLIGHT_REJECTED", `Compose environment variable is not allowed: ${key}`);
  }
  return {};
};

export const createInvocationContext = ({ policyName, cwd, sourceHashes, environment = {} }) => {
  const policy = RESET_POLICIES[policyName];
  if (!policy) throw new ResetFailure("PREFLIGHT_REJECTED", `Unknown reset profile: ${policyName}`);
  const composeEnv = assertAllowedComposeEnvironment(environment);
  const composeFiles = policy.files.map((file) => ({
    path: absolutePath(cwd, file),
    sha256: sourceHashes[file],
  }));
  const envFile = { path: absolutePath(cwd, policy.envFile), sha256: sourceHashes[policy.envFile] };
  if ([...composeFiles, envFile].some(({ sha256 }) => !sha256)) {
    throw new ResetFailure("PREFLIGHT_REJECTED", "Invocation context requires source hashes.");
  }
  return Object.freeze({
    cwd,
    projectName: composeProjectName(cwd),
    composeFiles: Object.freeze(composeFiles.map(Object.freeze)),
    applicationProfile: policy.applicationProfile,
    composeProfiles: policy.composeProfiles,
    envFile: Object.freeze(envFile),
    composeEnv: Object.freeze(composeEnv),
    service: policy.service,
    database: policy.database,
    port: policy.port,
    logicalVolume: policy.logicalVolume,
    renderedConfig: null,
  });
};

export const buildComposeCommand = (context, commandArgs) => [
  "docker",
  [
    "compose",
    "--project-name", context.projectName,
    "--project-directory", context.cwd,
    ...context.composeFiles.flatMap(({ path }) => ["--file", path]),
    "--env-file", context.envFile.path,
    ...context.composeProfiles.flatMap((profile) => ["--profile", profile]),
    ...commandArgs,
  ],
  context.composeEnv,
];

export const buildSnapshotComposeCommand = (context, snapshotPath, commandArgs) => ["docker", ["compose", "--project-name", context.projectName, "--project-directory", context.cwd, "--file", snapshotPath, ...commandArgs], context.composeEnv];
export const buildContainerRemovalCommands = (containerId) => [["stop", containerId], ["rm", containerId]];

export const assertActiveProfile = (policyName, environmentFile) => {
  const policy = RESET_POLICIES[policyName];
  const databaseUrl = environmentFile.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1];
  let parsed;
  try { parsed = new URL(databaseUrl); } catch { throw new ResetFailure("PREFLIGHT_REJECTED", "Root .env must define the requested local database profile."); }
  if (!policy || parsed.hostname !== "localhost" || parsed.port !== policy.port || parsed.pathname !== `/${policy.database}`) {
    throw new ResetFailure("PREFLIGHT_REJECTED", "Root .env does not select the requested reset profile.");
  }
  return policyName;
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));

const rejectPreflight = (condition, message) => {
  if (!condition) throw new ResetFailure("PREFLIGHT_REJECTED", message);
};

const runtimeVolumeName = (context) => `${context.projectName}_${context.logicalVolume}`;
const isWithinPath = (path, parent) => path === parent || path?.startsWith(`${parent}/`);
const hasPublishedPort = (ports, port) => ports?.some((entry) => entry === `${port}:5432`
  || (entry?.published === port && String(entry.target) === "5432"));
const hasDataMount = (volumes, volume) => volumes?.some((entry) => entry === `${volume}:/var/lib/postgresql/data`
  || (entry?.type === "volume" && entry.source === volume && entry.target === "/var/lib/postgresql/data"));

const assertRenderedTarget = (context, config) => {
  const service = config.services?.[context.service];
  const environment = service?.environment ?? {};
  const database = Array.isArray(environment)
    ? environment.find((entry) => entry.startsWith("POSTGRES_DB="))?.split("=").at(-1)
    : environment.POSTGRES_DB;
  rejectPreflight(service, "Rendered Compose configuration does not contain the target service.");
  rejectPreflight(service.container_name === `appfinanzas-${context.service}`, "Rendered target container name does not match the saved policy.");
  rejectPreflight(database === context.database, "Rendered target database does not match the saved policy.");
  rejectPreflight(hasPublishedPort(service.ports, context.port), "Rendered target port does not match the saved policy.");
  rejectPreflight(hasDataMount(service.volumes, context.logicalVolume), "Rendered target data mount does not match the saved policy.");
  rejectPreflight(Object.hasOwn(config.volumes ?? {}, context.logicalVolume), "Rendered target volume declaration does not match the saved policy.");
  rejectPreflight(canonicalJson(service.profiles ?? []) === canonicalJson(context.composeProfiles), "Rendered target profiles do not match the saved policy.");
};

const allowsDevRecovery = (context) => context.applicationProfile === "dev";
const allowsUnmarkedExistingTarget = (context) => context.applicationProfile === "dev" || context.applicationProfile === "personal";

const assertExpectedVolumeMetadata = (context, volume) => {
  rejectPreflight(volume?.Name === runtimeVolumeName(context), "Target volume metadata does not match the proven data mount.");
  rejectPreflight(volume.Labels?.["com.docker.compose.project"] === context.projectName, "Target volume Compose project label does not match.");
  rejectPreflight(volume.Labels?.["com.docker.compose.volume"] === context.logicalVolume, "Target volume Compose volume label does not match.");
};

const inspectVerifiedTarget = (context, target) => {
  const mount = target.mounts?.filter(({ Destination, RW }) => Destination === "/var/lib/postgresql/data" && RW);
  rejectPreflight(target.id && target.name === `appfinanzas-${context.service}`, "Target container identity does not match the saved policy.");
  rejectPreflight(target.labels?.["com.docker.compose.project"] === context.projectName, "Target Compose project label does not match.");
  rejectPreflight(target.labels?.["com.docker.compose.service"] === context.service, "Target Compose service label does not match.");
  rejectPreflight(target.port === context.port && target.database === context.database, "Target port or database does not match the saved policy.");
  rejectPreflight(mount?.length === 1 && mount[0].Name === runtimeVolumeName(context), "Target must have exactly one expected writable PostgreSQL data mount.");
  if (target.dataDirectory) rejectPreflight(isWithinPath(target.dataDirectory, mount[0].Destination), "SQL data directory is not inside the proven data mount.");
  assertExpectedVolumeMetadata(context, target.volume);
  rejectPreflight(target.volume?.Name === mount[0].Name, "Target volume metadata does not match the proven data mount.");
  rejectPreflight(target.consumers?.length === 1 && target.consumers[0] === target.id, "Target volume must have exactly one consumer before mutation.");

  const expectedMarker = target.systemIdentifier ? `${RESET_POLICIES[context.applicationProfile].marker}:${target.systemIdentifier}` : null;
  let recoveryMode = "marked";
  if (target.marker === expectedMarker && expectedMarker) {
    recoveryMode = "marked";
  } else if (allowsUnmarkedExistingTarget(context) && (target.marker === null || target.marker === "" || target.marker === undefined)) {
    recoveryMode = context.applicationProfile === "personal" ? "unmarked-personal-target" : "unmarked-dev-target";
  } else {
    throw new ResetFailure("PREFLIGHT_REJECTED", "Target cluster marker is missing or mismatched.");
  }

  const fingerprint = volumeFingerprint({ volume: target.volume, containerId: target.id, mount: mount[0].Destination });
  return Object.freeze({
    containerId: target.id,
    recoveryMode,
    volume: Object.freeze({ name: mount[0].Name, fingerprint }),
    proof: Object.freeze({
      name: target.name,
      labels: target.labels,
      mount: mount[0],
      port: target.port,
      database: target.database,
      marker: target.marker,
      systemIdentifier: target.systemIdentifier,
      dataDirectory: target.dataDirectory,
      volume: target.volume,
      consumers: target.consumers,
      recoveryMode,
    }),
  });
};

const inspectVerifiedBootstrapTarget = (context, target) => {
  rejectPreflight(allowsDevRecovery(context), "Only dev reset may bootstrap a missing target.");
  rejectPreflight(target?.absent === true, "Target discovery did not prove an absent dev target.");
  rejectPreflight(!target.volume, "Dev bootstrap requires no known target volume.");
  rejectPreflight((target.consumers ?? []).length === 0, "Dev bootstrap target volume must have no consumers.");
  return Object.freeze({ recoveryMode: "missing-dev-target", proof: Object.freeze({ absent: true, volume: null, consumers: [] }) });
};

const inspectVerifiedPlanTarget = (context, target) => target?.absent === true
  ? inspectVerifiedBootstrapTarget(context, target)
  : inspectVerifiedTarget(context, target);

export const createResetPlan = ({ context, render, inspectTarget }) => {
  try {
    const json = render();
    let config;
    try { config = JSON.parse(json); } catch { throw new ResetFailure("PREFLIGHT_REJECTED", "Rendered Compose configuration is not valid JSON."); }
    assertRenderedTarget(context, config);
    const target = inspectVerifiedPlanTarget(context, inspectTarget());
    return Object.freeze({
      context,
      sourceHashes: Object.freeze(Object.fromEntries([...context.composeFiles, context.envFile].map(({ path, sha256: hash }) => [path.split(/[\\/]/).at(-1), hash]))),
      renderedConfig: Object.freeze({ json, sha256: sha256(canonicalJson(config)) }),
      target,
    });
  } catch (error) {
    if (error instanceof ResetFailure) throw error;
    throw new ResetFailure("PREFLIGHT_REJECTED", `Target discovery failed: ${error.message}`);
  }
};

export const verifyStablePlan = ({ plan, sourceHashes, render, inspectTarget }) => {
  const expectedHashes = plan.sourceHashes;
  const unchangedSources = Object.entries(expectedHashes).every(([path, hash]) => sourceHashes[path] === hash);
  const currentJson = render();
  let currentConfig;
  try { currentConfig = JSON.parse(currentJson); } catch { currentConfig = null; }
  const unchangedConfig = currentConfig && sha256(canonicalJson(currentConfig)) === plan.renderedConfig.sha256;
  if (!unchangedSources || !unchangedConfig) throw new ResetFailure("PLAN_DRIFT", "Compose source or rendered configuration changed after preflight.");
  const target = inspectVerifiedPlanTarget(plan.context, inspectTarget());
  if (canonicalJson(target) !== canonicalJson(plan.target)) {
    throw new ResetFailure("PLAN_DRIFT", "Target identity changed after preflight.");
  }
  return plan;
};

export const volumeFingerprint = ({ volume, containerId, mount }) => sha256(canonicalJson({
  name: volume.Name,
  driver: volume.Driver,
  scope: volume.Scope,
  options: volume.Options ?? {},
  labels: volume.Labels ?? {},
  createdAt: volume.CreatedAt,
  mountpoint: volume.Mountpoint,
  containerId,
  mount,
}));

export const removeVerifiedTarget = ({ plan, acquireLock, removeContainer, inspectVolume, removeVolume, alreadyLocked = false }) => {
  let release;
  try {
    if (!alreadyLocked) release = acquireLock();
    const beforeRemoval = inspectVolume(plan.target.volume.name);
    const beforeFingerprint = volumeFingerprint({
      volume: beforeRemoval.volume,
      containerId: plan.target.containerId,
      mount: beforeRemoval.mount,
    });
    if (beforeFingerprint !== plan.target.volume.fingerprint || beforeRemoval.consumers.length !== 1 || beforeRemoval.consumers[0] !== plan.target.containerId) {
      throw new Error("Target volume changed or is not solely owned before container removal.");
    }
    removeContainer(plan.target.containerId);
    const current = inspectVolume(plan.target.volume.name);
    const currentFingerprint = volumeFingerprint({
      volume: current.volume,
      containerId: plan.target.containerId,
      mount: current.mount,
    });
    if (currentFingerprint !== plan.target.volume.fingerprint || current.consumers.length !== 0) {
      throw new Error("Target volume changed or remains attached after container removal.");
    }
    removeVolume(plan.target.volume.name, []);
  } catch (error) {
    if (error instanceof ResetFailure) throw error;
    throw new ResetFailure("MUTATION_FAILED", `Guarded target removal failed: ${error.message}`);
  } finally {
    if (release) release();
  }
};

export const runResetWorkflow = ({
  plan, sourceHashes, render, inspectTarget, acquireLock, removeContainer, inspectVolume, removeVolume,
  recreate, verifyHealth, readSystemIdentifier, executeSql, migrate, verifyEmpty, verifyUsable,
}) => {
  let release;
  try {
    verifyStablePlan({ plan, sourceHashes, render, inspectTarget });
    release = acquireLock();
    if (plan.target.containerId) {
      removeVerifiedTarget({ plan, acquireLock, removeContainer, inspectVolume, removeVolume, alreadyLocked: true });
    } else {
      verifyStablePlan({ plan, sourceHashes, render, inspectTarget });
    }
    recreate(plan.context);
    verifyHealth(plan.context);
    const systemIdentifier = readSystemIdentifier();
    executeSql(`ALTER DATABASE ${plan.context.database} SET appfinanzas.reset_profile = '${RESET_POLICIES[plan.context.applicationProfile].marker}:${systemIdentifier}'`);
    migrate(plan.context.applicationProfile);
    verifyEmpty(plan.context.database);
    verifyUsable(plan.context.database);
    return Object.freeze({ phase: "complete", profile: plan.context.applicationProfile });
  } catch (error) {
    if (error instanceof ResetFailure) throw error;
    throw new ResetFailure("OPERATIONAL_FAILED", `Reset did not complete after mutation: ${error.message}`);
  } finally {
    if (release) release();
  }
};

const commandOutput = (command, args, options = {}) => execFileSync(command, args, {
  cwd: options.cwd,
  shell: options.shell,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    ...(process.platform === "win32" ? {
      ComSpec: process.env.ComSpec,
      PATHEXT: process.env.PATHEXT,
      ProgramFiles: process.env.ProgramFiles,
      SystemRoot: process.env.SystemRoot,
      WINDIR: process.env.WINDIR,
    } : {}),
    ...options.environment,
  },
  stdio: ["ignore", "pipe", "pipe"],
}).trim();

const tryCommandOutput = (command, args, options = {}) => {
  try { return commandOutput(command, args, options); } catch { return null; }
};

export const buildSqlCommand = (containerId, database, query) => ["docker", ["exec", containerId, "psql", "-U", "postgres", "-d", database, "-q", "-tAc", query]];
export const buildMigrationCommand = (profile) => ["node", ["scripts/run-prisma-with-profile.mjs", profile, "--", "migrate", "deploy", "--schema", "prisma/schema.prisma"], { shell: false }];
export const systemIdentifierQuery = () => "SELECT (pg_control_system()).system_identifier";
export const applicationTableQuery = () => "SELECT coalesce(json_agg(format('%I.%I', table_schema, table_name)), '[]') FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT IN ('_prisma_migrations', 'MonthlyLedgerBackfillControl')";

export const parseComposePs = (output) => {
  const trimmed = output.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  }
};

export const acquireProjectLock = (cwd) => {
  const path = absolutePath(cwd, ".appfinanzas-reset.lock");
  let descriptor;
  try { descriptor = openSync(path, "wx"); } catch { throw new Error("An exclusive reset lock is already held for this Compose project."); }
  return () => { closeSync(descriptor); unlinkSync(path); };
};

export const executeLocalReset = async (policyName) => {
  const policy = RESET_POLICIES[policyName];
  if (!policy) throw new ResetFailure("PREFLIGHT_REJECTED", `Unknown reset profile: ${policyName}`);
  assertAllowedComposeEnvironment(process.env);
  const cwd = process.cwd();
  const sourceHashes = Object.fromEntries([...policy.files, policy.envFile].map((file) => [file, sha256(readFileSync(absolutePath(cwd, file)))]));
  const context = createInvocationContext({ policyName, cwd, sourceHashes, environment: process.env });
  assertActiveProfile(policyName, readFileSync(absolutePath(cwd, policy.envFile), "utf8"));
  const compose = (args) => {
    const [command, commandArgs, environment] = buildComposeCommand(context, args);
    return commandOutput(command, commandArgs, { cwd, environment });
  };
  const render = () => compose(["config", "--format", "json"]);
  const targetRecord = () => {
    const targets = parseComposePs(compose(["ps", "--all", "--format", "json", context.service]));
    if (!Array.isArray(targets) || targets.length > 1) throw new Error("Expected at most one target container.");
    if (targets.length === 0 || !targets[0].ID) return null;
    return targets[0];
  };
  const targetId = () => {
    const target = targetRecord();
    if (!target) throw new Error("Expected exactly one target container.");
    return target.ID;
  };
  const sql = (containerId, query) => {
    const [command, args] = buildSqlCommand(containerId, context.database, query);
    return commandOutput(command, args, { cwd });
  };
  const containerDatabase = (container) => container.Config.Env?.find((entry) => entry.startsWith("POSTGRES_DB="))?.split("=").at(-1);
  const containerHostPort = (container) => container.NetworkSettings.Ports?.["5432/tcp"]?.[0]?.HostPort
    ?? container.HostConfig.PortBindings?.["5432/tcp"]?.[0]?.HostPort;
  const inspectMissingTarget = () => {
    const volumeName = runtimeVolumeName(context);
    const output = tryCommandOutput("docker", ["volume", "inspect", volumeName], { cwd });
    if (!output) return { absent: true, volume: null, consumers: [] };
    const volume = JSON.parse(output)[0];
    const consumers = commandOutput("docker", ["ps", "-a", "--filter", `volume=${volumeName}`, "--format", "{{.ID}}"], { cwd }).split(/\r?\n/).filter(Boolean);
    return { absent: true, volume, consumers };
  };
  const inspectTarget = () => {
    const record = targetRecord();
    if (!record) return inspectMissingTarget();
    const id = record.ID;
    const container = JSON.parse(commandOutput("docker", ["inspect", id], { cwd }))[0];
    const mount = container.Mounts.find(({ Destination, RW }) => Destination === "/var/lib/postgresql/data" && RW);
    const volume = JSON.parse(commandOutput("docker", ["volume", "inspect", mount.Name], { cwd }))[0];
    const consumers = commandOutput("docker", ["ps", "-a", "--filter", `volume=${mount.Name}`, "--format", "{{.ID}}"], { cwd }).split(/\r?\n/).filter(Boolean);
    const canReadSql = container.State?.Running === true;
    const systemIdentifier = canReadSql ? sql(id, systemIdentifierQuery()) : null;
    return {
      id, name: container.Name?.replace(/^\//, ""), labels: container.Config.Labels, mounts: container.Mounts,
      port: containerHostPort(container), database: canReadSql ? sql(id, "SELECT current_database()") : containerDatabase(container),
      marker: canReadSql ? sql(id, "SELECT current_setting('appfinanzas.reset_profile', true)") : null,
      systemIdentifier, dataDirectory: canReadSql ? sql(id, "SHOW data_directory") : undefined, volume, consumers,
    };
  };
  const inspectVolume = (name) => {
    const volume = JSON.parse(commandOutput("docker", ["volume", "inspect", name], { cwd }))[0];
    const consumers = commandOutput("docker", ["ps", "-a", "--filter", `volume=${name}`, "--format", "{{.ID}}"], { cwd }).split(/\r?\n/).filter(Boolean);
    return { volume, consumers, mount: "/var/lib/postgresql/data" };
  };
  const plan = createResetPlan({ context, render, inspectTarget });
  const snapshotDirectory = mkdtempSync(join(tmpdir(), "appfinanzas-reset-"));
  const snapshotPath = join(snapshotDirectory, "compose.json");
  writeFileSync(snapshotPath, plan.renderedConfig.json, { encoding: "utf8", mode: 0o600 });
  let recreatedId;
  try {
    return runResetWorkflow({
      plan, sourceHashes, render, inspectTarget,
      acquireLock: () => acquireProjectLock(cwd),
      removeContainer: (id) => buildContainerRemovalCommands(id).forEach((args) => commandOutput("docker", args, { cwd })),
      inspectVolume, removeVolume: (name, args) => commandOutput("docker", ["volume", "rm", ...args, name], { cwd }),
      recreate: () => {
        const [command, args, environment] = buildSnapshotComposeCommand(context, snapshotPath, ["up", "--wait", "-d", context.service]);
        commandOutput(command, args, { cwd, environment });
        recreatedId = targetId();
      },
    verifyHealth: () => {
      const state = JSON.parse(commandOutput("docker", ["inspect", recreatedId], { cwd }))[0].State;
      if (state.Status !== "running" || state.Health?.Status !== "healthy") throw new Error("Recreated PostgreSQL container is not healthy.");
    },
    readSystemIdentifier: () => sql(recreatedId, systemIdentifierQuery()),
    executeSql: (query) => sql(recreatedId, query),
     migrate: (profile) => {
       const [command, args, options] = buildMigrationCommand(profile);
       return commandOutput(command, args, { cwd, ...options });
     },
    verifyEmpty: () => {
       const tables = JSON.parse(sql(recreatedId, applicationTableQuery()));
      if (tables.some((table) => sql(recreatedId, `SELECT count(*) FROM ${table}`) !== "0")) throw new Error("Application tables are not empty.");
    },
      verifyUsable: () => {
      if (sql(recreatedId, "BEGIN; CREATE TEMP TABLE reset_probe (id int); INSERT INTO reset_probe VALUES (1); SELECT id FROM reset_probe; ROLLBACK") !== "1") throw new Error("Database write/read probe failed.");
      },
    });
  } finally {
    rmSync(snapshotDirectory, { recursive: true, force: true });
  }
};

const validateExactArguments = (args, expected, message) => {
  if (args.length !== expected.length || args.some((value, index) => value !== expected[index])) {
    throw new ResetFailure("CONFIRMATION_REJECTED", message);
  }
};

export const validatePersonalConfirmation = (args) => {
  const [token, database] = RESET_POLICIES.personal.confirmation;
  validateExactArguments(
    args,
    ["--confirm", token, "--profile", database],
    "Personal reset requires the exact dual confirmation arguments.",
  );
  return Object.freeze({ profile: "personal" });
};

export const validateDevInvocation = (args) => {
  validateExactArguments(args, [], "Dev reset does not accept override arguments.");
  return Object.freeze({ profile: "dev" });
};
