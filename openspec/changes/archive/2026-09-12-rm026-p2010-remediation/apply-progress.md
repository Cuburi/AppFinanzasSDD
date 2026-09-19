# Apply Progress: RM-026 P2010 Remediation

## Status

PR 1 / #188 is approved and complete. Expanded PR 2 is authorized as one stacked-to-main maintainer-approved `size:exception` (~489 lines). Task 2.4 is complete: the maintainer-authorized local cleanup removed only bounded RM-026 runtime fixtures from the approved `appfinanzas_dev` profile, and the focused and PostgreSQL evidence was rerun successfully. Tasks 2.1–2.2 are durably recovered SDD evidence, not committed production work.

## Completion State

- [x] 1.1–1.5 PR 1 exact P2010/40001 recovery, bounded fresh Serializable attempts, telemetry, and focused unit proof; preserve unchanged.
- [x] 2.1 RED evidence recovered in `evidence/tasks-2.1-2.2-recovery.patch`: base `fb30ff7`, 3/4 with `ReferenceError: createDeterministicP2010RecoveryRunner is not defined`.
- [x] 2.2 GREEN evidence recovered in the same apply-checkable 53-addition patch: 4/4, two attempts, one movement, available money `0.30→0.10`, pocket balance absent→`0.20`.
- [x] 2.3 Production port/Prisma lock-and-reread, all writer/close callers, and corrected 16-writer matrix. `lockForMutation` is application-owned; the Prisma adapter performs parameterized `FOR UPDATE` then aggregate reread, and the matrix contains the compatibility `createMovementService(...).depositToPocket` plus exactly one strict deposit implementation.
- [x] 2.4 Focused verification, local PostgreSQL recovery/close-first evidence, cleanup audit, and re-judgment inputs. The focused suite passed 49/49 and the PostgreSQL harness passed 5/5, including all 16 close-first writers. Cleanup removed 2 fixture movements, 3 fixture months, and 4 `rm026-*` pockets; the final audit is zero for RM-026 pockets, incomes, fixture months, and fixture movements. Operational writer quiescence remains a deployment/rollback gate and is explicitly not local-pass evidence.

## Work Unit Evidence: task-2.4-cleanup-local-evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec node --import tsx --test src/modules/monthly-cycle/application/use-cases/cash-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/closure-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/income-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/month-structure-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/movement-use-cases.test.ts src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-adapters.test.ts src/modules/monthly-cycle/shared/month-queries.test.ts; if ($?) { pnpm exec tsc --noEmit -p tsconfig.json }; if ($?) { git -C .. apply --check --cached openspec/changes/rm026-p2010-remediation/evidence/tasks-2.1-2.2-recovery.patch }; if ($?) { git -C .. diff --check -- server/src/modules/monthly-cycle }` exited 0: 49/49 passed, 0 failed; TypeScript, recovery-patch apply check, and diff check passed. |
| Runtime harness command/scenario and exact result | `$envFile = [System.IO.File]::ReadAllText((Resolve-Path '..\\.env')); $match = [regex]::Match($envFile, '(?m)^DATABASE_URL\\s*=\\s*["'']?([^"''\\r\\n]+)'); if (-not $match.Success -or -not $match.Groups[1].Value.Contains('appfinanzas_dev')) { 'approved root .env PostgreSQL profile unavailable'; exit 2 }; $env:DATABASE_URL = $match.Groups[1].Value; pnpm exec node --import tsx --test src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` exited 0: 5/5 passed, 0 failed. It proved two-attempt P2010/40001 recovery with one durable effect; the close-first test completed its 16-factory loop, and every writer reread `CLOSED`, returned `MONTH_NOT_ACTIVE`, and preserved the asserted movement/income counts. |
| Cleanup/process evidence | Pre-cleanup audit: `{"rm026Pockets":4,"rm026Incomes":3,"runtimeFixtureMonths":3,"movementsByMonth":2,"movementsByPocket":0}`. After a zero-process audit (`integration_harness_processes=0`), one approved-profile transaction deleted only movements linked to those fixture months/pockets (2), the three derived fixture months, and the four `rm026-*` pockets. Post-harness audit: `{"rm026Pockets":0,"rm026Incomes":0,"runtimeFixtureMonths":0,"fixtureMovements":0}`. A final process audit also returned `integration_harness_processes=0`. |
| Writer-quiescence evidence | Deployment/rollback writer quiescence is required, not locally passed: drain/disable every monthly-cycle writer, wait for old/new in-flight work, transition every instance, verify one compatible version, then resume. It cannot be exercised without an operational deployment or rollback event; mixed old/new versions remain prohibited. |
| Rollback boundary | Revert only the expanded PR 2 monthly-cycle port, adapter, lock callers, matrix/recovery tests, and this SDD evidence together. PR 1 retry behavior remains deployed; no schema, migration, API, UI, or data repair is involved. |

## Architecture Guard Result

PASS. `MonthRepositoryPort` remains application-owned, the parameterized Prisma lock stays in `infrastructure/prisma`, mutable decisions remain in use cases/workflows through the port, and both close flows use the same lock-and-reread seam. No Prisma dependency remains in the shared mutable-state helper.

## Continuation Contract

The canonical recovery source is the artifact patch, not `C:\Users\Cuburi.DESKTOP-A3IQC7A\AppData\Local\Temp\opencode\rm026-postgres-recovery`. Apply-check it against `fb30ff7` before restoring its test-only change. The matrix inventory must count the strict deposit once and separately include compatibility `createMovementService(...).depositToPocket`; public `createMovementUseCases(...).depositToPocket` and direct strict construction are duplicate entrypoints to the strict implementation.

