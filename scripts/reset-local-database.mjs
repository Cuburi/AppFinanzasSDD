import { createHash } from "node:crypto";

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

const assertAllowedComposeEnvironment = (policy, environment) => {
  for (const [key, value] of Object.entries(environment)) {
    if (!key.startsWith("COMPOSE_") || value === undefined) continue;
    throw new ResetFailure("PREFLIGHT_REJECTED", `Compose environment variable is not allowed: ${key}`);
  }
  return {};
};

export const createInvocationContext = ({ policyName, cwd, sourceHashes, environment = {} }) => {
  const policy = RESET_POLICIES[policyName];
  if (!policy) throw new ResetFailure("PREFLIGHT_REJECTED", `Unknown reset profile: ${policyName}`);
  const composeEnv = assertAllowedComposeEnvironment(policy, environment);
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

const assertRenderedTarget = (context, config) => {
  const service = config.services?.[context.service];
  const environment = service?.environment ?? {};
  const database = Array.isArray(environment)
    ? environment.find((entry) => entry.startsWith("POSTGRES_DB="))?.split("=").at(-1)
    : environment.POSTGRES_DB;
  rejectPreflight(service, "Rendered Compose configuration does not contain the target service.");
  rejectPreflight(service.container_name === `appfinanzas-${context.service}`, "Rendered target container name does not match the saved policy.");
  rejectPreflight(database === context.database, "Rendered target database does not match the saved policy.");
  rejectPreflight(service.ports?.includes(`${context.port}:5432`), "Rendered target port does not match the saved policy.");
  rejectPreflight(service.volumes?.includes(`${context.logicalVolume}:/var/lib/postgresql/data`), "Rendered target data mount does not match the saved policy.");
  rejectPreflight(Object.hasOwn(config.volumes ?? {}, context.logicalVolume), "Rendered target volume declaration does not match the saved policy.");
  rejectPreflight(canonicalJson(service.profiles ?? []) === canonicalJson(context.composeProfiles), "Rendered target profiles do not match the saved policy.");
};

const inspectVerifiedTarget = (context, target) => {
  const mount = target.mounts?.filter(({ Destination, RW }) => Destination === "/var/lib/postgresql/data" && RW);
  rejectPreflight(target.id && target.name === `appfinanzas-${context.service}`, "Target container identity does not match the saved policy.");
  rejectPreflight(target.labels?.["com.docker.compose.project"] === context.projectName, "Target Compose project label does not match.");
  rejectPreflight(target.labels?.["com.docker.compose.service"] === context.service, "Target Compose service label does not match.");
  rejectPreflight(target.port === context.port && target.database === context.database, "Target port or database does not match the saved policy.");
  rejectPreflight(mount?.length === 1 && mount[0].Name === runtimeVolumeName(context), "Target must have exactly one expected writable PostgreSQL data mount.");
  rejectPreflight(isWithinPath(target.dataDirectory, mount[0].Destination), "SQL data directory is not inside the proven data mount.");
  rejectPreflight(target.systemIdentifier && target.marker === `${RESET_POLICIES[context.applicationProfile].marker}:${target.systemIdentifier}`, "Target cluster marker is missing or mismatched.");
  rejectPreflight(target.volume?.Name === mount[0].Name, "Target volume metadata does not match the proven data mount.");
  rejectPreflight(target.consumers?.length === 1 && target.consumers[0] === target.id, "Target volume must have exactly one consumer before mutation.");
  const fingerprint = volumeFingerprint({ volume: target.volume, containerId: target.id, mount: mount[0].Destination });
  return Object.freeze({
    containerId: target.id,
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
    }),
  });
};

export const createResetPlan = ({ context, render, inspectTarget }) => {
  const json = render();
  let config;
  try { config = JSON.parse(json); } catch { throw new ResetFailure("PREFLIGHT_REJECTED", "Rendered Compose configuration is not valid JSON."); }
  assertRenderedTarget(context, config);
  const target = inspectVerifiedTarget(context, inspectTarget());
  return Object.freeze({
    context,
    sourceHashes: Object.freeze(Object.fromEntries([...context.composeFiles, context.envFile].map(({ path, sha256: hash }) => [path.split(/[\\/]/).at(-1), hash]))),
    renderedConfig: Object.freeze({ json, sha256: sha256(canonicalJson(config)) }),
    target,
  });
};

export const verifyStablePlan = ({ plan, sourceHashes, render, inspectTarget }) => {
  const expectedHashes = plan.sourceHashes;
  const unchangedSources = Object.entries(expectedHashes).every(([path, hash]) => sourceHashes[path] === hash);
  const currentJson = render();
  let currentConfig;
  try { currentConfig = JSON.parse(currentJson); } catch { currentConfig = null; }
  const unchangedConfig = currentConfig && sha256(canonicalJson(currentConfig)) === plan.renderedConfig.sha256;
  if (!unchangedSources || !unchangedConfig) throw new ResetFailure("PLAN_DRIFT", "Compose source or rendered configuration changed after preflight.");
  const target = inspectVerifiedTarget(plan.context, inspectTarget());
  if (target.containerId !== plan.target.containerId || target.volume.name !== plan.target.volume.name || target.volume.fingerprint !== plan.target.volume.fingerprint || canonicalJson(target.proof) !== canonicalJson(plan.target.proof)) {
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

export const removeVerifiedTarget = ({ plan, acquireLock, removeContainer, inspectVolume, removeVolume }) => {
  let release;
  try {
    release = acquireLock();
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
