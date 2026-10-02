# Apply Progress: Uncategorized Expense Recording (RM-026)

## Delivery Context

- Mode: Work Units 1–3 Strict TDD; Work Unit 4 Standard
- Artifact store: hybrid
- Delivery: chained PRs, `stacked-to-main`
- Current work unit: 4 — Client uncategorized flows and variance UI
- PR boundary: client contracts, API filter serialization, active-month expense/history UI, reports, and close-month variance presentation only. No server, roadmap, commit, push, or PR work.
- Review impact: 318 changed lines (114 additions, 204 deletions); within the 400-line budget.

## Completed Tasks

- [x] 1.1 RED: Add deterministic real-PostgreSQL lock-order and closed-month rejection integration coverage for close plus every existing-month mutator.
- [x] 1.2 RED: Add failing contract tests for `lockForMutation` in `server/src/modules/monthly-cycle/application/ports/monthly-cycle-ports.ts` and `shared/month-queries.ts`.
- [x] 1.3 GREEN: Implement transaction-scoped `SELECT ... FOR UPDATE` in `infrastructure/prisma/monthly-cycle-prisma-adapters.ts`; wire lock-first orchestration through movement, income, cash, month-structure, closure use cases and both workflows.
- [x] 1.4 REFACTOR: Keep `service.ts`, module root, routes, and service contract wiring-only; remove duplicated lock sequencing into focused shared helpers.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` | Integration | ⚠️ 11 adapter tests passed; the legacy deposit race hung under the new lock-first protocol, so it was replaced with approved deterministic coverage | ✅ First new test run failed because closed-month writers exposed no `MONTH_NOT_ACTIVE` code | ✅ 4/4 integration tests | ✅ Close-first matrix covers expense, deposits, income, cash, structure, and closure writes; expense-first proves close rereads the committed expense | ✅ Removed the obsolete sleep-free-but-deadlocking deposit race and disconnected Prisma once after the file |
| 1.2 | `shared/month-queries.test.ts`, `infrastructure/prisma/monthly-cycle-prisma-adapters.test.ts` | Unit | ✅ Adapter baseline: 10/10 | ✅ Missing export/method failed | ✅ 12/12 | ✅ Parameterized query plus closed-month path | ✅ Shared lock helper extracted |
| 1.3 | `application/use-cases/{movement,income,cash,month-structure,closure}-use-cases.test.ts` | Unit | ✅ 25/25 | ✅ Five lock-count assertions failed | ✅ 43/43 focused tests | ✅ All existing-month mutator families + closed-lock helper path | ✅ Shared lock-and-assert helper |
| 1.4 | Same focused unit tests | Unit | ✅ 43/43 before final refactor confirmation | ➖ Covered by 1.3 behavior tests | ✅ 43/43 | ➖ Structural refactor | ✅ `lockMutableMonthForMutation` centralizes sequence |

## Commands and Results

1. `pnpm env:dev && pnpm db:dev:up && pnpm prisma:dev:generate && pnpm prisma:dev:migrate`
   - Docker PostgreSQL startup and Prisma Client generation succeeded. `prisma migrate dev` stopped safely because the non-interactive CLI detected a non-empty `MonthlyLedgerBackfillControl` table and a potential drop; no reset or destructive migration was run.
2. `pnpm --dir server exec node --import tsx --test --test-name-pattern "close-first" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"`
   - RED: failed because closed-month writers returned no `MONTH_NOT_ACTIVE` code.
3. `pnpm --dir server exec node --import tsx --test --test-name-pattern "close-first|expense-first" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"`
   - GREEN: 2/2 passed after the shared closed-month error and regular deposit path were corrected.
4. `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"`
   - Passed: 4/4 real PostgreSQL integration tests.
5. Focused Work Unit 1 unit verification command
   - Passed: 43/43 across adapter, shared helper, movement, income, cash, structure, and closure use cases.
6. `git diff --check`
    - Passed.

## Judgment Day Fix Round 1 — JD-WU1-001