## Delivery, Rollback, and Rollout

Expanded PR 2 is one rollback boundary: recovered recovery proof, lock port/adapter/callers, matrix, and tests revert together, while PR 1 remains deployed. No schema, migration, API, UI, or data repair is involved. Deployment and rollback require monthly-cycle writer quiescence: drain/disable writers, wait for old/new in-flight work, transition all writer instances, verify one compatible version, then resume. Mixed old/new versions are unsafe because old instances bypass the lock protocol.

## Local Cleanup Diagnosis and Harness Disposition

The previous runtime run left three RM-026-derived months and four `rm026-*` pockets because the harness's per-fixture cleanup did not complete for every interrupted prior run. The current cleanup derived its month set only from `MonthlyIncome.sourceName` or `MonthCategory.name` matching `rm026-%`, and its pocket set only from `SavingsPocket.name` matching `rm026-%`; it deleted no non-RM-026 rows. The harness itself is retained unchanged: its rerun passed 5/5 and its final audit is clean. Operational writer quiescence is still deployment-required and is not represented as local proof.

## Runtime Attempt and Settlement Inputs

- Work unit: `task-2.4-cleanup-local-evidence`
- Native runtime token (provided; not acquired or settled): `sha256:4cb7967a59566a2cf5c7256c0ed6a84c5a2fd779919ca2bfcbff415878565b2`
- Failed evidence revision remediated by this distinct evidence: `sha256:aec8be5f76804e5c47779151e36c4e0c2e9a78b35e42ada9dc7a82aef0497022`
- Current local evidence SHA-256: `sha256:cb72744dd794ac120e07fc37ecc952a8e0d423a57c4a486fda2f142d2830acb7`
- Current local evidence verdict: `pass` — focused checks, local PostgreSQL runtime, cleanup audit, and process audit passed; operational quiescence is truthfully retained as a required deployment gate.
- Settlement disposition: no acquisition or settlement was attempted by the apply executor.

## Focused Remediation: RM-026 Independent Verification Failure

This remediation addresses only failed independent-verification revision `sha256:3542d311566cdbfb6622458208f12605cdd3d4e9490d880e8f04557a0d799bfc`. It does not change any production lock semantics or task completion state. Final independent verification remains pending.

### Remediation Implementation

`monthly-cycle-prisma-concurrency.integration.test.ts` now gives every close-first writer a stable name and executes the 16-writer matrix through an isolated runner. The runner records a passed or failed writer outcome, always releases and settles close/writer operations, records a passed, failed, or not-required cleanup outcome, completes all remaining writers, and only then throws one aggregate error when any writer or cleanup outcome failed. The aggregate error exposes sanitized writer names and status values only.

### Work Unit Evidence: rm026-failure-isolation-remediation

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec node --import tsx --test src/modules/monthly-cycle/application/use-cases/cash-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/closure-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/income-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/month-structure-use-cases.test.ts src/modules/monthly-cycle/application/use-cases/movement-use-cases.test.ts src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-adapters.test.ts src/modules/monthly-cycle/shared/month-queries.test.ts` exited 0: 49/49 passed, 0 failed. `pnpm exec tsc --noEmit -p tsconfig.json` exited 0. `git diff --check -- server/src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` exited 0. |
| Runtime harness command/scenario and exact result | With the approved root `.env` `appfinanzas_dev` profile: `pnpm exec node --import tsx --test src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` exited 0: 6/6 passed, 0 failed. The all-success matrix reported 16 passed writer outcomes and 16 passed cleanup outcomes. The runtime failure-injection scenario injected a writer failure for `deleteExpense` and a cleanup failure for `compatibilityDepositToPocket`; it received one aggregate error after all 16 writers and all 16 cleanup paths ran, with all non-injected outcomes passed and both outcome lists retaining the full ordered 16-writer inventory. |
| Cleanup/process evidence | Each matrix iteration releases its close barrier, awaits any started close/writer operation with `Promise.allSettled`, and then runs fixture deletion before recording cleanup status. The injected cleanup failure runs after physical fixture deletion, so the failure-reporting scenario does not retain its fixture. Post-run process audit returned `integration_harness_processes=0`. |
| Rollback boundary | Revert only the matrix aggregation and failure-injection coverage in `server/src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` plus this remediation record. Production ports, adapters, lock callers, and their semantics are unchanged. |

### Architecture Guard Result

PASS. The remediation is confined to the real-PostgreSQL integration harness in `infrastructure/prisma`; it adds no application, workflow, route, port, adapter, or production lock behavior.

### Runtime Attempt and Settlement Inputs: Focused Remediation

- Work unit: `rm026-failure-isolation-remediation`
- Provided runtime token (not acquired or settled): `sha256:67dee99754dbc06be18258891ae58b4b8dfd19767e87a878eec8111a25f8dc11`
- Failed evidence revision remediated by distinct evidence: `sha256:3542d311566cdbfb6622458208f12605cdd3d4e9490d880e8f04557a0d799bfc`
- Current test-file SHA-256: `sha256:f1615e7b230617859ba22f9a6470b0e3bd656f791d4720da856c5bdf7e8dd4ea`
- Current remediation evidence manifest SHA-256: `sha256:ece4d5f2168fea8b45b756c34c1ad8b675dbe3b2e8eaeb25f1b90422093fc865`
- Settlement disposition: no acquisition or settlement was attempted by the apply executor. A passing parent settlement must use this distinct remediation evidence against the failed revision above.
