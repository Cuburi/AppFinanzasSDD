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
- PostgreSQL

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

3. Ajustar `DATABASE_URL` si tu PostgreSQL local usa otro usuario, contraseña, host o base de datos.

4. Ejecutar Prisma:

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. Levantar cliente y servidor juntos:

   ```bash
   pnpm dev
   ```

## Scripts principales

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Levanta frontend y backend en paralelo desde la raíz. |
| `pnpm --dir client dev` | Levanta solo el frontend. |
| `pnpm --dir server dev` | Levanta solo el backend. |
| `pnpm --dir server test` | Ejecuta las pruebas del backend. |
| `pnpm prisma:migrate` | Ejecuta migraciones Prisma usando `prisma/schema.prisma`. |
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