- [x] Strengthened only the close-first real-PostgreSQL proof. Each mutator now begins while close retains the Month lock, emits a deterministic pre-lock-attempt signal, and must contribute a visible ungranted PostgreSQL transaction lock before close releases.
- A writer that bypasses the shared `FOR UPDATE` path settles before that lock-state evidence and fails the test; no sleeps or elapsed-time assertions are used.
- JD-WU1-002, JD-WU1-003, JD-WU1-004, and R4-001 remain unchanged.

### Focused TDD Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| JD-WU1-001 | `infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` | Real PostgreSQL integration | ⚠️ Blocked: PostgreSQL at `localhost:5433` was unavailable before edits | ⚠️ Blocked: the focused close-first command could not create its fixture because PostgreSQL was unavailable | ⚠️ Blocked: Docker Desktop's Linux engine was unavailable, so the real-PostgreSQL proof could not execute | ✅ All 16 existing-month mutators now require independent lock-attempt and blocked-lock evidence | ➖ None needed; test-only proof infrastructure |

### Judgment Day Focused Commands

1. `pnpm --dir server exec node --import tsx --test --test-name-pattern "close-first" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"`
   - Safety-net and post-change executions were blocked at fixture creation: PostgreSQL was unavailable at `localhost:5433`.
2. `pnpm env:dev && pnpm db:dev:up`
   - Blocked: Docker Desktop Linux engine pipe was unavailable. No database reset, migration, or destructive action was attempted.
3. `pnpm --dir server build`
   - Blocked by the pre-existing incomplete `MonthRecord` fake in `shared/month-queries.test.ts`; the new close-first proof produced no TypeScript error.

### Judgment Day Residual Risk

- The new deterministic real-PostgreSQL proof has not been executed in this environment because Docker/PostgreSQL is unavailable. Re-run command 1 after the dev database is available before treating the fix as runtime-verified.

## Judgment Day Fix Round 2 — JD-WU1-001 and JD-WU1-003

- [x] JD-WU1-001 test proof now joins the waiting transaction lock to its blocking close transaction and requires both backend PIDs to hold `RowShareLock` on the `Month` relation. The bypass gate races writer settlement against lock attempt, so an unlocked writer fails rather than leaving an unbounded pending signal.
- [x] JD-WU1-003 lifecycle fake now implements `lockForMutation` with the production port's `MonthRecord` contract; the close lifecycle assertion explicitly requires the lock call before closure.
- JD-WU1-002, JD-WU1-004, and R4-001 remain unchanged.

### Final-Round TDD and Runtime Evidence

| Task | Test File | Layer | Safety Net / RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| JD-WU1-001 | `infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` | Real PostgreSQL integration | ⚠️ Runtime RED blocked: fixture creation could not reach `localhost:5433` | ⚠️ Blocked: Docker Desktop Linux engine was unavailable after a safe `db:dev:up` attempt; no reset, migration, or recovery was run | ✅ Covers all 16 existing-month mutators with per-writer blocking-transaction evidence | ➖ Test-only proof correction |
| JD-WU1-003 | `application/use-cases/lifecycle-use-cases.test.ts` | Unit | ✅ RED: 2/3 passed; close failed because the fake lacked `lockForMutation` | ✅ 3/3 directly affected lifecycle tests; focused Work Unit 1 suite 46/46 | ✅ Read and close paths assert distinct port behavior | ➖ Direct fake/contract alignment only |

### Final-Round Commands

1. `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/application/use-cases/lifecycle-use-cases.test.ts"`
   - RED baseline: 2/3 passed; `months.lockForMutation is not a function` during close.
   - GREEN: 3/3 passed after the lifecycle fake implemented the port.
2. Focused Work Unit 1 unit suite (shared helper, Prisma adapter, movement, income, cash, structure, closure, lifecycle)
   - Passed: 46/46.
3. `pnpm env:dev && pnpm db:dev:up`
   - Blocked safely: Docker Desktop Linux engine pipe was unavailable. No reset, migration, destructive change, or recovery was attempted.
4. `pnpm --dir server exec node --import tsx --test --test-name-pattern "close-first" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"`
   - Blocked at fixture creation: PostgreSQL was unavailable at `localhost:5433`; the 16-mutator runtime matrix did not execute.
5. `pnpm --dir server build`
   - Blocked by the pre-existing unrelated incomplete `MonthRecord` fake in `shared/month-queries.test.ts:32`; it was outside JD-WU1-003's lifecycle-only fix scope.
