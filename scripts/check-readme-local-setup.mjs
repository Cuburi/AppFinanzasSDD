import { readFileSync } from 'node:fs';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const requiredSnippets = [
  'cp .env.example .env',
  'pnpm db:up',
  'pnpm prisma:generate',
  'pnpm prisma:migrate',
  'pnpm --dir server dev',
  'pnpm --dir client dev',
  'curl http://localhost:3001/health',
  'curl http://localhost:5173/api/health',
  'curl http://localhost:3001/api/months/active',
  'curl http://localhost:3001/api/pockets',
  'curl http://localhost:3001/api/debts',
  'pnpm prisma:reset',
  'pnpm db:reset',
  'Manual PostgreSQL fallback',
  'La base queda intencionalmente limpia.',
  'no hay seed demo ni datos falsos',
  'cargá meses, ingresos, gastos, bolsillos y deudas desde la app.',
  '/api/months/active` devuelve `{ "month": null }`',
  '/api/pockets` y `/api/debts` devuelven listas vacías',
];

const missing = requiredSnippets.filter((snippet) => !readme.includes(snippet));

if (missing.length > 0) {
  console.error('README local setup checklist is missing required entries:');
  for (const snippet of missing) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

console.log('README local setup checklist contract is valid.');
