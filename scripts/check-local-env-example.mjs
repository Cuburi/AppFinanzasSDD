import { existsSync, readFileSync } from 'node:fs';

const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
const envDevExamplePath = new URL('../.env.dev.example', import.meta.url);
const envPersonalExamplePath = new URL('../.env.personal.example', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const serverPackageJson = JSON.parse(
  readFileSync(new URL('../server/package.json', import.meta.url), 'utf8'),
);
const ciWorkflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const dockerCompose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
const pullRequestTemplatePath = new URL('../.github/pull_request_template.md', import.meta.url);

const envDevExample = existsSync(envDevExamplePath) ? readFileSync(envDevExamplePath, 'utf8') : '';
const envPersonalExample = existsSync(envPersonalExamplePath)
  ? readFileSync(envPersonalExamplePath, 'utf8')
  : '';
const pullRequestTemplate = existsSync(pullRequestTemplatePath)
  ? readFileSync(pullRequestTemplatePath, 'utf8')
  : '';

const requiredLines = [
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5433/appfinanzas_dev?schema=public"',
  'PORT="3001"',
];

const requiredNotes = [
  'Default local setup targets the isolated dev database.',
  'For personal daily-use data, copy `.env.personal.example` intentionally with `pnpm env:personal`.',
  'Root `.env` is the local source of truth for the server runtime and Prisma CLI commands.',
  'Do not create or rely on `prisma/.env`; it is ignored to prevent database configuration drift.',
];

const requiredDevProfileLines = [
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5433/appfinanzas_dev?schema=public"',
  'PORT="3001"',
];

const requiredPersonalProfileLines = [
  'PERSONAL DAILY-USE PROFILE',
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5434/appfinanzas_personal?schema=public"',
  'PORT="3001"',
];

const requiredDockerSnippets = [
  'postgres-dev:',
  'container_name: appfinanzas-postgres-dev',
  'POSTGRES_DB: appfinanzas_dev',
  '"5433:5432"',
  'appfinanzas_postgres_dev_data:/var/lib/postgresql/data',
  'postgres-personal:',
  'container_name: appfinanzas-postgres-personal',
  'POSTGRES_DB: appfinanzas_personal',
  '"5434:5432"',
  'appfinanzas_postgres_personal_data:/var/lib/postgresql/data',
];

const requiredScripts = {
  'env:dev': 'node scripts/use-env-profile.mjs dev',
  'env:personal': 'node scripts/use-env-profile.mjs personal',
  'db:dev:up': 'docker compose up --wait postgres-dev',
  'db:dev:down': 'docker compose stop postgres-dev',
  'db:dev:reset': 'docker compose stop postgres-dev && docker compose rm -f -v postgres-dev && docker compose up --wait postgres-dev',
  'db:personal:up': 'docker compose up --wait postgres-personal',
  'db:personal:down': 'docker compose stop postgres-personal',
  'db:personal:reset': 'node scripts/guard-personal-reset.mjs',
  'prisma:dev:generate': 'node scripts/run-prisma-with-profile.mjs dev -- generate --schema prisma/schema.prisma',
  'prisma:dev:migrate': 'node scripts/run-prisma-with-profile.mjs dev -- migrate dev --schema prisma/schema.prisma',
  'prisma:dev:reset': 'node scripts/run-prisma-with-profile.mjs dev -- migrate reset --schema prisma/schema.prisma --force',
  'prisma:dev:studio': 'node scripts/run-prisma-with-profile.mjs dev -- studio --schema prisma/schema.prisma',
  'prisma:personal:generate': 'node scripts/run-prisma-with-profile.mjs personal -- generate --schema prisma/schema.prisma',
  'prisma:personal:migrate': 'node scripts/run-prisma-with-profile.mjs personal -- migrate deploy --schema prisma/schema.prisma',
  'prisma:personal:studio': 'node scripts/run-prisma-with-profile.mjs personal -- studio --schema prisma/schema.prisma',
};

const forbiddenScripts = ['db:reset', 'prisma:reset'];

const forbiddenServerPrismaScripts = [
  'prisma:generate',
  'prisma:migrate',
  'prisma:reset',
  'prisma:studio',
];

const requiredCiSnippets = [
  'Branch release readiness',
  'pnpm local:check-env',
  'pnpm local:check-readme',
  'pnpm env:dev',
  'pnpm prisma:dev:generate',
];
const forbiddenCiSnippets = ['pnpm prisma:generate'];
const ciDevProfileIndex = ciWorkflow.indexOf('pnpm env:dev');
const ciPrismaDevGenerateIndex = ciWorkflow.indexOf('pnpm prisma:dev:generate');

const requiredGitignoreLines = ['!.env.dev.example', '!.env.personal.example'];

const requiredPullRequestTemplateSnippets = [
  'Approved issue',
  'Exactly one `type:*` label',
  'CI is green',
  'Tests and docs',
  'DB profile safety',
  '`pnpm env:dev`',
  '`pnpm env:personal`',
];

const missing = [
  ...[...requiredLines, ...requiredNotes]
    .filter((line) => !envExample.includes(line))
    .map((line) => `.env.example: ${line}`),
  ...(!existsSync(envDevExamplePath) ? ['missing .env.dev.example'] : []),
  ...requiredDevProfileLines
    .filter((line) => !envDevExample.includes(line))
    .map((line) => `.env.dev.example: ${line}`),
  ...(!existsSync(envPersonalExamplePath) ? ['missing .env.personal.example'] : []),
  ...requiredPersonalProfileLines
    .filter((line) => !envPersonalExample.includes(line))
    .map((line) => `.env.personal.example: ${line}`),
  ...requiredDockerSnippets
    .filter((snippet) => !dockerCompose.includes(snippet))
    .map((snippet) => `docker-compose.yml: ${snippet}`),
  ...Object.entries(requiredScripts)
    .filter(([name, command]) => packageJson.scripts?.[name] !== command)
    .map(([name, command]) => `package.json script ${name}: ${command}`),
  ...forbiddenScripts
    .filter((name) => Object.hasOwn(packageJson.scripts ?? {}, name))
    .map((name) => `remove ambiguous destructive script ${name}`),
  ...forbiddenServerPrismaScripts
    .filter((name) => Object.hasOwn(serverPackageJson.scripts ?? {}, name))
    .map((name) => `remove ambiguous server/package.json script ${name}`),
  ...requiredCiSnippets
    .filter((snippet) => !ciWorkflow.includes(snippet))
    .map((snippet) => `.github/workflows/ci.yml: ${snippet}`),
  ...forbiddenCiSnippets
    .filter((snippet) => ciWorkflow.includes(snippet))
    .map((snippet) => `.github/workflows/ci.yml must not call removed script: ${snippet}`),
  ...(ciDevProfileIndex > ciPrismaDevGenerateIndex
    ? ['.github/workflows/ci.yml must run `pnpm env:dev` before `pnpm prisma:dev:generate`']
    : []),
  ...requiredGitignoreLines
    .filter((line) => !gitignore.includes(line))
    .map((line) => `.gitignore: ${line}`),
  ...(!existsSync(pullRequestTemplatePath) ? ['missing .github/pull_request_template.md'] : []),
  ...requiredPullRequestTemplateSnippets
    .filter((snippet) => !pullRequestTemplate.includes(snippet))
    .map((snippet) => `.github/pull_request_template.md: ${snippet}`),
];

if (missing.length > 0) {
  console.error('Missing required local profile safety entries:');
  for (const line of missing) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log('Local profile safety contract is valid.');