6. `git diff --check`
   - Passed.

### Final-Round Status

- JD-WU1-003: fixed with direct unit and focused-suite evidence.
- JD-WU1-001: implementation evidence improved, but remains open until the real PostgreSQL matrix runs.
- Final allowed fix round: escalated for the unavailable Docker/PostgreSQL runtime blocker.

## Environment-Unblocked Verification — JD-WU1-001 Only

Docker Desktop was available on 2026-09-01, so the previously blocked runtime evidence was executed without changing runtime code, test code, Prisma schema, or migrations. No database reset, `prisma migrate dev`, destructive Prisma acceptance, commit, push, PR, or Work Unit 2 action was performed.

### Exact Commands and Results

1. `docker version --format '{{json .}}'; docker info --format '{{json .OSType}} {{json .ServerVersion}} {{json .OperatingSystem}}'`
   - Passed: Docker context `desktop-linux`; server OS `linux`; Docker Engine `29.5.3`; Docker Desktop `4.77.0`.
2. `docker compose ps postgres-dev --format json; pnpm db:dev:up; docker inspect --format '{{.State.Status}} {{.State.Health.Status}}' appfinanzas-postgres-dev; docker exec appfinanzas-postgres-dev pg_isready --host localhost --port 5432 --username postgres --dbname appfinanzas_dev; docker exec appfinanzas-postgres-dev psql --username postgres --dbname appfinanzas_dev --tuples-only --no-align --command="SELECT current_database(), current_setting('server_version_num')::int >= 160000;"`
   - Passed: the documented `postgres-dev` service was already running and was idempotently confirmed `running healthy`; PostgreSQL accepted connections and returned `appfinanzas_dev|t`.
3. `pnpm --dir server exec node --import tsx --test --test-name-pattern "close-first" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"`
   - Failed: 0/1 selected tests passed. Writers 0–2 completed the required close-first assertions. Writer index 3 (`createMovementUseCases(...).depositToPocket`) reached the lock-attempt signal, remained unsettled, and was the sole PostgreSQL transaction-lock waiter blocked by close, but after close released it rejected with Prisma `P2010` instead of `MONTH_NOT_ACTIVE`. The assertion failed at line 143 and the matrix stopped before writers 4–15 executed.
4. `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/shared/month-queries.test.ts" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-adapters.test.ts" "src/modules/monthly-cycle/application/use-cases/movement-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/income-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/cash-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/month-structure-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/closure-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/lifecycle-use-cases.test.ts"`
   - Passed: 46/46 focused Work Unit 1 tests, including the corrected lifecycle test (3/3).
5. `pnpm --dir client test && pnpm --dir server test`
   - Failed overall: client passed 202/202 across 24 files; server passed 236/299 and failed 63/299. The server failures include the close-first `P2010` mismatch, transaction fakes without `$queryRaw`, and the existing architecture assertion against Prisma imports in `shared/month-queries.ts`.
6. `pnpm --dir server build`
   - Failed: TypeScript `TS2322` at `shared/month-queries.test.ts:32`; the closed-month fake still omits `year`, `month`, `openedAt`, and `closedAt` required by `MonthRecord`.
7. `git diff --check`
   - Passed; only pre-existing LF-to-CRLF warnings were emitted.

### Verification Outcome

- JD-WU1-001 is **not runtime-proven**: the matrix confirms real PostgreSQL blocking through writer index 3, but it does not prove the required `MONTH_NOT_ACTIVE` outcome for that writer or execute the remaining 12 mutators.
- The focused Work Unit 1 suite remains green at 46/46, including the lifecycle correction.
- Final ledger statuses were intentionally left unchanged for blind-judge adjudication.

## Files Changed

