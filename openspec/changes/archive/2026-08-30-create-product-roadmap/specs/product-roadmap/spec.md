# Product Roadmap Specification

## Purpose

Define an evidence-governed, Git-canonical roadmap for trustworthy personal-use financial workflows and safe manual Notion collaboration.

## Requirements

### Requirement: Evidence-Governed Roadmap

The roadmap MUST derive candidates from current repository behavior, OpenSpec, Git, product documents, and active Engram evidence. Every accepted initiative MUST record problem, outcome, scope/non-goals, status, horizon, dependencies, rationale, completion evidence, and provenance. Completion MUST mean stable end-to-end use, not technical presence.

#### Scenario: Incomplete or contradictory evidence
- GIVEN evidence is incomplete, contradictory, duplicated, or historical
- WHEN the maintainer reviews a candidate
- THEN sources are preserved, the candidate remains unprioritized or `decision needed`, and completion is not inferred

#### Scenario: Accepted candidate
- GIVEN a candidate has required fields and verifiable evidence
- WHEN the maintainer accepts it
- THEN it becomes eligible for reconciliation and prioritization

### Requirement: Safe Lifecycle and Prioritization

The roadmap MUST preserve explicit lifecycle decisions, prior provenance, append-only history, and current evidence. It MUST prioritize correctness, active-month/reporting closure, then automation; unresolved work MUST NOT enter `Now`. Production recovery MUST remain `deferred`/`Future-only` until all six C-18 safeguards are satisfied.

#### Scenario: Deferred or recovery work is reconsidered
- GIVEN deferred work or production recovery is proposed for near-term commitment
- WHEN it is reviewed
- THEN refreshed dependencies, explicit maintainer approval, and all applicable safety gates are required; prior history is retained

### Requirement: Git Canonical Roadmap and Mirror

Git MUST remain authoritative and independently usable. A pre-publication Notion Roadmap Review Draft MAY be created for review, but MUST be visibly `NON-CANONICAL — DRAFT/UNAPPROVED`, distinct from both the post-publication Canonical Roadmap Mirror and Proposed Roadmap Changes queue, and MUST NOT be an authority or automatic synchronization surface. The draft MUST pin the exact source proposal version/path, source hash, and generation timestamp. The Canonical Roadmap Mirror MUST be refresher-owned, contain one record per canonical RM ID, identify source commit/version and last refresh, and MUST NOT be the proposal-edit surface.

#### Scenario: Review draft is distinct from canonical surfaces
- GIVEN the priority proposal is pending approval
- WHEN a Notion review page is created
- THEN it is labeled Draft/Unapproved, non-canonical, source-pinned, and separate from the mirror and proposal queue

#### Scenario: Publication does not promote the draft silently
- GIVEN the roadmap is published
- WHEN the canonical mirror is created or refreshed
- THEN the draft is archived or explicitly refreshed/transformed, and never silently becomes canonical

#### Scenario: Initial mirror refresh
- GIVEN the approved canonical roadmap is published
- WHEN a requested refresh succeeds
- THEN Notion contains separate mirror records reflecting that Git commit and refresh time

#### Scenario: Direct mirror edit
- GIVEN a user edits mirror fields or attempts to submit a proposal through the mirror
- WHEN the edit is processed
- THEN it is rejected or overwritten on refresh, and Git is unchanged

### Requirement: Proposed Changes and Manual Reconciliation

Proposed Roadmap Changes MUST be separate editable records containing existing RM ID or new intent, base commit/version, explicit action (`change`, `new`, `rename`, `delete`), proposed values, rationale, and state `Pending`, `Conflict`, `Integrated`, or `Rejected`. Reconciliation MUST be maintainer-requested and manual. Webhooks, polling, bot commits, bidirectional automatic sync, hidden last-write-wins, and silent rebase are prohibited.

