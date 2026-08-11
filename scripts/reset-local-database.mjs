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