- `server/src/modules/monthly-cycle/application/ports/monthly-cycle-ports.ts`
- `server/src/modules/monthly-cycle/shared/{service-types,month-queries}.ts`
- `server/src/modules/monthly-cycle/shared/month-queries.test.ts`
- `server/src/modules/monthly-cycle/infrastructure/prisma/{monthly-cycle-prisma-adapters.ts,monthly-cycle-prisma-adapters.test.ts}`
- `server/src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts`
- `server/src/modules/monthly-cycle/application/use-cases/{movement,income,cash,month-structure,closure}-use-cases.ts`
- `server/src/modules/monthly-cycle/application/use-cases/{movement,income,cash,month-structure,closure}-use-cases.test.ts`
- `server/src/modules/monthly-cycle/application/use-cases/lifecycle-use-cases.test.ts`
- `server/src/modules/monthly-cycle/workflows/{movement-service,month-lifecycle-service}.ts`
- `openspec/changes/uncategorized-expense-recording/tasks.md`
- `openspec/changes/uncategorized-expense-recording/{review-ledger,apply-progress}.md`

## Architecture Check

PASS: The Prisma query remains in the infrastructure adapter; use cases/workflows call the application-owned port and shared helper. The shared mutable-month guard now emits the specified `MONTH_NOT_ACTIVE` code; routes, module root, and service contract were unchanged and remain wiring-only.

## Rollback Boundary

Revert this work unit's port, shared helper, Prisma adapter, use-case/workflow, and colocated test changes together. Do not deploy a mixed set: every existing-month writer and close must participate in the same row-lock protocol.

## Remaining Tasks

- [ ] 3.1–3.3 Persistence and read models
- [ ] 4.1–4.3 Client integration
- [ ] 5.1–5.2 Roadmap and full verification

## Work Unit 2 Attempt — Nullable Contracts and Closure Semantics

- Mode: Standard (Strict TDD disabled by `openspec/config.yaml`).
- Delivery: approved chained PR slice, `stacked-to-main`; no `size:exception` requested.
- Task checkboxes: complete. The module-service runtime harness now passes after its transaction fake adopted the lock adapter's `$queryRaw` contract and stale transferable-surplus assertions were aligned with informational-variance semantics.

### Implemented, Pending Runtime Admission

- Added nullable expense DTO parsing and nullable `sourceSubcategoryId` contracts so active-month expenses can be recorded without a classification and later categorized with a valid snapshot subcategory.
- Added nullable history classification fields and an informational `budgetVariances` closure contract.
- Made closure treat positive subcategory balances as informational budget variance, allow closure when month-level available money is reconciled, and reject surplus-to-pocket conversion as non-transferable cash.
- Preserved lock-first active-month enforcement through the existing `lockMutableMonthForMutation` helper; a closed-month recategorization remains rejected with `MONTH_NOT_ACTIVE`.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/dto/expenses.dto.test.ts" "src/modules/monthly-cycle/application/use-cases/movement-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/closure-use-cases.test.ts"` — PASS, 23/23 tests. The pre-change RED run was 19/22 pass with 3 expected failures: null DTO parsing, active uncategorized recording, and reconciled closure variance. |
| Runtime harness command/scenario and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/module-service.test.ts"` — FAIL, 12/40 passed and 28 failed. Most failures are the known Work Unit 1 test-double gap (`db.$queryRaw is not a function` when the lock-first adapter is exercised). Three surplus-action assertions also retain the superseded transferable-surplus behavior and must be revised within Work Unit 2 after the shared fake is repaired. |
| Rollback boundary | Revert only `dto/{expenses,history,closure}.dto.ts`, `application/ports/monthly-cycle-ports.ts`, `workflows/movement-service.ts`, `application/use-cases/closure-use-cases.ts`, and their focused tests. This removes nullable classification and variance semantics without touching Work Unit 1 lock protocol files. |

### Runtime Attempt Handoff

- Evidence SHA supplied by parent: `sha256:6261facded91368d5831cf245aea4d1fb65d44cdebd1dacfd55510ee7e19def7`.
- Historical failed attempt: no acquire or settlement action was performed by this executor.
- Historical harness disposition: unsuccessful because the module-service harness was not green. This attempt was remediated by the subsequent Work Unit 2 Runtime Admission and parent native settlement recorded below.
- Cleanup/process evidence: the commands exited normally; no Docker, database lifecycle, migration, reset, process start, commit, stage, reset, clean, push, or PR operation was performed.

### Blocking Diagnosis

