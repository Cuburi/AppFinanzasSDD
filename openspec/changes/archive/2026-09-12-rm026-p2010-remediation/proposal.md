# Proposal: RM-026 P2010 Remediation

## Intent

Preserve the approved PR 1 retry boundary and complete expanded PR 2: durable real-PostgreSQL recovery evidence plus the production month row-lock-and-reread protocol required for a valid close-first writer matrix.

## Scope

### In Scope
- Keep PR 1's exact `P2010` + direct `meta.code=40001` fresh-transaction retry behavior unchanged.
- Restore Tasks 2.1–2.2 from the temporary worktree through the recoverable SDD patch artifact.
- Add `MonthRepositoryPort.lockForMutation`, its Prisma `FOR UPDATE` adapter, and lock-before-mutable-decision callers for all close-first writers and close flows.
- Prove 16 distinct writer implementations against close-first PostgreSQL behavior; include `createMovementService(...).depositToPocket` and count the strict deposit only once.
- Use a maintainer-approved `size:exception` of approximately 489 changed lines for expanded PR 2.
- Quiesce monthly-cycle writers during deployment and rollback; mixed old/new instances are not supported because old instances bypass the lock protocol.

### Out of Scope
- UI, API, DTO, schema, migration, and other RM-026 work units.
- Any broader `P2010` translation, data repair, or production implementation before PR 2 apply begins.

## Delivery and Rollback

PR 1 / #188 remains approved history and is not reopened. PR 2 is one stacked-to-main expanded unit based on #188 with the approved `size:exception`; it includes the recovery evidence, lock protocol, caller changes, matrix, and their tests. Roll back all of PR 2 together if necessary; retain PR 1 retry behavior. No data repair is required.

## Durable Evidence and Continuation

Tasks 2.1–2.2 are complete only as recovered evidence, not production delivery. `evidence/tasks-2.1-2.2-recovery.patch` is the canonical, apply-checkable 53-addition patch from base `fb30ff7`; it restores the deterministic integration helper/test without relying on the temporary worktree. Recorded proof is RED 3/4 (`ReferenceError` for the missing helper), then GREEN 4/4 with two attempts, one movement, and balances `0.30→0.10` and absent→`0.20`.

## Success Criteria

- [ ] Expanded PR 2 applies the lock-and-reread protocol before mutable decisions and keeps close ordering on the same seam.
- [ ] The recovered Tasks 2.1–2.2 patch remains apply-checkable and its exactly-once PostgreSQL evidence remains reproducible.
- [ ] All 16 distinct writers, including compatibility deposit, observe `CLOSED` and return `MONTH_NOT_ACTIVE` with unchanged effects.
- [ ] Deployment and rollback resume writers only after a single compatible version is active.
