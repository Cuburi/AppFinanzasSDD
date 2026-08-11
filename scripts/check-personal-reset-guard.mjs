import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const guardScript = fileURLToPath(new URL('./guard-personal-reset.mjs', import.meta.url));
const prismaProfileScript = fileURLToPath(new URL('./run-prisma-with-profile.mjs', import.meta.url));
const pnpmBinary = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const tempDir = mkdtempSync(join(tmpdir(), 'appfinanzas-prisma-profile-'));
const tempDevEnvPath = join(tempDir, '.env.dev');
const tempPersonalEnvPath = join(tempDir, '.env.personal');
const tempRemoteDevEnvPath = join(tempDir, '.env.remote-dev');
const tempRemotePersonalEnvPath = join(tempDir, '.env.remote-personal');
const tempMalformedEnvPath = join(tempDir, '.env.malformed');
const customizedDevDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5433/appfinanzas_dev?schema=public';
const personalDatabaseUrl = 'postgresql://postgres:postgres@localhost:5434/appfinanzas_personal?schema=public';
const remoteDevDatabaseUrl = 'postgresql://postgres:postgres@db.internal:5433/appfinanzas_dev?schema=public';
const remotePersonalDatabaseUrl = 'postgresql://postgres:postgres@db.internal:5434/appfinanzas_personal?schema=public';

writeFileSync(tempDevEnvPath, `DATABASE_URL="${customizedDevDatabaseUrl}"\nPORT="3001"\n`);
writeFileSync(tempPersonalEnvPath, `DATABASE_URL="${personalDatabaseUrl}"\nPORT="3001"\n`);
writeFileSync(tempRemoteDevEnvPath, `DATABASE_URL="${remoteDevDatabaseUrl}"\nPORT="3001"\n`);
writeFileSync(tempRemotePersonalEnvPath, `DATABASE_URL="${remotePersonalDatabaseUrl}"\nPORT="3001"\n`);
writeFileSync(tempMalformedEnvPath, 'DATABASE_URL="not a database url"\nPORT="3001"\n');

const personalActiveRootEnv = {
  ...process.env,
  APPFINANZAS_ENV_PATH: tempPersonalEnvPath,
  PRISMA_PROFILE_GUARD_DRY_RUN: '1',
};

const devActiveRootEnv = {
  ...process.env,
  APPFINANZAS_ENV_PATH: tempDevEnvPath,
  PRISMA_PROFILE_GUARD_DRY_RUN: '1',
};

const remoteDevActiveRootEnv = {
  ...process.env,
  APPFINANZAS_ENV_PATH: tempRemoteDevEnvPath,
  PRISMA_PROFILE_GUARD_DRY_RUN: '1',
};

const remotePersonalActiveRootEnv = {
  ...process.env,
  APPFINANZAS_ENV_PATH: tempRemotePersonalEnvPath,
  PRISMA_PROFILE_GUARD_DRY_RUN: '1',
};

const malformedActiveRootEnv = {
  ...process.env,
  APPFINANZAS_ENV_PATH: tempMalformedEnvPath,
  PRISMA_PROFILE_GUARD_DRY_RUN: '1',
};

const cleanup = () => rmSync(tempDir, { recursive: true, force: true });

