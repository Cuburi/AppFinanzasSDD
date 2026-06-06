import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const profiles = {
  dev: {
    databasePath: '/appfinanzas_dev',
    port: '5433',
    activationCommand: 'pnpm env:dev',
  },
  personal: {
    databasePath: '/appfinanzas_personal',
    port: '5434',
    activationCommand: 'pnpm env:personal',
  },
};

const allowedDatabaseHosts = new Set(['localhost', '127.0.0.1']);

const [profileName, separator, ...prismaArgs] = process.argv.slice(2);
const profile = profiles[profileName];

const readDatabaseUrl = (envContent) => {
  for (const rawLine of envContent.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^DATABASE_URL=(?<quote>["']?)(?<value>.+?)\k<quote>\s*$/);
    if (match?.groups?.value) {
      return match.groups.value;
    }
  }

  return undefined;
};

const parseDatabaseUrl = (databaseUrl) => {
  try {
    return new URL(databaseUrl);
  } catch {
    return undefined;
  }
};

const validateDatabaseUrlForProfile = (databaseUrl, profileConfig, requestedProfileName) => {
  const parsedDatabaseUrl = parseDatabaseUrl(databaseUrl);

  if (!parsedDatabaseUrl) {
    return 'active root .env has a malformed DATABASE_URL.';
  }

  if (!allowedDatabaseHosts.has(parsedDatabaseUrl.hostname)) {
    return 'active root .env DATABASE_URL must target a local database; allowed hosts are localhost and 127.0.0.1.';
  }

  if (parsedDatabaseUrl.port !== profileConfig.port) {
    return `active root .env DATABASE_URL must use port ${profileConfig.port} for the requested ${requestedProfileName} profile.`;
  }

  if (parsedDatabaseUrl.pathname !== profileConfig.databasePath) {
    return `active root .env DATABASE_URL must use database ${profileConfig.databasePath} for the requested ${requestedProfileName} profile.`;
  }

  return undefined;
};

if (!profile || separator !== '--' || prismaArgs.length === 0) {
  console.error('Usage: node scripts/run-prisma-with-profile.mjs <dev|personal> -- <prisma args...>');
  process.exit(1);
}

const rootEnvPath = process.env.APPFINANZAS_ENV_PATH
  ? process.env.APPFINANZAS_ENV_PATH
  : fileURLToPath(new URL('../.env', import.meta.url));

let rootEnv;

try {
  rootEnv = readFileSync(rootEnvPath, 'utf8');
} catch (error) {
  console.error(
    `Refusing to run Prisma: active root .env was not found. Run \`${profile.activationCommand}\` first.`,
  );
  process.exit(1);
}

const databaseUrl = readDatabaseUrl(rootEnv);

if (!databaseUrl) {
  console.error(`Refusing to run Prisma: active root .env is missing DATABASE_URL. Run \`${profile.activationCommand}\` first.`);
  process.exit(1);
}

const profileValidationError = validateDatabaseUrlForProfile(databaseUrl, profile, profileName);

if (profileValidationError) {
  console.error(
    `Refusing to run Prisma: ${profileValidationError} Run \`${profile.activationCommand}\` first.`,
  );
  process.exit(1);
}

if (process.env.PRISMA_PROFILE_GUARD_DRY_RUN === '1') {
  console.log(`profile=${profileName}`);
  console.log(`env=${rootEnvPath}`);
  console.log(`DATABASE_URL=${databaseUrl}`);
  console.log(`prisma ${prismaArgs.join(' ')}`);
  process.exit(0);
}

const prismaBinary = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(prismaBinary, ['exec', 'prisma', ...prismaArgs], {
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Failed to execute Prisma through ${prismaBinary}: ${result.error.message}`);
}

process.exit(result.status ?? 1);
