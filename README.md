# AppFinanzasSDD

AppFinanzasSDD es una aplicación de finanzas personales para organizar presupuestos mensuales por categorías y subcategorías, registrar gastos, controlar ahorros con propósito y preparar reportes útiles para tomar mejores decisiones.

El proyecto también funciona como práctica guiada de desarrollo con SDD: primero se define el problema, después se baja a especificación, diseño, tareas e implementación incremental.

## Estado actual

- MVP 1 en desarrollo: ciclo mensual base.
- Backend Express + TypeScript con Prisma.
- Frontend React + Vite + TypeScript.
- Base de datos PostgreSQL.

## Estructura

```txt
.
├── client/                 # Frontend React
├── server/                 # Backend Express
├── prisma/                 # Schema y migraciones Prisma
├── scripts/                # Scripts de desarrollo
├── alcance.md              # Problema, solución y funcionalidades
├── plan-implementacion.md  # Plan incremental
├── tech-stack.md           # Stack técnico propuesto
└── user-stories.md         # Historias de usuario
```

## Requisitos

- Node.js 22
- pnpm 11.1.2 vía Corepack
- Docker Desktop para la base de datos local PostgreSQL

### Validación rápida del frontend

Con Node.js 22 activo, prepará pnpm y ejecutá el check completo:

```bash
corepack enable
pnpm --version
pnpm install --frozen-lockfile
pnpm check:client
```

El último comando ejecuta typecheck, tests y build de producción del frontend.

## Configuración local

1. Instalar dependencias:

   ```bash
   corepack enable
   pnpm install
   ```

2. Crear el archivo `.env` desde el ejemplo:

   ```bash
   cp .env.example .env
   ```

   En PowerShell también podés usar:

   ```powershell
   Copy-Item -LiteralPath ".env.example" -Destination ".env"
   ```

3. Activar el perfil dev y levantar PostgreSQL local con Docker:

   ```bash
   pnpm env:dev
   pnpm db:dev:up
   ```

   La base queda disponible para Prisma, la app y DataGrip en:

   ```txt
   Host: localhost
   Port: 5433
   Database: appfinanzas_dev
   User: postgres
   Password: postgres
   ```

   El puerto `5433` evita conflictos con instalaciones locales de PostgreSQL que ya usen `5432`.

4. Ejecutar Prisma sobre la base dev limpia:

   ```bash
   pnpm prisma:dev:generate
   pnpm prisma:dev:migrate
   ```

   La base queda intencionalmente limpia. Esta app está pensada para uso local con tus datos reales de finanzas personales, así que no hay seed demo ni datos falsos: cargá meses, ingresos, gastos, bolsillos y deudas desde la app.

5. Levantar cliente y servidor juntos:

   ```bash
   pnpm dev
   ```

   O levantarlos en terminales separadas:

   ```bash
   pnpm --dir server dev
   pnpm --dir client dev
   ```

6. Smoke checks locales:

   ```bash
   curl http://localhost:3001/health
   curl http://localhost:5173/api/health
   curl http://localhost:3001/api/months/active
   curl http://localhost:3001/api/pockets
   curl http://localhost:3001/api/debts
   ```

   Los dos primeros validan API + conexión a base de datos. Con una base limpia, `/api/months/active` devuelve `{ "month": null }` hasta que abras un mes; `/api/pockets` y `/api/debts` devuelven listas vacías hasta que cargues tus datos reales.

### Reset local

Para descartar datos dev y volver a aplicar migraciones:

```bash
pnpm prisma:dev:reset
```

Si querés borrar también el volumen Docker dev:

```bash
pnpm db:dev:reset
pnpm prisma:dev:migrate
```

Ambos caminos destruyen solo datos del perfil dev. Para borrar datos personales tenés que usar el comando explícito `pnpm db:personal:reset` con `CONFIRM_PERSONAL_RESET=RESET_APPFINANZAS_PERSONAL`; no lo uses salvo que quieras destruir tu base diaria.

### Manual PostgreSQL fallback

Docker es el camino recomendado. Si Docker no está disponible, instalá PostgreSQL manualmente y creá una base dev que coincida con `.env.example`:

```txt
postgresql://postgres:postgres@localhost:5433/appfinanzas_dev?schema=public
```

No crees `prisma/.env`: el `.env` raíz es la fuente de verdad local. Por seguridad, los comandos Prisma guardados esperan dev en `localhost:5433` y personal en `localhost:5434`; no prometen puertos custom por edición casual de `.env`. Una topología distinta requiere cambiar deliberadamente los guards/scripts de perfiles antes de correr comandos Prisma guardados.

## Scripts principales

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Levanta frontend y backend en paralelo desde la raíz. |
| `pnpm env:dev` | Copia el perfil dev a `.env`; es el perfil por defecto para desarrollo. |
| `pnpm env:personal` | Copia el perfil personal a `.env`; usalo solo para uso diario intencional. |
| `pnpm db:dev:up` | Levanta PostgreSQL dev con Docker y espera a que esté listo. |
| `pnpm db:dev:down` | Detiene el contenedor PostgreSQL dev sin borrar datos. |
| `pnpm db:dev:reset` | Reinicia PostgreSQL dev borrando su volumen. **Destruye datos dev.** |
| `pnpm db:personal:up` | Levanta PostgreSQL personal explícitamente. |
| `pnpm db:personal:reset` | Reseteo personal guardado por `CONFIRM_PERSONAL_RESET=RESET_APPFINANZAS_PERSONAL`. **Destruye datos personales.** |
| `pnpm local:setup` | Valida `.env.example`, levanta PostgreSQL, genera Prisma Client y ejecuta migraciones sobre una base limpia. |
| `pnpm local:check-readme` | Valida que el README mantenga el checklist local mínimo. |
| `pnpm check:client` | Ejecuta typecheck, tests y build de producción del frontend. |
| `pnpm --dir client dev` | Levanta solo el frontend. |
| `pnpm --dir server dev` | Levanta solo el backend. |
| `pnpm --dir server test` | Ejecuta las pruebas del backend. |
| `pnpm prisma:dev:generate` | Genera Prisma Client forzando la base dev. |
| `pnpm prisma:dev:migrate` | Ejecuta migraciones Prisma contra dev usando `prisma/schema.prisma`. |
| `pnpm prisma:dev:reset` | Resetea la base dev vía Prisma y aplica migraciones. **Destruye datos dev.** |
| `pnpm prisma:dev:studio` | Abre Prisma Studio contra dev. |
| `pnpm prisma:personal:migrate` | Aplica migraciones desplegables contra personal de forma explícita. |
| `pnpm prisma:personal:studio` | Abre Prisma Studio contra personal de forma explícita. |

## Branch release policy

La estrategia actual: `master` simula producción estable y `dev` es la rama de integración/staging. Las ramas de trabajo entran por PR aprobado hacia `dev`; cuando `dev` tiene un avance estable, se promueve con un PR de promoción desde `dev` hacia `master`. No usamos release branches hasta que una necesidad real de estabilización lo justifique.

Checklist de rama y PR:

- Nombrar ramas como `feat|fix|docs|chore|refactor|test|build|ci|perf|style|revert/<slug>`.
- Vincular un issue aprobado o cambio SDD aprobado antes de pedir review.
- Aplicar exactamente un label `type:*` por PR.
- Mantener CI verde antes de mergear una rama de trabajo a `dev`.
- Si el cambio supera el presupuesto de review de 400 líneas, partirlo en PRs encadenados con tests/docs por unidad.
- Promover solo avances estables con PR de promoción desde `dev` hacia `master`.
- Configurar protecciones para bloquear pushes directos a `dev` y `master`; `master` debe tener reglas más estrictas porque representa el estado estable/personal-promovible.

La promoción personal ocurre después del PR `dev` -> `master`, no después de cada PR de feature. Requiere validación dev y una decisión explícita. Hasta cerrar el formato final de tags, usá el placeholder `personal-YYYY.MM.DD` para marcar el punto de promoción personal.

## Personal promotion checklist

Antes de usar un cambio con datos personales diarios:

