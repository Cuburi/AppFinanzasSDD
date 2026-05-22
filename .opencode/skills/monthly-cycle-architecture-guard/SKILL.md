---
name: monthly-cycle-architecture-guard
description: "Trigger: monthly-cycle, service.ts, workflows, mappers, dto, routes, module boundary changes. Guard the monthly-cycle module architecture and stop boundary leaks."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# monthly-cycle-architecture-guard

## Activation Contract

Use when editing or reviewing `server/src/modules/monthly-cycle`, especially `service.ts`, `workflows/`, `mappers/`, `dto/`, `routes.ts`, or changes that move behavior across module boundaries.

## Hard Rules

- Keep `service.ts` as a facade and composition root. It may wire workflow factories and re-export public entrypoints, but it should not grow domain logic.
- Put use-case behavior in `workflows/`. If new behavior needs its own transaction, validations, or orchestration, extract or extend a workflow instead of enlarging `service.ts`.
- Put shared low-level helpers and shared domain primitives in `shared/`.
- Put API/data transformation in `mappers/`.
- Keep DTO and API contract parsing/types in `dto/`; do not hide request-shape logic inside workflows.
- Avoid circular imports between workflows. If two workflows need the same helper, extract it to `shared/` or create a clearer composition seam.
- Prefer small focused public methods over a growing "god service" surface.
- If a requested change crosses boundaries unclearly, stop and ask before implementing.

## Decision Gates

| Change | Place |
|------|------|
| Route/request payload parsing | `dto/` |
| DB-backed use case or transaction flow | `workflows/` |
| Shared invariant, query helper, money helper, domain error | `shared/` |
| View/output shaping | `mappers/` |
| Public wiring/export only | `service.ts` |

## Execution Steps

1. Inspect the target change and name the real responsibility before editing.
2. If the change adds behavior, first try to place it in an existing workflow; if that makes the workflow blurry, create a new focused workflow.
3. Keep `service.ts` limited to composing workflow instances and exposing the public module API.
4. Check imports after changes. If workflows start depending on each other or on route/DTO concerns, refactor before finishing.
5. When a change needs a new boundary, say so explicitly instead of silently stretching the current one.

## Output Contract

Return the architectural placement chosen, note any extracted workflow/helper/mapper, and call out boundary risks if the requested change still feels cross-cutting.

## References

- `server/src/modules/monthly-cycle/service.ts`
- `server/src/modules/monthly-cycle/workflows/month-lifecycle-service.ts`
- `server/src/modules/monthly-cycle/mappers/monthly-cycle-mappers.ts`
- `server/src/modules/monthly-cycle/shared/service-types.ts`
