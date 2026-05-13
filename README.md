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
- npm
- PostgreSQL

## Configuración local

1. Instalar dependencias:

   ```bash
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. Crear el archivo `.env` desde el ejemplo:

   ```bash
   cp .env.example .env
   ```

3. Ajustar `DATABASE_URL` si tu PostgreSQL local usa otro usuario, contraseña, host o base de datos.

4. Ejecutar Prisma:

   ```bash
   npm run prisma:generate --prefix server
   npm run prisma:migrate --prefix server
   ```

5. Levantar cliente y servidor juntos:

   ```bash
   npm run dev
   ```

## Scripts principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Levanta frontend y backend en paralelo desde la raíz. |
| `npm run dev --prefix client` | Levanta solo el frontend. |
| `npm run dev --prefix server` | Levanta solo el backend. |
| `npm test --prefix server` | Ejecuta las pruebas del backend. |
| `npm run prisma:migrate --prefix server` | Ejecuta migraciones Prisma usando `prisma/schema.prisma`. |
| `npm run prisma:studio --prefix server` | Abre Prisma Studio. |

## Dominio funcional

La app busca resolver un problema concreto: saber cuánto dinero queda disponible durante el mes en cada subcategoría de gasto, y diferenciar gasto real de dinero reservado para objetivos futuros.

Ejemplos del dominio:

- Categorías grandes como `Gastos hogar` o `Necesidades básicas`.
- Subcategorías con presupuesto mensual como `Transporte público` o `Celular`.
- Registro de gastos que descuentan disponibilidad del mes.
- Ahorros con propósito, como ropa o aseo, donde el saldo se deriva de movimientos.
- Reportes futuros para detectar sobrantes, desfases y patrones de gasto.

## Nota de aprendizaje

Este repositorio está pensado como proyecto de aprendizaje técnico. Las decisiones se documentan de forma incremental para entender no solo qué se implementa, sino por qué se implementa de esa manera.
