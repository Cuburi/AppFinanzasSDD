# Tasks: RM-026 P2010 Remediation

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~489 for expanded PR 2 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes; maintainer-approved exception for PR 2 |
| Suggested split | PR 1 / #188 → expanded PR 2, stacked-to-main |
| Delivery strategy | exception-ok |
| Chain strategy | stacked-to-main / size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

## Preserved PR 1 Completion

- [x] 1.1–1.5 PR 1 retry/classifier, fresh transaction, telemetry, and focused unit evidence are approved in #188.

## Phase 2: Expanded PR 2 — Recovery Proof and Locking Protocol

- [x] 2.1 **RED evidence recovered:** `evidence/tasks-2.1-2.2-recovery.patch` records the real-PostgreSQL missing-helper failure (3/4) from base `fb30ff7`.
- [x] 2.2 **GREEN evidence recovered:** the same apply-checkable 53-addition patch records 4/4, two attempts, one movement, `0.30→0.10` available money, and absent→`0.20` pocket balance.
- [x] 2.3 **RED/GREEN:** Add the port, Prisma `FOR UPDATE` + aggregate reread, and lock-before-mutable-decision seam for every writer and both close flows; correct the matrix to test 16 distinct implementations, replacing duplicate strict deposit coverage with `createMovementService(...).depositToPocket`.
- [x] 2.4 **VERIFY:** Focused unit/architecture and PostgreSQL recovery/close-first evidence passed; the 16-writer result, RM-026 fixture cleanup audit, and deployment-required writer-quiescence gate are recorded in `apply-progress.md`.

## Delivery, Rollback, and Rollout

PR 2 is the approved ~489-line `size:exception` on #188. It is one implementation and rollback boundary: recovery patch, lock port/adapter/callers, matrix, and tests revert together; PR 1 remains. Before deploy or rollback, quiesce all monthly-cycle writers, drain in-flight old/new instances, transition every writer instance, verify a single compatible version, then resume. Mixed versions are prohibited because old writers bypass the lock protocol.