The module-service fake lacks `$queryRaw`, which the already-applied lock-first Prisma adapter requires for every mutation. Repairing that shared fake is outside this assigned Work Unit 2 slice and would alter Work Unit 1 test infrastructure. The legacy transferable-surplus assertions also need an explicit Work Unit 2 test update before this slice can be admitted.

## Work Unit 2 Runtime Admission

- [x] 2.1 RED: Nullable DTO, active categorization, closed rejection, and reconciled closure tests were added and preserved.
- [x] 2.2 GREEN: Nullable classification and informational closure variance contracts are implemented.
- [x] 2.3 GREEN: Month `availableMoney` remains authoritative; positive budget surplus cannot transfer cash or block a reconciled close.
- [x] 2.4 REFACTOR: The shared module-service transaction fake now supports the application-owned lock contract, and legacy surplus tests assert non-transferable informational variance without changing `balance-calculator.ts` or `cash-ledger.ts`.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/dto/expenses.dto.test.ts" "src/modules/monthly-cycle/application/use-cases/movement-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/closure-use-cases.test.ts"` exited 0: 23/23 passed, 0 failed. |
| Runtime harness command/scenario and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/module-service.test.ts"` exited 0: 40/40 passed, 0 failed. The module composition harness exercised the Prisma adapter's transaction lock path for existing-month mutations and verified surplus actions remain non-transferable while a reconciled informational variance may close. |
| Rollback boundary | Revert only `server/src/modules/monthly-cycle/module-service.test.ts` and this Work Unit 2 admission record. This restores the prior test-double and legacy assertions without changing production closure or lock behavior. |

### Runtime Attempt Handoff

- Runtime token supplied by the parent: `sha256:705da1c6f8b5dc07bea5fc8d39b8145c8213a60d7cf118b9aafc6c43f00d51be`.
- Failed evidence revision remediated by this fresh evidence: `sha256:6261facded91368d5831cf245aea4d1fb65d44cdebd1dacfd55510ee7e19def7`.
- Fresh evidence revision: `sha256:a6f941bb0f40d38071b853b9994c38795a3678d105dd7c3411e8315cc02c3806` (SHA-256 of the bounded runtime-harness source revision, distinct from the failed evidence revision).
- Diagnosis: the runtime harness failed because its database fake omitted `$queryRaw`, required by `lockForMutation`; it also expected obsolete surplus-to-pocket behavior. The fake now fulfills the lock adapter contract and the assertions match the approved informational-variance design.
- Harness disposition: submitted as `reused`.
- Final task progress: Work Unit 2 tasks 2.1–2.4 are complete; the change is 8/16 tasks complete.
- Evidence results: focused tests passed 23/23; `module-service.test.ts` passed 40/40; `git diff --check` passed.
- Bounded source diff: 17 additions and 54 deletions, 71 lines total.
- Native settlement: performed by the parent for objective `next-autonomous-chained-pr-slice` and returned `state: complete`.
- Cleanup/process evidence: no database lifecycle, migration, reset, persistent process, staging, commit, push, or PR operation occurred. No acquisition or settlement operation was performed by this executor.

## Work Unit 3 — Persistence and Read Models

- Mode: Standard (`strict_tdd: false`).
- Delivery: approved chained PR slice, `stacked-to-main`; no `size:exception` requested.
- [x] 3.1 RED: Focused tests initially failed 5/27: uncategorized history threw on its missing subcategory snapshot, reports omitted uncategorized spending, and Prisma persistence/filter expectations were unmet.
- [x] 3.2 GREEN: The Prisma adapter explicitly persists nullable classifications and maps `classification=UNCATEGORIZED` to `sourceSubcategoryId: null`; history, reports, and ledger now safely include uncategorized expenses.
- [x] 3.3 REFACTOR: Prisma query syntax remains in the infrastructure adapter. DTOs express the named filter and API shapes; mappers only translate persisted values into read models.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/dto/expenses.dto.test.ts" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-adapters.test.ts" "src/modules/monthly-cycle/application/use-cases/expense-history-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/reports-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/ledger-use-cases.test.ts"` exited 0: 31/31 passed, 0 failed. |
| Runtime harness command/scenario and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/module-service.test.ts"` exited 0: 40/40 passed, 0 failed. The composed monthly-cycle service exercised the report and read-model surface with the transaction adapter seam. |
| Rollback boundary | Revert only the Work Unit 3 nullable-filter/read-model changes in the listed adapter, DTO, mapper, type, and focused-test files. This removes uncategorized persistence and presentation without touching lock-first writes or client integration. |