- [ ] Confirmar que el PR de feature fue aprobado y mergeado a `dev`.
- [ ] Confirmar que el PR de promoción `dev` -> `master` fue aprobado y mergeado.
- [ ] Confirmar CI verde en `dev` y en el PR de promoción hacia `master`, incluyendo branch release readiness.
- [ ] Validar primero en dev con `pnpm env:dev`, `pnpm db:dev:up`, migraciones y smoke checks.
- [ ] Crear o anotar el tag/checklist de promoción `personal-YYYY.MM.DD`.
- [ ] Activar personal explícitamente con `pnpm env:personal`.
- [ ] Aplicar solo comandos personales explícitos, como `pnpm prisma:personal:migrate` o `pnpm prisma:personal:studio`.
- [ ] No correr resets personales salvo decisión consciente con `pnpm db:personal:reset` y `CONFIRM_PERSONAL_RESET=RESET_APPFINANZAS_PERSONAL`.

## Docker isolation verification

Verificación manual esperada para confirmar que dev y personal están aislados:

```bash
pnpm env:dev
docker compose up --wait postgres-dev postgres-personal
docker compose exec postgres-personal psql -U postgres -d appfinanzas_personal -c "CREATE TABLE IF NOT EXISTS isolation_marker (id int primary key); INSERT INTO isolation_marker (id) VALUES (1) ON CONFLICT DO NOTHING;"
pnpm db:dev:reset
docker compose exec postgres-personal psql -U postgres -d appfinanzas_personal -c "SELECT id FROM isolation_marker WHERE id = 1;"
```

El volumen personal debe seguir intacto: el último comando tiene que devolver la fila `1`. Si Docker no está disponible, no reemplaces esta prueba con un reset manual sobre personal; dejá documentada la limitación y corré la verificación cuando Docker esté disponible.

## Dominio funcional

La app busca resolver un problema concreto: saber cuánto dinero queda disponible durante el mes en cada subcategoría de gasto, y diferenciar gasto real de dinero reservado para objetivos futuros.

Ejemplos del dominio:

- Categorías grandes como `Gastos hogar` o `Necesidades básicas`.
- Subcategorías con presupuesto mensual como `Transporte público` o `Celular`.
- Registro de gastos que descuentan disponibilidad del mes.
- Ahorros con propósito, como ropa o aseo, donde el saldo se deriva de movimientos.
- Reportes futuros para detectar sobrantes, desfases y patrones de gasto.

## Ciclo mensual: gastos, historial y efectivo

El mes activo expone saldos calculados por backend: ingresos del mes, dinero disponible y efectivo físico. El efectivo no se guarda como saldo mutable; se deriva de movimientos de retiro, arrastre y gastos pagados en efectivo.

### Endpoints principales

| Endpoint | Semántica |
|----------|-----------|
| `POST /api/months/:id/expenses` | Registra un gasto con `sourceSubcategoryId`, `amount`, `occurredAt`, `paymentMethod` (`CASH` o `NON_CASH`) y `description` opcional. Los gastos en efectivo también reducen el efectivo físico. |
| `GET /api/months/:id/expenses?from&to&paymentMethod&subcategoryId` | Lista el historial de gastos del mes con fecha, método de pago, categoría, subcategoría, monto y descripción. Los filtros son opcionales. |
| `POST /api/months/:id/cash-withdrawals` | Registra un retiro de efectivo con `amount`, `occurredAt` y `description` opcional. Reduce el dinero disponible del mes y aumenta el efectivo físico. |
| `GET /api/months/:id/cash` | Devuelve `cashBalance` y eventos de efectivo del mes. |

Reglas clave:

- `CASH_WITHDRAWAL` baja el dinero disponible y sube el efectivo físico.
- `EXPENSE` con `paymentMethod: "CASH"` baja la subcategoría y el efectivo físico, pero no vuelve a bajar el dinero disponible.
- `EXPENSE` con `paymentMethod: "NON_CASH"` baja la subcategoría y el dinero disponible.
- Al abrir un mes nuevo, el efectivo positivo remanente del último mes cerrado se arrastra como efectivo inicial.

## Nota de aprendizaje

Este repositorio está pensado como proyecto de aprendizaje técnico. Las decisiones se documentan de forma incremental para entender no solo qué se implementa, sino por qué se implementa de esa manera.
