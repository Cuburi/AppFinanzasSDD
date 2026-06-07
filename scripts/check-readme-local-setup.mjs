import { readFileSync } from 'node:fs';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const requiredSnippets = [
  'pnpm env:dev',
  'pnpm db:dev:up',
  'pnpm prisma:dev:generate',
  'pnpm prisma:dev:migrate',
  'pnpm --dir server dev',
  'pnpm --dir client dev',
  'curl http://localhost:3001/health',
  'curl http://localhost:5173/api/health',
  'curl http://localhost:3001/api/months/active',
  'curl http://localhost:3001/api/pockets',
  'curl http://localhost:3001/api/debts',
  'pnpm prisma:dev:reset',
  'pnpm db:dev:reset',
  'pnpm db:personal:reset',
  'CONFIRM_PERSONAL_RESET=RESET_APPFINANZAS_PERSONAL',
  'Manual PostgreSQL fallback',
  'los comandos Prisma guardados esperan dev en `localhost:5433` y personal en `localhost:5434`',
  'Una topología distinta requiere cambiar deliberadamente los guards/scripts de perfiles',
  'La base queda intencionalmente limpia.',
  'no hay seed demo ni datos falsos',
  'cargá meses, ingresos, gastos, bolsillos y deudas desde la app.',
  '/api/months/active` devuelve `{ "month": null }`',
  '/api/pockets` y `/api/debts` devuelven listas vacías',
  '## Branch release policy',
  '`master` simula producción estable',
  '`dev` es la rama de integración/staging',
  'feat|fix|docs|chore|refactor|test|build|ci|perf|style|revert/<slug>',
  'exactamente un label `type:*`',
  'PR aprobado hacia `dev`',
  'PR de promoción desde `dev` hacia `master`',
  'bloquear pushes directos a `dev` y `master`',
  'personal-YYYY.MM.DD',
  '## Personal promotion checklist',
  'La promoción personal ocurre después del PR `dev` -> `master`',
  'Validar primero en dev',
  'Confirmar CI verde en `dev` y en el PR de promoción hacia `master`',
  'Activar personal explícitamente con `pnpm env:personal`',
  '## Docker isolation verification',
  'docker compose up --wait postgres-dev postgres-personal',
  'docker compose exec postgres-personal psql',
  'pnpm db:dev:reset',
  'El volumen personal debe seguir intacto',
];

const forbiddenSnippets = [
  'pnpm db:up',
  'pnpm prisma:generate',
  'pnpm prisma:migrate',
  'pnpm prisma:reset',
  'pnpm db:reset',
  'Si usás otro host, puerto, usuario o contraseña',
];

const missing = requiredSnippets.filter((snippet) => !readme.includes(snippet));
const forbidden = forbiddenSnippets.filter((snippet) => readme.includes(snippet));

if (missing.length > 0 || forbidden.length > 0) {
  console.error('README local setup checklist is missing required entries:');
  for (const snippet of missing) {
    console.error(`- ${snippet}`);
  }
  for (const snippet of forbidden) {
    console.error(`- remove ambiguous command reference: ${snippet}`);
  }
  process.exit(1);
}

console.log('README local setup checklist contract is valid.');
