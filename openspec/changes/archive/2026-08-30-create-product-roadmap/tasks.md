# Tasks: Create Product Roadmap

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 700–920 lines including draft review, reconciliation, mirror, queue, tests, and docs |
| 400-line budget risk | High; materially exceeds the approved 500–740-line single-PR exception |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: draft/reconciliation; PR 2: canonical publication/mirror/queue; PR 3: verification/docs |
| Delivery strategy | auto-chain; maintainer resolved sequential slices to `dev` |
| Chain strategy | stacked-to-main; PR 1 targets `dev`, later slices target the immediately preceding delivery branch |

Decision needed before apply: No — resolved by maintainer as sequential chained delivery to `dev`
Chained PRs recommended: Yes
Chain strategy: stacked-to-main (sequential PRs to `dev`)
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Notion draft review and proposal reconciliation | PR 1 | Base: current branch; source-pinned, manual, independently verifiable |
| 2 | Approved Git publication and post-publication Notion surfaces | PR 2 | Depends on PR 1; canonical roadmap, archive, mirror, queue |
| 3 | Failure verification and documentation | PR 3 | Depends on PR 2; outage, stale, lifecycle, and no-automation evidence |

## Phase 1: Evidence and Candidate Inventory

- [x] 1.1 Inspect repository behavior, OpenSpec, git/PRs, product docs, and active Engram; record each candidate’s sources and current interpretation in the pre-checkpoint candidate inventory.
- [x] 1.2 Add a bounded candidate queue exposing candidate, sources, interpretation, conflicts, duplicates, and suggested disposition; mark inventory non-exhaustive and verify every required intake field.
- [x] 1.3 Include production recovery as `deferred`/`Future-only` with all six historical safeguards and a `decision needed` flag if any gate is unverifiable.

## Phase 2: HARD Maintainer Checkpoint

- [x] 2.1 Present the readable candidate inventory for maintainer review; capture explicit acceptance, merge, retirement, shipped, or `decision needed` dispositions in the reconciliation history.
- [x] 2.2 Capture maintainer-added capabilities in the same queue with problem, outcome, scope/non-goals, dependencies, rationale, and dated `maintainer:<date>` provenance; do not proceed as implicitly approved.

### Checkpoint evidence — 2026-08-24

- C-21 through C-30 preserve the ten maintainer-provided new-intent additions with `maintainer:2026-08-23` provenance; C-31 financial-threshold notifications and C-32 personal deployment decision are complete new candidate records with `maintainer:2026-08-24` provenance.
- Every candidate C-01 through C-32 has an explicit 2026-08-24 maintainer disposition in the candidate overview, candidate details, reconciliation notes, and HARD Maintainer Checkpoint history.
- C-04 and C-05 are merged into accepted C-24 without losing expense or income outcomes; C-23 is merged into accepted C-22 as one information-overload initiative without losing either source intent.
- C-30 remains a separate exploratory screen-by-screen audit and does not absorb the concrete accepted UX candidates.
- **HARD Maintainer Checkpoint is complete:** task 2.1 is checked. This closes dispositions only; tasks 3.1–3.3 remain pending, and no priority, final horizon, roadmap status, `RM-###` ID, or `docs/product/roadmap.md` publication has been created.
- Production recovery remains deferred / Future-only with all six safeguards unchanged.

## Phase 3: Reconciliation and Prioritization

- [x] 3.1 Reconcile duplicates, obsolete items, completed outcomes, and contradictory evidence; preserve sources and leave unresolved conflicts unprioritized. See `reconciliation.md` (2026-08-24); no IDs, status/horizon pairs, or priority were assigned.
- [x] 3.2 Assign stable `RM-###` IDs and valid status/horizon pairs before any Notion work; add rationale, dependencies, completion evidence, provenance, and dated decision history without implying completion from technical presence. See `initiative-classification.md` (2026-08-24); no priority ordering, canonical publication, or Notion fields were created.
- [x] 3.3 Produce the unapproved priority/horizon proposal for maintainer review: correctness, active-month/reporting closure, automation, then expansion; keep unresolved work out of `Now` and identity, privacy, backup/export, deployment, multiuser, and recovery gates later or exploratory. Judgment Day Fix Round 1 keeps only RM-012 in `Now`, moves RM-009/RM-021 to `Next` pending stated promotion evidence, and puts RM-019 before automation. See `priority-horizon-proposal.md` and `review-ledger.md` (2026-08-24); task completion records proposal generation only, maintainer approval and scoped re-judgment remain pending, and no canonical publication was performed.

