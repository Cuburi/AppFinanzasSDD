# Design: RM-026 P2010 Remediation — Expanded PR 2

## Technical Approach

PR 1 / #188 is approved and unchanged. Expanded PR 2 is the maintainer-authorized, stacked-to-main `size:exception` (~489 lines) that restores durable Tasks 2.1–2.2 recovery proof and then implements the missing production lock-and-reread prerequisite for Tasks 2.3–2.4. The recovery patch is evidence only until PR 2 apply; no production locking is implemented by this corrective artifact update.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Lock contract | Add `MonthRepositoryPort.lockForMutation(monthId): Promise<MonthRecord>`; transaction-scoped callers depend on the port only. | Keeps PostgreSQL/Prisma outside application and workflow boundaries. |
| Lock adapter | In the Prisma adapter, execute parameterized `SELECT "id" FROM "Month" WHERE "id" = ${monthId} FOR UPDATE`, then fully reread the aggregate using the same transaction client. | A lock without reread can validate stale state. |
| Ordering | Every mutable writer calls `lockForMutation` before its month-derived mutable decision or write; both close flows use the same seam before close review/update. | A close winner is reread as `CLOSED` and returns `MONTH_NOT_ACTIVE`. |
| Retry | Preserve PR 1's exact three-total-attempt P2034/P2010-40001 runner, fresh transaction/adapters, and failure-isolated allowlisted telemetry. | Expanded PR 2 must not broaden the approved recovery contract. |
| Evidence | Persist the exact 53-addition recovery diff as `evidence/tasks-2.1-2.2-recovery.patch`, based on `fb30ff7`. | Continuation must not depend on the uncommitted temporary worktree. |

## Writer Coverage

The close-first matrix has exactly 16 distinct implementations: `recordExpense`, `updateExpense`, `deleteExpense`; strict `createStrictDepositToPocketUseCase`; compatibility `createMovementService(...).depositToPocket`; income create/update/delete; `withdrawCash`; category create/update/delete; subcategory create/update/delete; and `applyClosureAction`. The public `createMovementUseCases(...).depositToPocket` and direct strict entrypoint reach the same strict implementation and count once. The recovered deterministic test may call the strict entrypoint directly, but that does not create a second matrix writer.

## File Changes

| File | Action | Description |
|---|---|---|
| `evidence/tasks-2.1-2.2-recovery.patch` | Create | Apply-checkable integration-test evidence recovered from the temporary worktree. |
| `application/ports/monthly-cycle-ports.ts` | Modify | Application-owned lock/reread port. |
| `infrastructure/prisma/monthly-cycle-prisma-adapters.{ts,test.ts}` | Modify | Transaction-local `FOR UPDATE`, complete reread, and adapter proof. |
| `application/use-cases/*`, `workflows/{movement-service,month-lifecycle-service}.ts`, matching tests | Modify | Lock all writer and close seams without moving Prisma outside infrastructure. |
| `shared/month-queries.{ts,test.ts}` | Modify | Prisma-free mutable-state helpers and closed rejection. |
| `infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` | Modify | Recovered recovery proof and corrected 16-writer close-first matrix. |

## Testing and Rollout

Apply the recovery patch with `git apply --check` before use; preserve its recorded RED 3/4 and GREEN 4/4 evidence. Then run focused unit/architecture checks and the PostgreSQL matrix: each writer blocks, rereads `CLOSED`, returns `MONTH_NOT_ACTIVE`, and leaves counts unchanged; aggregate all cases and cleanup failures after the loop.

No migration or data repair is required. Deployment and rollback require writer quiescence: drain/disable every monthly-cycle writer, wait for old/new in-flight requests to finish, deploy or revert all writer instances, verify one compatible version is active, then resume traffic. Never run the lock protocol beside old writer instances, which bypass it. Roll back the whole expanded PR 2 unit; PR 1 stays deployed.