### Additional Validation

- `git diff --check` exited 0.
- `pnpm --dir server build` remains blocked by two pre-existing Work Unit 2 test-fixture type errors: nullable `sourceSubcategoryId` inference in `closure-use-cases.test.ts:172` and a missing `budgetVariances` fixture in `lifecycle-use-cases.test.ts:159`. The focused and runtime evidence above passed; these unrelated fixture repairs remain outside this Work Unit 3 scope.

### Runtime Attempt Handoff

- Runtime token supplied by parent: `sha256:d97d0919b6d78c7ef6437a8f2602c1e9af9bf835f173255e6348c933c2e3d950`.
- Fresh evidence revision: `sha256:83e2ff9007c6b889aaf5ff47dbc8b0407b6dc86e1f1fe62c051d49174fd2f4b8` (SHA-256 of the Work Unit 3 source-and-test manifest).
- Authored Work Unit 3 change count: 164 lines (121 source/test lines and 43 SDD artifact lines), within the 400-line cap.
- Native settlement: intentionally not performed by this executor.
- Harness disposition: `reused` because the composed module-service harness passed unchanged for the Work Unit 3 runtime boundary.
- Cleanup/process evidence: no database lifecycle, migration, reset, persistent process, staging, commit, push, PR, or cleanup operation occurred.

## Work Unit 3 Build-Fixture Remediation

- Authorization: `sha256:d7864aa11391d09844716f1c8685efd88946bb39806dc62af039e51cbf054b63` for `work-unit-3-build-fixture-remediation`, maximum one attempt and 400 changed lines.
- Failed evidence revision remediated: `sha256:83e2ff9007c6b889aaf5ff47dbc8b0407b6dc86e1f1fe62c051d49174fd2f4b8`.
- Outcome: pass. The two pre-existing test fixtures now satisfy the current nullable `MonthRecord` and `ClosureReviewView` contracts, and the server build completes.
- Diagnosis: `closure-use-cases.test.ts:172` inferred its `createClosurePorts` argument from the categorized fixture, narrowing `sourceSubcategoryId` to `string`; `lifecycle-use-cases.test.ts:159` omitted the required `budgetVariances` field from its closure-review fixture.
- Correction: typed the closure fixture parameter as `MonthRecord` and added `budgetVariances: []` to the lifecycle closure-review fixture. No production, adapter, mapper, DTO, client, or Work Unit 4 file changed.
- Harness disposition: `reused`. The composed `module-service.test.ts` runtime harness remained the applicable Work Unit 3 boundary and passed without changes.
- Task state: unchanged at 11/16. Tasks 3.1–3.3 remain complete; this bounded fixture remediation does not create or complete a task.
- Changed-line count: 3 authored fixture lines (3 additions, 0 deletions), within the 400-line cap. Existing uncommitted Work Unit 1/2 content in the same fixture files is excluded from this remediation count.
- Fresh remediation evidence revision: `sha256:a8c75ecb64a70a06428490e86f3fe7217b78f590a20b47001f77fe851c2b8b80`, distinct from the failed evidence revision.
- Native settlement: not performed by this executor.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/dto/expenses.dto.test.ts" "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-adapters.test.ts" "src/modules/monthly-cycle/application/use-cases/expense-history-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/reports-use-cases.test.ts" "src/modules/monthly-cycle/application/use-cases/ledger-use-cases.test.ts"` exited 0: 31/31 passed, 0 failed. |
| Runtime harness command/scenario and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/module-service.test.ts"` exited 0: 40/40 passed, 0 failed. The composed monthly-cycle service continued to exercise the applicable read-model boundary. |
| Build command and exact result | `pnpm --dir server build` exited 0: TypeScript compilation, Prisma generated-file copy, and Prisma build verification all passed. |
| Rollback boundary | Revert only the `MonthRecord` fixture annotation in `closure-use-cases.test.ts` and the empty `budgetVariances` fixture value in `lifecycle-use-cases.test.ts`; this restores only the prior build-fixture incompatibilities and removes no production behavior. |

