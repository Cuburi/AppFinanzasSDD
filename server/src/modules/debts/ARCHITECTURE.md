# Arquitectura del módulo `debts`

Este módulo usa una versión pragmática de arquitectura hexagonal: el negocio queda en el centro y los detalles técnicos viven en los bordes.

## Mapa rápido

```txt
HTTP request
  -> http/
    -> application/
      -> domain/
      -> application/ports
        -> infrastructure/prisma
```

La regla principal es:

```txt
domain/application no conocen Express ni Prisma.
http/infrastructure sí pueden conocer application/domain.
```

## Qué representa cada carpeta

| Carpeta | Qué representa | Qué debería contener | Qué NO debería contener |
|---|---|---|---|
| `domain/` | Reglas de negocio puras de deudas | Entidades, reglas de saldo, reglas de pago, errores de dominio, COP-only | Prisma, Express, request/response HTTP |
| `application/` | Casos de uso de la app | Orquestación: crear deuda, listar deudas, registrar pago | Queries Prisma, validación HTTP, detalles de rutas |
| `application/ports/` | Contratos que necesita la app | Interfaces como `DebtRepository` y `TransactionRunner` | Implementaciones concretas |
| `infrastructure/prisma/` | Adaptadores técnicos hacia Prisma | Repositorios Prisma, mappers Prisma, transacciones, retry `P2034`, `Decimal` | Reglas de negocio nuevas |
| `http/` | Adaptador de entrada HTTP | Routes, parsing de payloads, presenter de respuestas | Reglas de negocio profundas o queries DB |
| `debts.module.ts` | Composition root del módulo | Conecta Prisma + adapters + use cases + router | Reglas de negocio |

## Flujo de ejemplo: crear deuda

```txt
POST /debts
  -> http/debts.routes.ts
  -> http/debts.schemas.ts
  -> application/use-cases/create-debt-use-case.ts
  -> domain/debt.ts
  -> application/ports/debt-repository.port.ts
  -> infrastructure/prisma/debt-prisma-repository.ts
```

En simple:

1. `http/` traduce HTTP a un comando de aplicación.
2. `application/` coordina el caso de uso.
3. `domain/` valida reglas como monto positivo y moneda `COP`.
4. `application/ports/` define qué necesita guardar o consultar.
5. `infrastructure/prisma/` implementa ese contrato usando Prisma.

## Flujo de ejemplo: registrar pago

```txt
POST /debts/:id/payments
  -> http/
  -> RegisterDebtPaymentUseCase
  -> TransactionRunner.runSerializable(...)
  -> DebtRepository.findById(...)
  -> Debt.registerPayment(...)
  -> DebtRepository.addPayment(...)
```

Puntos importantes:

- La regla “no pagar más que el saldo” vive en `domain/`.
- La transacción serializable y el retry `P2034` viven en `infrastructure/prisma/`.
- El caso de uso no sabe que existe Prisma; solo usa puertos.

## Cómo leer el módulo

Si querés entender una regla de negocio, empezá por:

```txt
domain/
```

Si querés entender una acción del sistema, empezá por:

```txt
application/use-cases/
```

Si querés entender cómo se conecta con la base de datos, mirá:

```txt
infrastructure/prisma/
```

Si querés entender la API HTTP, mirá:

```txt
http/
```

Si querés entender cómo se arma todo, mirá:

```txt
debts.module.ts
```

## Señales de que estamos rompiendo la arquitectura

- `domain/` importa algo de Prisma o Express.
- `application/` importa `Request`, `Response`, `Router`, `PrismaClient` o tipos generados de Prisma.
- `http/` calcula saldos o decide reglas de pago.
- `infrastructure/prisma/` inventa reglas de negocio que no existen en `domain/`.
- `debts.module.ts` empieza a tener lógica de negocio en vez de solo wiring.

## Idea central

La arquitectura no está en los nombres de carpetas. Está en la dirección de las dependencias:

```txt
Los detalles técnicos dependen del core.
El core no depende de los detalles técnicos.
```