#### Scenario: Stale or conflicting proposal
- GIVEN Git advanced beyond a proposal base or changed the same initiative
- WHEN reconciliation is requested
- THEN the proposal remains `Pending` for explicit re-review or becomes `Conflict`; it is never auto-applied or rebased

#### Scenario: Rename, delete, or new initiative
- GIVEN a proposal requests rename/delete or proposes new intent
- WHEN it is recorded
- THEN rename/delete preserves the stable RM ID, lifecycle, and history; new intent receives an RM ID only through approved Git work

### Requirement: Fail-Closed Review Draft Classification

The Review Draft MUST import immutable classified lifecycle status for every RM-001–RM-029 record and expose `Current|Stale` source state. Imported status MUST NOT be editable. Review horizon, sequence, rationale, decision, and notes MUST be editable only as deltas against imported values. Reconciliation MUST validate the complete status/horizon matrix: `shipped→Shipped`; `unfinished` and `quality/debt→Later|Next|Now` with accepted scope, resolved prerequisites, and sufficient focused evidence for `Now`; `idea→Explore`; `deferred→Explore|Future-only`. Invalid pairs, unsupported `Shipped`, and unresolved `Now` moves MUST fail closed. RM-018/C-18 MUST remain `deferred`/`Future-only` until all six safeguards hold. RM-026 MAY be flagged `Maintainer-important`, but the flag MUST NOT promote it.

#### Scenario: Invalid board move
- GIVEN a draft record has immutable status `idea`, `deferred`, or unresolved `unfinished`
- WHEN a reviewer proposes `Now`, `Shipped`, or an invalid horizon
- THEN reconciliation returns a visible error/conflict and cannot approve or publish it

#### Scenario: Review views expose deltas
- GIVEN review fields contain imported and proposed values
- WHEN the draft is viewed
- THEN Now/Next/Later/Explore/Future-only/Shipped and requested-changes views expose status, deltas, and notes without changing canonical data

### Requirement: Snapshot-Gated Approval and Publication

Reconciliation MUST capture the exact Notion revision, deterministic delta digest (RM IDs ascending, field names/values including empties), source proposal hash, and resulting reconciled proposal hash. Immediately before approval it MUST re-read the source and all digest-covered Notion fields. Approval MUST pin source hash, Notion revision/digest snapshot, and reconciled proposal hash; publication MUST match the approved hash exactly. Newer edits or any mismatch MUST return `Pending` or `Conflict` and require reconciliation again.

#### Scenario: Stale review edit
- GIVEN a reviewer edits the draft after reconciliation
- WHEN approval or publication is attempted
- THEN the final re-read detects the revision/digest mismatch, blocks the action, and requires reconciliation

#### Scenario: Approved hash is enforced
- GIVEN approval pins the source, Notion snapshot, and reconciled proposal hashes
- WHEN publication is requested
- THEN publication succeeds only for the exact approved reconciled hash

#### Scenario: Notion outage
- GIVEN Notion is unavailable during draft review or reconciliation
- WHEN Git/SDD work continues
- THEN Git/SDD remains usable, no approval or canonical claim is fabricated, and the disposable draft can be recreated from its pinned source

### Requirement: Integration and Failure Visibility

A proposal MAY become `Integrated` only after maintainer/SDD approval, canonical Git update, successful mirror refresh from that commit, and verification. Refresh or Notion failures MUST leave proposals non-`Integrated`, preserve Git usability and authority, and visibly retain mirror staleness without claiming current synchronization.

#### Scenario: Successful integration
- GIVEN a non-conflicting proposal has approval
- WHEN Git is updated, the mirror refresh succeeds, and verification passes
- THEN the proposal becomes `Integrated` and records the refreshed commit/version

#### Scenario: Refresh failure or Notion outage
- GIVEN an approved Git update exists but refresh fails or Notion is unavailable
- WHEN reconciliation completes
- THEN Git remains usable, the proposal is not `Integrated`, and the mirror visibly remains stale