### Cleanup and Process Evidence

- `git diff --check -- "server/src/modules/monthly-cycle/application/use-cases/closure-use-cases.test.ts" "server/src/modules/monthly-cycle/application/use-cases/lifecycle-use-cases.test.ts"` exited 0; only pre-existing LF-to-CRLF warnings were emitted.
- No database lifecycle, migration, reset, clean, persistent process, staging, commit, push, PR, or Work Unit 4 operation occurred.

## Work Unit 4: Client Integration

### Completed Tasks

- [x] 4.1 RED: Add client coverage for optional expense categorization, explicit uncategorized filtering, accessible controls, and informational non-transferable variance.
- [x] 4.2 GREEN: Update nullable client contracts, history filtering, active-month recording and ledger identity, reports, and close-month variance presentation.
- [x] 4.3 REFACTOR: Preserve categorized behavior while replacing blank/null labels with `Uncategorized` and removing obsolete closure-surplus transfer UI.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir client exec vitest run src/pages/CloseMonthPage.test.tsx src/pages/ReportsPage.test.tsx src/lib/api.test.ts` exited 0: 3/3 files and 37/37 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --dir client check` exited 0: 24/24 test files and 202/202 tests passed; TypeScript completed with no errors and Vite production build succeeded. This exercises the client’s routed page/API integration boundary. |
| Rollback boundary | Revert only the nine Work Unit 4 client source/test files; this removes nullable expense UI, uncategorized filtering/reporting, and informational variance rendering without touching server behavior or prior work units. |

### Settlement

- Outcome: pass.
- Fresh evidence revision: `sha1:d376503e6ef00f6b521fa989462500b62eff6b26` (binary diff manifest for the nine Work Unit 4 client files).
- Diagnosis: backend nullable contracts and informational `budgetVariances` required the client to stop treating a category as mandatory and to remove surplus-transfer controls from the closure screen.
- Harness disposition: reused; the existing client check harness proved the routed client integration after focused tests passed.
- Cleanup/process evidence: `git diff --check` exited 0. No database lifecycle, migration, reset, clean, persistent process, staging, commit, push, or PR operation occurred.
- Changed-line count: 318 lines (114 additions, 204 deletions), within the 400-line chained-PR budget.

## Work Unit 5: Roadmap and Final Implementation Evidence

- Mode: Standard (`strict_tdd: false`).
- Delivery: approved chained PR slice, `stacked-to-main`; no `size:exception` requested.
- [x] 5.1: Restored RM-026 before RM-012 in the canonical roadmap and recorded the 2026-09-13 ordering decision. The publication record now explicitly says normal Git review and publication remain pending.
- [ ] 5.2: Not complete. The required server suite failed, so the full cross-boundary verification cannot prove all spec scenarios, the lock matrix, row counts, or error codes.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `git diff --check -- "docs/product/roadmap.md" "openspec/changes/uncategorized-expense-recording/tasks.md" "openspec/changes/uncategorized-expense-recording/apply-progress.md"` exited 0. The roadmap inspection confirmed RM-026 at Now sequence 1 on line 30, RM-012 at sequence 2 on line 31, and the 2026-09-13 decision-history row on line 129. |
| Runtime harness command/scenario and exact result | `pnpm --dir server test` — FAIL. `module-service.integration.test.ts` transaction fakes call the lock-first Prisma adapter without `$queryRaw`; affected mutation paths throw `TypeError: db.$queryRaw is not a function`. `monthly-cycle.module.test.ts` also rejects the existing Prisma type import in `shared/service-types.ts`. `pnpm --dir server build` — PASS. `pnpm --dir client check` — PASS: 24/24 test files and 202/202 tests, TypeScript, and Vite production build. |
| Rollback boundary | Revert only `docs/product/roadmap.md` and the Work Unit 5 SDD artifact entries. This restores prior ordering metadata without changing application behavior or prior work units. |

### Attempt Handoff (Unsettled)

