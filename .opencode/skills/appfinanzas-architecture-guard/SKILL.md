---
name: appfinanzas-architecture-guard
description: "Trigger: server modules, hexagonal architecture, routes, use cases, ports, adapters, Prisma boundaries. Guard AppFinanzasSDD module architecture."
license: Apache-2.0
metadata:
  author: "Cuburi"
  version: "1.0"
---

## Activation Contract

Use when modifying or reviewing AppFinanzasSDD backend modules under `server/src/modules/**`, especially routes, DTOs, mappers, `application/use-cases`, `application/ports`, infrastructure adapters, module roots, or service contracts.

## Hard Rules

- Keep `*.module.ts` as the composition root: create adapters, create use cases, compose the public service/router, and apply test overrides. Do not put business rules or persistence queries there.
- Keep routes as inbound adapters: parse HTTP input, call the module service, map responses/errors. Do not import Prisma, infrastructure adapters, or workflow internals from routes.
- Keep application use cases as behavior owners: orchestrate application rules through ports. Do not import Express, Prisma generated client, or concrete infrastructure.
- Keep ports in `application/ports` as application-owned contracts. Do not expose Prisma/generated types or infrastructure APIs through ports.
- Keep infrastructure under `infrastructure/**`: Prisma/generated types, persistence queries, and conversion from infrastructure values belong there.
- Keep DTOs and mappers as boundary translators. Do not add business decisions, transactions, or persistence calls.
- Allow `*-service-contract.ts` only for large public module surfaces. It may define the public service shape and compose use-case methods; it must stay wiring-only.

## Decision Gates

| Situation | Required action |
|---|---|
| New `service.ts` appears | Stop and justify why it is not a logic dumping ground. Prefer module root + use cases + optional `*-service-contract.ts`. |
| Prisma import outside infrastructure | Stop unless it is a deliberate adapter-boundary exception already documented. |
| Composer contains `if`, calculations, transactions, or persistence | Move that behavior to a use case/workflow or infrastructure adapter. |
| Route imports use cases/adapters directly | Route through the module service boundary instead. |
| Mapper/DTO starts enforcing business rules | Move the rule to application/domain behavior. |

## Execution Steps

1. Identify the touched module boundary and load any narrower module skill if present.
2. Classify each changed file as route, DTO, mapper, module root, use case, port, infrastructure, or service contract.
3. Check imports for boundary leaks, especially Prisma/generated types crossing into application or route code.
4. Check that behavior lives in use cases/workflows and persistence lives in infrastructure adapters.
5. For tests, keep assertions near the boundary they protect and avoid testing through obsolete compatibility paths.

## Output Contract

Return PASS/FAIL with:
- Boundary leaks found or explicitly absent.
- Files that need relocation or responsibility cleanup.
- Whether `*.module.ts` and any `*-service-contract.ts` stayed composition/wiring-only.
- Required follow-up tests or architecture assertions.

## References

- Project source: `server/src/modules/**`
