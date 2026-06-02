import { readFileSync } from 'node:fs';

const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

const requiredLines = [
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5433/appfinanzas?schema=public"',
  'PORT="3001"',
];

const requiredNotes = [
  'Root `.env` is the local source of truth for the server runtime and Prisma CLI commands.',
  'Do not create or rely on `prisma/.env`; it is ignored to prevent database configuration drift.',
];

const missing = [...requiredLines, ...requiredNotes].filter((line) => !envExample.includes(line));

if (missing.length > 0) {
  console.error('Missing required .env.example local setup entries:');
  for (const line of missing) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log('.env.example local setup contract is valid.');
