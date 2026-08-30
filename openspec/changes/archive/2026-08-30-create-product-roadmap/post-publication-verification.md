# Post-publication Roadmap Surface Verification

## Documentary test contract — RED

Before the post-publication Notion operation, the following acceptance checks are intentionally unsatisfied:

1. The existing `Roadmap Review Draft — Not Canonical` is archived and remains visibly non-canonical.
2. A separate, refresher-owned `Canonical Roadmap Mirror` contains exactly one record for each canonical `RM-001`–`RM-029` initiative, pins Git commit `3e8a96d` / roadmap publication `2b77207`, and records a refresh timestamp.
3. A separate `Proposed Roadmap Changes` queue accepts only manual proposals with an existing RM ID or new intent, base commit/version, action, proposed values, rationale, and a visible lifecycle state.
4. Neither surface claims automatic synchronization, accepts edits as Git changes, or promotes a proposal to `Integrated` before explicit approval, Git publication, mirror refresh, and verification.

The pre-operation search found only the Draft database; it found neither a Canonical Roadmap Mirror nor a Proposed Roadmap Changes queue. This is the expected failing state for the contract above.

## Deterministic verification plan

After the operation, verify the exact database schemas and live row sets with Notion fetch/SQL reads. Verify the Git boundary with a static scan of `docs/product/roadmap.md` and `git diff --check`. Treat Notion unavailability as a failure of the refresh only: Git stays authoritative and proposals remain non-`Integrated`.

## GREEN evidence — 2026-08-29

| Check | Deterministic evidence | Result |
|---|---|---|
| Draft did not become canonical or falsely current | A fresh complete SQL read returned exactly 29 archive rows (`has_more = false`); every row, including RM-015, is `Draft State = Archived` and `Source State = Stale`. The retained `1E23…F26` pin identifies the historical review baseline, not the approved current `31138…3F5` proposal. | Pass |
| Separate canonical mirror | `collection://a88f5474-137b-4dc8-8ed4-1d6da0d161a4` contains exactly 29 unique `RM-001`–`RM-029` records, each with source commit `3e8a96d`, source version, refresh owner, date, and `Current` mirror state. | Pass |
| Separate proposal queue | `collection://595c1f43-4d06-4df8-886b-f587934236c9` is separate and empty by design. Its description and computed `Workflow Validation` expose the structural contract: title; exactly one of existing RM ID or new intent; base commit/version; action; proposed values; rationale; and state. `Intake Complete` is acknowledgement only; the formula does not use it to determine completeness. | Pass |
| Manual-only integration | The queue description, computed `Workflow Validation`, `Intake — Incomplete / Blocked`, `Conflict — Re-review Required`, and `Integrated — Evidence Required` views make the operating contract visible. The incomplete view filters the formula’s `Blocked — intake incomplete` result, so checking `Intake Complete` cannot remove an incomplete record. An `Integrated` record is structurally flagged unless `Integration Gate = Verified` and `Integration Evidence` is non-empty; a maintainer must still assess that evidence for approval, Git publication, mirror refresh from that commit, and verification. Notion does not enforce required fields, evidence quality, or transitions, so an editor can still select a state and must correct any formula-blocked record to non-`Integrated`. | Pass with stated Notion limitation |
| Stale/outage behavior | Static documentation requires stale bases to remain `Pending` or become `Conflict`, and requires a failed refresh/outage to leave Git usable, the mirror visibly stale, and proposals non-`Integrated`. | Pass |

### Scenario matrix

| Scenario | Expected fail-closed outcome |
|---|---|
| Git advances beyond a proposal base or changes the same RM ID | Keep the proposal `Pending` for explicit re-review or set `Conflict`; never silently rebase or apply it. |
| `rename` or `delete` proposal | Preserve the stable RM ID, lifecycle, and history through approved Git work. |
| `new` proposal | Keep it as new intent; assign an RM ID only through approved Git work. |
| Mirror refresh fails or Notion is unavailable | Git remains usable and canonical; mark the mirror stale on the next observable refresh attempt; do not set any proposal `Integrated`. |
| A direct Mirror edit occurs | It is not a Git edit and is overwritten by the next requested refresh; the queue remains the proposal path. |

## Refactor

The Mirror schema groups canonical roadmap content, refresh provenance, and edit policy in one readable record. The queue contains only proposal-intake fields, avoiding the ambiguous Draft-to-canonical promotion that this change removes.

## Proposal queue operating contract

Notion is a manual intake surface, not a workflow engine. It has no supported property-requiredness or state-transition guard in this database. `Workflow Validation` is the platform-supported computed representation of the structural rule; it makes violations visible but does not block an editor. The contract is therefore fail-closed operationally:

1. `Workflow Validation` returns `Blocked — intake incomplete` until a proposal has a title, exactly one of `Existing RM ID` or `New Intent`, `Base Commit`, `Base Version`, `Action`, `Proposed Values`, `Rationale`, and `State`. `Intake Complete` is acknowledgement only and cannot change that result.
2. Compare the base commit/version with current Git before review. A stale base remains `Pending` for explicit re-review or becomes `Conflict`; it is never silently rebased.
3. For `State = Integrated`, `Workflow Validation` returns `Integrated — evidence recorded` only when the intake rule passes, `Integration Gate = Verified`, and `Integration Evidence` is non-empty. A maintainer must verify that the evidence substantively records approval, the published Git commit, successful Mirror refresh from that commit, and verification.
4. An editor can technically select available properties, including `Integrated`; this does not enforce integration or validate evidence quality. Any `Blocked — intake incomplete` or `Blocked — integration evidence` result must be corrected to a non-`Integrated` state. No automatic synchronization or Git change is created by this queue.
