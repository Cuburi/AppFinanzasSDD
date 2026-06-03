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

- Node.js
- pnpm vía Corepack
- Docker Desktop para la base de datos local PostgreSQL

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

3. Levantar PostgreSQL local con Docker:

   ```bash
   pnpm db:up
   ```

   La base queda disponible para Prisma, la app y DataGrip en:

   ```txt
   Host: localhost
   Port: 5433
   Database: appfinanzas
   User: postgres
   Password: postgres
   ```

   El puerto `5433` evita conflictos con instalaciones locales de PostgreSQL que ya usen `5432`.

4. Ejecutar Prisma sobre una base limpia:

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
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

Para descartar datos locales y volver a aplicar migraciones:

```bash
pnpm prisma:reset
```

Si querés borrar también el volumen Docker local:

```bash
pnpm db:reset
pnpm prisma:migrate
```

Ambos caminos destruyen datos locales. No los uses contra bases compartidas o productivas.

### Manual PostgreSQL fallback

Docker es el camino recomendado. Si Docker no está disponible, instalá PostgreSQL manualmente y creá una base que coincida con `.env.example`:

```txt
postgresql://postgres:postgres@localhost:5433/appfinanzas?schema=public
```

Si usás otro host, puerto, usuario o contraseña, ajustá el `DATABASE_URL` del `.env` raíz antes de correr `pnpm prisma:migrate`. No crees `prisma/.env`: el `.env` raíz es la fuente de verdad local.

## Scripts principales

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Levanta frontend y backend en paralelo desde la raíz. |
| `pnpm db:up` | Levanta PostgreSQL local con Docker y espera a que esté listo. |
| `pnpm db:down` | Detiene el contenedor PostgreSQL sin borrar los datos locales. |
| `pnpm db:reset` | Reinicia PostgreSQL borrando el volumen local. **Destruye los datos locales.** |
| `pnpm local:setup` | Valida `.env.example`, levanta PostgreSQL, genera Prisma Client y ejecuta migraciones sobre una base limpia. |
| `pnpm local:check-readme` | Valida que el README mantenga el checklist local mínimo. |
| `pnpm --dir client dev` | Levanta solo el frontend. |
| `pnpm --dir server dev` | Levanta solo el backend. |
| `pnpm --dir server test` | Ejecuta las pruebas del backend. |
| `pnpm prisma:migrate` | Ejecuta migraciones Prisma usando `prisma/schema.prisma`. |
| `pnpm prisma:reset` | Resetea la base local vía Prisma y aplica migraciones. **Destruye los datos locales.** |
| `pnpm prisma:studio` | Abre Prisma Studio. |

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
