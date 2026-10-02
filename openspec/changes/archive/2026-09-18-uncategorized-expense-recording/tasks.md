# Tasks: Uncategorized Expense Recording (RM-026)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | chained PRs |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — approved chained PRs
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Lock-first backend protocol | PR 1 | Tests stay with ports, workflows, and Prisma adapter changes. |
| 2 | Nullable contracts and closure semantics | PR 2 | Depends on PR 1; includes unit tests. |
| 3 | Null-safe read models and filters | PR 3 | Depends on PR 2; includes mapper/adapter tests. |
| 4 | Client uncategorized flows and variance UI | PR 4 | Depends on PR 3; includes client checks. |
| 5 | Roadmap metadata and full verification | PR 5 | Depends on PR 4; no implementation tests added here. |

## Phase 1: Backend Locking Foundation (Work Unit 1)

- [x] 1.1 RED: Add failing lock-order and closed-month rejection tests for `server/src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts`, using real PostgreSQL barriers and instrumented lock signals; cover close plus every existing-month mutator.
- [x] 1.2 RED: Add failing contract tests for `lockForMutation` in `server/src/modules/monthly-cycle/application/ports/monthly-cycle-ports.ts` and `shared/month-queries.ts`.
- [x] 1.3 GREEN: Implement transaction-scoped `SELECT ... FOR UPDATE` in `infrastructure/prisma/monthly-cycle-prisma-adapters.ts`; wire lock-first orchestration through movement, income, cash, month-structure, closure use cases and both workflows.
- [x] 1.4 REFACTOR: Keep `service.ts`, module root, routes, and service contract wiring-only; remove duplicated lock sequencing into focused shared helpers.

## Phase 2: Nullable Contracts and Closure (Work Unit 2)

- [x] 2.1 RED: Add failing DTO/use-case tests for all-or-neither classification, active categorization, closed rejection, and the 10,000 income/expense closure scenario.
- [x] 2.2 GREEN: Update `dto/{expenses,history,reports,ledger,closure}.dto.ts`, `application/use-cases/movement-use-cases.ts`, and related service types for nullable classification and informational variance.
- [x] 2.3 GREEN: Preserve month-level `availableMoney` authority in closure workflows; ensure positive category surplus is non-transferable and does not block close.
- [x] 2.4 REFACTOR: Consolidate active-month assertions without changing `balance-calculator.ts` or `cash-ledger.ts` calculations.

## Phase 3: Persistence and Read Models (Work Unit 3)

- [x] 3.1 RED: Add failing tests for null persistence, categorized compatibility, totals, ledger/history visibility, `UNCATEGORIZED` filtering, and closed reads.
- [x] 3.2 GREEN: Update `monthly-cycle-prisma-adapters.ts` and `mappers/{monthly-cycle,report,ledger}-mappers.ts` to persist/read null safely and emit `Uncategorized` plus variance views.
- [x] 3.3 REFACTOR: Keep Prisma/generated types inside infrastructure and keep DTOs/mappers free of business rules.

## Phase 4: Client Integration (Work Unit 4)

- [x] 4.1 RED: Add failing client tests/check fixtures for optional selection, explicit filtering, accessible labels, closed controls, and non-transferable variance.
- [x] 4.2 GREEN: Update `client/src/{types.ts,lib/api.ts,pages/{ActiveMonthPage,ReportsPage}.tsx,features/monthly-cycle/active-month-dashboard/**}` for nullable payloads and displays.
- [x] 4.3 REFACTOR: Preserve existing categorized rendering and avoid blank/null labels.

## Phase 5: Roadmap and Verification (Work Unit 5)

- [x] 5.1 Update `docs/product/roadmap.md` to place RM-026 before RM-012 with decision history.
- [x] 5.2 Run `pnpm --dir server test`, `pnpm --dir server build`, and `pnpm --dir client check`; verify all spec scenarios, lock matrix results, row counts, and error codes.
