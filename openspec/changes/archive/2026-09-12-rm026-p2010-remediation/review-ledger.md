# Review Ledger: RM-026 P2010 Remediation

## Judgment Day — Design — Round 1

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| JD-001 | judgment-day | `openspec/changes/rm026-p2010-remediation/design.md:15,38,44-45` | CRITICAL | verified | Both blind judges verified in scoped re-review round 2 that retry/recovered/exhausted notifications are best-effort and failure-isolated, and that deterministic throwing-observer tests preserve retry, exhaustion, committed recovery, and duplicate-effect safety. |

## Convergence

- Judge A: 1 CRITICAL candidate.
- Judge B: no findings.
- Maintainer-confirmed findings: 1 (`JD-001`).
- Suspect findings: 0.
- Contradictions: 0.
- Fixes applied: 1 (`JD-001`, fix round 1).
- Scoped re-review round 1: inconclusive because the untracked OpenSpec artifacts produced an empty `git diff HEAD`.
- Evidence recovery: exact Engram revision delta persisted below; incident finding `R4-001` resolved.
- Scoped re-review round 2: both judges verified `JD-001`.
- Terminal state: `JUDGMENT: APPROVED`.

---

## Judgment Day — Expanded PR 2 Design — Round 1

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| JD2-001 | judgment-day | `proposal.md`, `tasks.md`, `apply-progress.md`, `design.md` | CRITICAL | verified | Both scoped re-judges verified every continuation artifact consistently authorizes the expanded lock protocol, maintainer-approved ~489-line `size:exception`, stacked-to-main boundary, and whole-PR-2 rollback while preserving PR 1/#188. |
| JD2-002 | judgment-day | `evidence/tasks-2.1-2.2-recovery.patch`, `tasks.md`, `apply-progress.md`, `design.md` | CRITICAL | verified | Both scoped re-judges verified the durable, apply-checkable 53-addition patch against base `fb30ff7` and matching RED 3/4 and GREEN 4/4 evidence independent of the temporary worktree. |
| JD2-003 | judgment-day | `design.md`, `tasks.md`, `apply-progress.md` | CRITICAL | verified | Both scoped re-judges verified the corrected inventory contains exactly 16 implementations, counts strict deposit once, and includes the distinct compatibility movement-service deposit. |
| JD2-004 | judgment-day | `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md` | WARNING | info | Rollout now requires writer quiescence for deployment and rollback: drain old/new in-flight writers, transition all instances, verify one compatible version, then resume because old instances bypass the lock protocol. |

### Convergence

- Verified CRITICAL findings: 3 (`JD2-001`, `JD2-002`, `JD2-003`).
- INFO findings: 1 (`JD2-004`).
- Fixes applied: 3 artifact-level corrections; no production locking implementation.
- Skill resolution: `paths-injected`.
- Scoped re-judgment: both blind judges verified all CRITICAL findings and preserved `JD2-004` as INFO.
- Terminal state: `JUDGMENT: APPROVED`.

## Skill Resolution

`paths-injected`

---

## Scoped Re-review Evidence — Fix Round 1

**Scope:** revision-backed recovery only; this section contains the exact changed design context required to re-review `JD-001`, not the full design artifact.

- `R4-001`: **resolved** by revision-backed evidence recovery. The empty Git diff was caused by the untracked OpenSpec change directory; it was not evidence that no fix occurred.
- `JD-001`: **verified** by both blind judges against this recovered delta.

### Evidence Source

| Artifact | Pre-image | Post-image |
|---|---|---|
| `openspec/changes/rm026-p2010-remediation/design.md` | Engram sync sequence `10474`, design revision `2`, SHA-256 `0f055442a45821f3c870d3ca5ef3b0cde1d8577f31d5ecef1703735a6c94eeda` | Engram sync sequence `10490`, design revision `3`, SHA-256 `cdd38168eb5a8bb17bb440881772d87ac1a7e9ff7e4340abf46246033501d0af` |

### Exact Unified Content Delta

