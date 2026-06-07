const confirmationToken = 'RESET_APPFINANZAS_PERSONAL';

if (process.env.CONFIRM_PERSONAL_RESET !== confirmationToken) {
  console.error('Personal database reset blocked.');
  console.error(`Set CONFIRM_PERSONAL_RESET=${confirmationToken} only after backing up personal data.`);
  process.exit(1);
}

console.log('Personal reset confirmation accepted.');

const { spawnSync } = await import('node:child_process');
const { fileURLToPath } = await import('node:url');

const prismaProfileScript = fileURLToPath(new URL('./run-prisma-with-profile.mjs', import.meta.url));
const resetResult = spawnSync(
  process.execPath,
  [
    prismaProfileScript,
    'personal',
    '--',
    'migrate',
    'reset',
    '--schema',
    'prisma/schema.prisma',
    '--force',
  ],
  {
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

process.stdout.write(resetResult.stdout);
process.stderr.write(resetResult.stderr);
process.exit(resetResult.status ?? 1);