- Active runtime attempt token: `sha256:f6d3b04b5ac52d4ab8adf7a59e2eb3b6c81c3452d2938afcb7430f57111aa265` for `work-unit-5-final-implementation-evidence`.
- Outcome: failed evidence; task 5.2 remains unchecked.
- Diagnosis: final server validation is blocked by unrelated runtime-fixture and architecture-test failures. No application, fixture, or architecture-test change was made because this work unit is limited to roadmap metadata and final evidence.
- Harness disposition: invalidated because the required server runtime harness did not pass.
- Cleanup/process evidence: no database lifecycle, migration, reset, clean, persistent process, staging, commit, push, or PR operation occurred.
- Fresh evidence revision: `sha256:a930a4927ad817e58ac02662c0b17621536136afba51f4b985bf05fff25d0794` (SHA-256 of the final roadmap source revision).
- Changed-line count: 33 authored lines (29 additions, 4 deletions), within the 400-line chained-PR budget.

## Work Unit 5 Server-Suite Remediation

- Authorization: `sha256:0f4d075fc7bf3dff51a0364bb9eb32ef523d0874f3eb5ed8d5a2989a3786c27d` for `work-unit-5-server-suite-remediation`; one attempt, 400 changed-line maximum.
- Remediates failed evidence revision: `sha256:a930a4927ad817e58ac02662c0b17621536136afba51f4b985bf05fff25d0794`.
- [x] 5.2: Final cross-boundary verification passed. Task state is 16/16.

### Remediation Result

- Outcome: pass.
- Diagnosis: the server integration transaction fake omitted `$queryRaw`, required by the lock-first adapter. Its closed-month setup also retained obsolete surplus-to-pocket transitions. `MonthlyCycleDb` exposed `Prisma.Sql` from `shared/`, violating the monthly-cycle boundary check.
- Correction: the fake now implements `$queryRaw`; closure integration scenarios reconcile month money through uncategorized expenses while retaining informational budget variance; the shared database contract accepts an opaque raw-query value without importing Prisma-generated types.
- Harness disposition: reused.
- Fresh evidence revision: `sha256:53dd3c20a6239ffe53370bbe12621f2b106684852a5c7ecdbf698c7f6d500a2a` (SHA-256 of the remediated server integration harness source); distinct from the remediated revision.
- Changed-line count: 54 authored lines (31 additions, 23 deletions), within the 400-line budget.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/module-service.integration.test.ts" "src/modules/monthly-cycle/monthly-cycle.module.test.ts"` exited 0: 54/54 passed. |
| Runtime harness command/scenario and exact result | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"` exited 0: 6/6 passed. The close-first matrix passed all 16 mutators, asserted closed status, one movement and one income row per fixture, and `MONTH_NOT_ACTIVE` with HTTP 409; the injected aggregate test confirmed 16 writer and 16 cleanup outcomes. |
| Full server suite | `pnpm --dir server test` exited 0: 313/313 passed. |
| Server build | `pnpm --dir server build` exited 0: TypeScript compilation, Prisma generated-file copy, and packaged Prisma verification passed. |
| Client check | `pnpm --dir client check` exited 0: 24/24 test files and 202/202 tests passed; TypeScript and Vite production build passed. |
| Rollback boundary | Revert only `server/src/modules/monthly-cycle/module-service.integration.test.ts` and `server/src/modules/monthly-cycle/shared/service-types.ts`; this removes the fake contract and boundary-safe type correction without changing production lock behavior. |

### Cleanup and Process Evidence

- All invoked test and build processes exited normally. The real PostgreSQL matrix cleaned each fixture and reported all 16 cleanup outcomes as passed.
- No database lifecycle, migration, reset, clean, persistent process, staging, commit, push, PR, or independent verification operation occurred.

### Parent Native Settlement

- Remediation evidence revision: `sha256:53dd3c20a6239ffe53370bbe12621f2b106684852a5c7ecdbf698c7f6d500a2a`.
- Remediates failed evidence revision: `sha256:a930a4927ad817e58ac02662c0b17621536136afba51f4b985bf05fff25d0794`.
- Parent native settlement for objective `work-unit-5-server-suite-remediation` returned `state: complete`.
- Submitted harness disposition: `reused`.
- Implementation remains 16/16 complete; next phase: independent `sdd-verify`.