## Phase 4: Pre-publication Notion Roadmap Review Draft

- [x] 4.1 Capture `priority-horizon-proposal.md` source version/path and exact SHA-256 (`1E23E7E7E293D2D6A4A50BA8B94A6620871A786E7CBDDE5B65BB71E80AB98F26`); create a clearly Draft/Unapproved, non-canonical review database/page with immutable classification and editable delta fields. Creation evidence is recorded in `notion-review-draft-manifest.md`.
- [x] 4.2 Populate RM-001–RM-029 from the unapproved proposal; flag RM-026 `Maintainer-important` without promotion and create Now/Next/Later/Explore/Future-only/Shipped/requested-changes views. Fresh SQL/fetch evidence confirms 29 unique, pinned, Draft/Unapproved and Current rows.
- [x] 4.3 Record initial post-creation validation: database ancestry, exact row/page set, required view IDs, source pin, default review fields, and RM-026 non-promotion evidence. This is passive creation validation only; it is not reconciliation or approval.
- [x] 4.4 Before reconciliation, verify fail-closed invalid lifecycle moves, stale source/version visibility, and outage/recreation behavior; prohibit automation, sync, and canonical claims. Documentary/external verification is recorded in `notion-review-draft-manifest.md` (2026-08-26); a fresh 29-row source-pin/lifecycle/digest read passed, no invalid row was mutated, and no canonical claim was made.

## Phase 5: Maintainer Reconciliation and Approval

- [x] 5.1 Collect the complete fresh review snapshot, Notion revision availability, and deterministic digest; reconcile the authorized RM-026 delta into `priority-horizon-proposal.md` only after Git reclassification resolves its lifecycle gate. Record the source/reconciled hashes and retain the final approval re-read/pin for task 5.2; no approval, publication, sync, or RM-026 application implementation is authorized. See `notion-review-draft-manifest.md` (2026-08-27).
- [x] 5.2 Require explicit maintainer priority approval before proceeding; block approval/publication on source, revision, or digest mismatch. Final source/hash and complete digest-covered Notion re-read passed; explicit maintainer approval is pinned in `notion-review-draft-manifest.md` (2026-08-26). No publication occurred in this PR 1 boundary.

## Phase 6: Canonical Publication and Post-publication Surfaces

- [x] 6.1 Publish and verify approved initiatives in `docs/product/roadmap.md`; record the source commit/version and validate required fields, dependencies, traceability, no task-tracker data, recovery safeguards, and history. Source pin `31138F924F0FDB6DDC1E5D6DF2C50BAF694D167161E3AF5348E7012F93DAA3F5` and 29-ID digest `8118B4702EC650B42CF2FB7CD9A0F3EE90580DCAADEF6A8D287EF66C0BA3CE52` passed documentary/static verification; see `publication-verification.md`.
- [x] 6.2 Archive the Review Draft as non-canonical historical evidence and mark all 29 obsolete `1E23…F26` source pins `Stale`; create the separate refresher-owned Canonical Roadmap Mirror from `docs/product/roadmap.md`. See `post-publication-verification.md`.
- [x] 6.3 Establish the separate Proposed Roadmap Changes queue with the visible manual completeness and integration-evidence contract. `Workflow Validation` computes structural completeness independently of the acknowledgement-only `Intake Complete` checkbox, while Notion does not enforce requiredness, evidence quality, or state transitions; formula-blocked or unsupported `Integrated` records must be corrected to non-`Integrated`. The queue intentionally starts empty because no new proposal exists; it is never populated from the archived draft. See `post-publication-verification.md`.

## Phase 7: Reconciliation Verification and Documentation

- [x] 7.1 Verify stale-base conflicts, manual integration prerequisites, refresh/outage visibility, rename/delete/new actions, and no false-current claim in the deterministic scenario matrix in `post-publication-verification.md`.
- [x] 7.2 Verify Git remains usable without Notion and no automatic sync/webhook/polling/bot commit exists; document the maintainer-requested manual refresh/reconciliation workflow in `docs/product/roadmap.md`.
- [x] 7.3 Record final Notion IDs/URLs, review evidence, the Notion enforcement limitation, and proposal-queue operating rules without secrets in `notion-review-draft-manifest.md` and `post-publication-verification.md`.