```diff
--- design.md (Engram sync seq 10474, revision 2)
+++ design.md (Engram sync seq 10490, revision 3)
@@ -12,7 +12,7 @@
 | Shared three-attempt budget | A mixed sequence of `P2034` and qualifying `P2010` can consume the budget sooner, but keeps retries bounded and compatible. | Keep `MAX_SERIALIZABLE_ATTEMPTS = 3`; both classifications count total transaction attempts, not retries. |
 | Fresh whole-operation retry | Repeats validations and reads, but guarantees a new snapshot and prevents reuse of an aborted transaction. | Invoke `db.$transaction(..., SERIALIZABLE_TRANSACTION_OPTIONS)` inside every loop iteration and call `createMonthlyCyclePrismaAdapters(tx)` inside its callback. The strict deposit therefore reruns the writer gate, pocket validation, month lock/reread, balance validation, and write. |
 | Existing exhaustion contract | Loses the qualifying Prisma error at final exhaustion, but preserves the established API behavior. | On attempt 3, both retryable classes throw the existing `SemanticError("CONCURRENT_MODIFICATION", 409, ...)`; `P2034` success, retry, and exhaustion behavior remains unchanged. |
-| Sanitized infrastructure telemetry | Adds low-volume warnings without introducing a logging subsystem. | Give the runner factory an optional infrastructure-only event observer with a safe default `console.warn`. Emit fixed fields only: `attempt`, `maxAttempts`, classification (`P2034` or `P2010_40001`), and outcome (`retrying`, `recovered`, or `exhausted`). Never pass the error, `meta`, message, SQL, identifiers, or financial values. |
+| Sanitized, failure-isolated infrastructure telemetry | Adds low-volume warnings without introducing a logging subsystem; observer failures are intentionally invisible to callers. | Give the runner factory an optional infrastructure-only event observer with a safe default `console.warn`. Emit fixed fields only: `attempt`, `maxAttempts`, classification (`P2034` or `P2010_40001`), and outcome (`retrying`, `recovered`, or `exhausted`). Invoke each observer notification as best-effort in a local failure-isolation boundary that swallows observer exceptions. An observer exception can never abort or suppress a retry, replace the final `CONCURRENT_MODIFICATION` exhaustion error, alter the transaction/domain result, or report caller failure after a transaction has committed. Never pass the error, `meta`, message, SQL, identifiers, or financial values. |
 
 ## Data Flow
 
@@ -35,13 +35,13 @@
 
 ## Interfaces / Contracts
 
-The application-owned `MonthlyCycleTransactionRunner` remains unchanged. The infrastructure-private observer receives an immutable event containing only the four safe fields above. `run` and successful first-attempt `runSerializable` calls remain silent and behaviorally unchanged.
+The application-owned `MonthlyCycleTransactionRunner` remains unchanged. The infrastructure-private observer receives an immutable event containing only the four safe fields above. Each notification is best-effort and failure-isolated: it has no return-path influence on retry control flow, transaction completion, or caller-visible errors. `run` and successful first-attempt `runSerializable` calls remain silent and behaviorally unchanged.
 
 ## Testing Strategy
 
 | Layer | What to Test | Approach |
 |---|---|---|
-| Unit | Exact `P2010/meta.code=40001`; wrong/missing/nondirect metadata; mixed retry classes; success/exhaustion; fresh clients; safe events | Script fake `$transaction` attempts, use distinct transaction sentinels, assert Serializable options and original-error identity, and compare captured event keys/values exactly. |
+| Unit | Exact `P2010/meta.code=40001`; wrong/missing/nondirect metadata; mixed retry classes; success/exhaustion; fresh clients; safe events; observer failures during retry, recovered-after-commit, and exhaustion | Script fake `$transaction` attempts, use distinct transaction sentinels, assert Serializable options and original-error identity, and compare captured event keys/values exactly. Use a deterministic throwing observer for each telemetry outcome: retry failure must still start the next fresh attempt; recovered notification failure after commit must still return success; exhaustion notification failure must still throw the original `CONCURRENT_MODIFICATION` error. Assert the authoritative transaction/domain outcome and durable-effect counters exactly, so no observer failure invites a caller retry or duplicate effect. |
 | PostgreSQL integration — successful recovery | A qualifying first attempt rolls back after writing; a later fresh attempt succeeds with exactly one durable movement and one balance effect | Wrap the real Prisma `$transaction` deterministically: attempt 1 executes the complete strict deposit callback, then throws a structural `P2010` with `meta.code = "40001"` inside the transaction so Prisma rolls it back; attempt 2 reruns and commits. Assert two attempts, exactly one target movement, available money changes once from `0.30` to `0.10`, and the target pocket balance changes once from absent to `0.20`. This proves no duplicate or partial write survived the rolled-back attempt. |
 | PostgreSQL integration — close wins with no mutation | Close-first strict deposit returns `MONTH_NOT_ACTIVE` with closed state and unchanged balances/counts; every writer reports | Keep explicit lock barriers plus `readBlockedMonthMutation`. Use one fixture per writer, collect all 16 normalized outcomes, and assert only after the loop. In each `finally`, release every barrier, `Promise.allSettled` all started close/writer promises, then delete month and pocket; record cleanup failures rather than aborting later writers. This is the rejection path and intentionally expects zero new effects, unlike successful recovery. |
 | E2E | Not required | Public HTTP contracts do not change. |
```

---

## Judgment Day — Apply PR 1 — Round 1

Both blind judges completed one precision-gated sweep of the attributable Phase 1 implementation and independently reported an empty findings ledger.

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| — | — | — | — | — | No user-impacting defects found in tasks 1.1–1.5; focused suite independently passed 18/18 and architecture boundaries remained intact. |

- Confirmed findings: 0.
- Suspect findings: 0.
- Contradictions: 0.
- Fixes applied: 0.
- Skill resolution: `paths-injected`.
- Terminal state: `JUDGMENT: APPROVED`.