try {

const withoutConfirmation = spawnSync(process.execPath, [guardScript], {
  encoding: 'utf8',
});

if (withoutConfirmation.status === 0) {
  console.error('Personal reset guard must fail without explicit confirmation.');
  process.exit(1);
}

if (!withoutConfirmation.stderr.includes('Personal database reset blocked')) {
  console.error('Personal reset guard must warn that personal data destruction is blocked.');
  process.exit(1);
}

const withConfirmation = spawnSync(process.execPath, [
  guardScript,
  '--confirm',
  'RESET_APPFINANZAS_PERSONAL',
  '--profile',
  'appfinanzas_personal',
], {
  encoding: 'utf8',
  env: {
    ...process.env,
    APPFINANZAS_ENV_PATH: tempPersonalEnvPath,
    PRISMA_PROFILE_GUARD_DRY_RUN: '1',
    COMPOSE_PROJECT_NAME: 'unsafe-override',
  },
});

if (withConfirmation.status !== 1) {
  console.error('Personal reset wrapper must fail closed with a deterministic nonzero status until the engine is wired.');
  console.error(withConfirmation.stderr);
  process.exit(1);
}

if (!withConfirmation.stderr.includes('PREFLIGHT_REJECTED: Compose environment variable is not allowed: COMPOSE_PROJECT_NAME')) {
  console.error('Personal reset wrapper must enter guarded preflight before it can invoke Docker.');
  process.exit(1);
}

if (withConfirmation.stderr.toLowerCase().includes('reset engine is not wired')) {
  console.error('Personal reset wrapper must not retain the deferred-engine implementation.');
  process.exit(1);
}

const devResetPlan = spawnSync(
  process.execPath,
  [prismaProfileScript, 'dev', '--', 'migrate', 'reset', '--schema', 'prisma/schema.prisma', '--force'],
  {
    encoding: 'utf8',
    env: devActiveRootEnv,
  },
);

if (devResetPlan.status !== 0) {
  console.error('Dev Prisma reset guard dry-run must pass when active root .env is dev-scoped.');
  console.error(devResetPlan.stderr);
  process.exit(1);
}

if (!devResetPlan.stdout.includes('profile=dev')) {
  console.error('Dev Prisma reset guard must select the dev profile explicitly.');
  process.exit(1);
}

if (!devResetPlan.stdout.includes(customizedDevDatabaseUrl)) {
  console.error('Dev Prisma reset guard must use the active root .env DATABASE_URL, including local customizations.');
  process.exit(1);
}

if (devResetPlan.stdout.includes('localhost:5433/appfinanzas_dev')) {
  console.error('Dev Prisma reset guard must not replace active root .env with the example dev DATABASE_URL.');
  process.exit(1);
}

const remoteDevResetPlan = spawnSync(
  process.execPath,
  [prismaProfileScript, 'dev', '--', 'migrate', 'reset', '--schema', 'prisma/schema.prisma', '--force'],
  {
    encoding: 'utf8',
    env: remoteDevActiveRootEnv,
  },
);

if (remoteDevResetPlan.status === 0) {
  console.error('Dev Prisma reset guard must reject remote hosts even when port and database name match.');
  process.exit(1);
}

if (!remoteDevResetPlan.stderr.includes('allowed hosts are localhost and 127.0.0.1')) {
  console.error('Dev Prisma reset guard remote-host message must explain the local-host contract.');
  console.error(remoteDevResetPlan.stderr);
  process.exit(1);
}

const remotePersonalDryRun = spawnSync(
  process.execPath,
  [prismaProfileScript, 'personal', '--', 'generate', '--schema', 'prisma/schema.prisma'],
  {
    encoding: 'utf8',
    env: remotePersonalActiveRootEnv,
  },
);

if (remotePersonalDryRun.status === 0) {
  console.error('Personal Prisma profile guard must reject remote hosts even when port and database name match.');
  process.exit(1);
}

if (!remotePersonalDryRun.stderr.includes('allowed hosts are localhost and 127.0.0.1')) {
  console.error('Personal Prisma profile guard remote-host message must explain the local-host contract.');
  console.error(remotePersonalDryRun.stderr);
  process.exit(1);
}

const malformedDevDryRun = spawnSync(
  process.execPath,
  [prismaProfileScript, 'dev', '--', 'generate', '--schema', 'prisma/schema.prisma'],
  {
    encoding: 'utf8',
    env: malformedActiveRootEnv,
  },
);

if (malformedDevDryRun.status === 0) {
  console.error('Dev Prisma profile guard must reject a malformed DATABASE_URL.');
  process.exit(1);
}

if (!malformedDevDryRun.stderr.includes('malformed DATABASE_URL')) {
  console.error('Dev Prisma profile guard malformed-url message must be clear.');
  console.error(malformedDevDryRun.stderr);
  process.exit(1);
}

const mismatchedDevResetPlan = spawnSync(
  process.execPath,
  [prismaProfileScript, 'dev', '--', 'migrate', 'reset', '--schema', 'prisma/schema.prisma', '--force'],
  {
    encoding: 'utf8',
    env: personalActiveRootEnv,
  },
);

if (mismatchedDevResetPlan.status === 0) {
  console.error('Dev Prisma reset guard must reject an active root .env that points at personal data.');
  process.exit(1);
}

if (!mismatchedDevResetPlan.stderr.includes('Run `pnpm env:dev` first')) {
  console.error('Dev Prisma reset guard mismatch message must instruct the user to run `pnpm env:dev` first.');
  console.error(mismatchedDevResetPlan.stderr);
  process.exit(1);
}

const packageDevResetPlan = process.platform === 'win32'
  ? spawnSync(`${pnpmBinary} prisma:dev:reset`, {
      encoding: 'utf8',
      shell: true,
      env: personalActiveRootEnv,
    })
  : spawnSync(pnpmBinary, ['prisma:dev:reset'], {
      encoding: 'utf8',
      env: personalActiveRootEnv,
    });

if (packageDevResetPlan.status === 0) {
  console.error('Package script prisma:dev:reset must reject a personal active root .env in dry-run mode.');
  process.exit(1);
}

if (!packageDevResetPlan.stderr.includes('Run `pnpm env:dev` first')) {
  console.error('Package script prisma:dev:reset mismatch message must instruct the user to run `pnpm env:dev` first.');
  console.error(packageDevResetPlan.stderr ?? packageDevResetPlan.error?.message);
  process.exit(1);
}

console.log('Personal reset guard contract is valid.');
} finally {
  cleanup();
}
