# Product Roadmap

This is AppFinanzas' canonical, Git-owned product roadmap. It describes product outcomes and decision boundaries, not implementation tasks, estimates, or an execution tracker. A capability is complete only when it supports a stable, understandable end-to-end daily workflow; a route, module, API, or merged SDD alone is evidence, not proof of completion.

## Publication record

| Field | Value |
|---|---|
| Canonical authority | This Git document |
| Published from | `openspec/changes/create-product-roadmap/priority-horizon-proposal.md` |
| Initial approved source commit/version | `e5bbe3d` (PR #179 merge into `dev`) |
| Approved source SHA-256 | `31138F924F0FDB6DDC1E5D6DF2C50BAF694D167161E3AF5348E7012F93DAA3F5` |
| Current canonical source commit/version | `b1acbc1` (`docs/product/roadmap.md`; RM-012-first reprioritization merged into `dev`) |
| Approved review snapshot | 29 IDs (`RM-001`–`RM-029`); Notion revision `UNAVAILABLE`; digest `8118B4702EC650B42CF2FB7CD9A0F3EE90580DCAADEF6A8D287EF66C0BA3CE52` |
| Publication rule | Fail closed: publication is invalid unless the current source bytes match the approved SHA-256 exactly. |

The approved source was re-read before publication. Any source/hash, review row-set, source-state, digest, or available-revision mismatch requires a new reconciliation and explicit approval; it must not be silently republished.

## How to read this roadmap

- **Status** is the lifecycle classification: `shipped`, `unfinished`, `quality/debt`, `idea`, or `deferred`.
- **Horizon** is a dependency-and-value band, never a date: `Now`, `Next`, `Later`, `Explore`, `Future-only`, or `Shipped`.
- **Completion evidence** is deliberately bounded. It never converts technical presence into a claim of universal product completion.
- **Provenance** preserves repository, OpenSpec, Git, Engram, and maintainer evidence so future changes can be reconciled rather than guessed.

## Now — accepted, dependency-resolved workflows

| ID | Outcome | Scope / non-goals | Status / horizon | Dependencies and rationale | Completion evidence / provenance |
|---|---|---|---|---|---|
| RM-012 | Prevent retried financial CREATE requests from producing duplicate movements. | Request-level CREATE protection only; excludes transactions and blanket PATCH/DELETE idempotency. | `unfinished` / `Now` (1) | A bounded integrity safeguard for safe daily use; protects existing and future money-moving workflows. No hard technical dependency on RM-026 has been established. | Duplicate-risk evidence only; no completion claim. `C-12`; `engram:#2404`; `maintainer:2026-08-30`. |
| RM-026 | Record an expense without category or subcategory while preserving truthful monthly totals and an `Uncategorized` display. | Category/subcategory are optional; later categorization is optional; an expense may remain uncategorized indefinitely, including after close. Budget and broader analytics treatment require focused design. | `unfinished` / `Now` (2) | Depends on RM-001 and maintainer-accepted accounting semantics. It removes a daily recording barrier after the minimum integrity safeguard. | No implementation completion claim. `C-29`; `maintainer:2026-08-23,2026-08-25`; reconciled review evidence. Publication does **not** authorize application code. |

RM-026 publication does **not** authorize application code. Its focused implementation remains a separate future SDD.

## Next — correctness, current experience, and reporting closure

| ID | Outcome | Scope / non-goals | Status / horizon | Dependencies and rationale | Completion evidence / provenance |
|---|---|---|---|---|---|
| RM-009 | Preserve browseable, addressable credit-card statement history for reconciliation and payment linkage. | Stable identity/history policy; a rolling summary is not an audit trail. | `unfinished` / `Next` (1) | Must define later-edit reconciliation and focused identity/history design; precedes RM-010. | Current endpoint is a rolling snapshot. `C-10`; `docs/product/technical-debt.md`; `engram:#1198`. |
| RM-010 | Track full or partial payment of closed statements without double-counting consumption. | Statement-level payment semantics only; no inferred payments from balance changes. | `unfinished` / `Next` (2) | Depends on RM-009 stable history and financial-correctness rules. | No implementation found. `C-09`; `docs/product/technical-debt.md`. |
| RM-021 | Make money entry formatting, zero/placeholder behavior, and stepper behavior consistent. | No prescribed shared component, locale, validation policy, or visual redesign. | `unfinished` / `Next` (3) | Requires a money-entry surface inventory and focused evidence that validation and decimal semantics remain preserved. | No completion claim. `C-21`; `maintainer:2026-08-23`. |
| RM-024 | Protect users from accidental destructive loss where the risk warrants confirmation. | No global confirmation pattern; action inventory, thresholds, language, and undo alternatives remain open. | `unfinished` / `Next` (4) | Depends on product-specific action inventory and consequences. | No completion claim. `C-27`; `maintainer:2026-08-23`. |
| RM-023 | Restrict subcategory choices to the selected category. | Excludes taxonomy management and grouped presentation; edit, migration, and empty states remain open. | `unfinished` / `Next` (5) | Depends on authoritative relationships and preservation of historic records. | No completion claim. `C-26`; `maintainer:2026-08-23`. |
| RM-006 | Reduce category/subcategory and income information overload through grouped organization. | Does not choose wrappers, defaults, persistence, or selection/filtering behavior. | `unfinished` / `Next` (6) | Needs a presentation-surface inventory; remains distinct from RM-022/RM-023. | No completion claim. `C-22`, merged `C-23`; `maintainer:2026-08-23`. |
| RM-013 | Establish accessibility, responsiveness, coverage, lint, and assertion-quality evidence. | Safeguard group only; later work may split it. | `quality/debt` / `Next` (7) | Supports every user-facing initiative; relevant evidence gaps and a focused plan must resolve before `Now`. | Selected browser evidence exists; broader quality evidence is open. `C-13`; `engram:#11`. |
| RM-019 | Provide a bounded comparison/reporting capability across distinct months. | Excludes claims that active-month reporting is incomplete and excludes PDF export. | `unfinished` / `Next` (8) | Depends on RM-001 and a maintainer-defined comparison outcome; comes before automation. | Current reports are active-month only. `C-19`; product plans and current report paths. |

## Later — established-workflow automation and broader interaction work

| ID | Outcome | Scope / non-goals | Status / horizon | Dependencies and rationale | Completion evidence / provenance |
|---|---|---|---|---|---|
| RM-007 | Make pocket allocation and completed-goal excess handling predictable. | Excludes RM-008 closeout behavior. | `unfinished` / `Later` (1) | Depends on RM-001 and pocket movement semantics; follows correctness and reporting closure. | Manual funding exists; complete automation does not. `C-06`; product plans and Git history. |
| RM-008 | Give users a deliberate option to zero out surplus at close. | Zero-out choice only; no allocation redesign. | `unfinished` / `Later` (2) | Depends on RM-001 closing behavior; related to but independent from RM-007. | No explicit zero-out outcome evidenced. `C-07`; product plans. |
| RM-005 | Eliminate repeated manual entry for fixed/recurring income and expenses. | Frequency, timing, edits, pause/resume, deletion, lifecycle, and posting policy require a dedicated SDD. | `unfinished` / `Later` (3) | Depends on RM-001 and future lifecycle policy decisions. | No recurring implementation claim. `C-24`, merged `C-04/C-05`; maintainer and product evidence. |
| RM-022 | Make movements easier to understand through clearer category/subcategory organization. | No chosen interaction model, navigation, filtering, grouping, or implementation approach. | `unfinished` / `Later` (4) | Depends on later movements-workflow exploration; distinct from RM-006/RM-023 and the holistic audit. | No completion claim. `C-25`; `maintainer:2026-08-23`. |

## Explore — non-committed decisions and ideas

| ID | Outcome | Scope / non-goals | Status / horizon | Dependencies and rationale | Completion evidence / provenance |
|---|---|---|---|---|---|
| RM-011 | Decide whether and how debt payments affect cash, available money, and monthly movements. | No integration design or claim that independent debt tracking is incomplete. | `idea` / `Explore` (1) | Requires an explicit money-meaning decision after RM-001 semantics. | Independent debt behavior exists; integration is not evidenced. `C-11`; product plans. |
| RM-014 | Decide identity and privacy boundaries for the intentional single-user model. | Decision gate only; not authentication implementation. | `idea` / `Explore` (2) | Prerequisite for reliable RM-015/RM-016 scope. | No decision completion evidence. `C-14`; `PRODUCT.md`; product plans. |
| RM-015 | Define a portable or recoverable personal-data capability after ownership decisions. | Excludes PDF export, off-device backup, and production-recovery implementation. | `deferred` / `Explore` (3) | Depends on RM-014 plus data/privacy and restore decisions. | No backup/export completion evidence. `C-15`; product plans. |
| RM-016 | Consider multi-user capability if personal-use needs change. | Does not authorize identity architecture or growth work. | `idea` / `Explore` (4) | Depends on RM-014; conflicts with present personal-use focus. | No completion claim. `C-16`; product plans. |
| RM-017 | Explore bank integration after value, provider, synchronization, and ownership boundaries are chosen. | No provider or synchronization design. | `idea` / `Explore` (5) | Depends on RM-014 and privacy/data ownership decisions. | No implementation evidence. `C-17`; product plans. |
| RM-020 | Explore a bounded, shareable or printable PDF report. | PDF only; excludes backup, raw-data portability, restore, storage, and unchosen policy. | `idea` / `Explore` (6) | Depends on defined report scope and relevant RM-014 decisions. | Current reports provide no PDF-export evidence. `C-20`. |
| RM-025 | Decide reliable money meaning for withdrawing funds from a pocket. | Does not decide cash, available-money, transfer, or expense treatment. | `idea` / `Explore` (7) | Depends on RM-001 and existing pocket movement semantics; decision precedes implementation. | No completion claim. `C-28`; `maintainer:2026-08-23`. |
| RM-027 | Explore a coherent UI program beginning with a screen-by-screen audit. | No redesign, visual direction, component solution, or absorption of concrete UX work. | `idea` / `Explore` (9) | Depends on future audit and primary-workflow evidence; remains distinct from RM-021–RM-024. | No completion claim. `C-30`; `maintainer:2026-08-23`; `engram:#2588`. |
| RM-028 | Explore meaningful financial-threshold notifications. | Threshold formulas, events, channel, scheduling, provider, persistence, and implementation are unchosen. | `idea` / `Explore` (10) | Requires maintainer decisions on trustworthy thresholds, triggers, and channels. | No completion claim. `C-31`; `maintainer:2026-08-24`. |
| RM-029 | Decide a personal deployment path before selecting an operating environment. | No hosting, provider, topology, credentials, automation, procedures, or implementation selection. | `idea` / `Explore` (11) | Depends on ownership, privacy, security, support, and recovery decisions; does not promote RM-018. | No completion claim. `C-32`; `maintainer:2026-08-24`. |

## Future-only — production recovery boundary

| ID | Outcome | Scope / non-goals | Status / horizon | Dependencies and rationale | Completion evidence / provenance |
|---|---|---|---|---|---|
| RM-018 | Preserve the future acceptance gate for safe, local, auditable production recovery. | Excludes implementation, ordinary prioritization, backup automation, and revival of withdrawn recovery-lock work. | `deferred` / `Future-only` (1) | A future explicit maintainer decision must verify every safeguard below. | Guarded local reset at `HEAD` is only a baseline; no recovery completion claim. `C-18`; recovery OpenSpec evidence; Git `22cf238`; `engram:#2562`. |

RM-018 cannot leave `Future-only` until all six safeguards are verified:

1. Shared cross-checkout lock identity.
2. Atomic legacy/replacement lock interoperability.
3. Destructive-stage source-drift detection, including live migration inputs.
4. Owner-identifiable safe manual recovery for orphaned locks.
5. Rollback compatibility with replacement locks.
6. Preservation of the primary reset failure when release also fails.

## Shipped — bounded baselines, not substitute completion claims

| ID | Outcome | Scope / non-goals | Status / horizon | Dependencies and rationale | Completion evidence / provenance |
|---|---|---|---|---|---|
| RM-001 | Maintain the current-month availability baseline for the daily financial loop. | Single-user month lifecycle only; excludes multi-user, recovery, and downstream completion claims. | `shipped` / `Shipped` (1) | Foundation for financial-core work; no initiative dependency. | Active Month supports named income, expense, cash, pocket, budget, and closing flows. `C-01`; `PRODUCT.md`; Active Month page; `engram:#2562`. |
| RM-002 | Expose active-month spending, surplus, and deficit information. | Active-month summary/ranked subcategories only; excludes cross-month comparison and PDF export. | `shipped` / `Shipped` (2) | Depends on RM-001; preserves RM-019/RM-020 as separate outcomes. | Current reports page, mapper, and route support the bounded surface. `C-02`; Reports paths; Git `3c8181a,82be477`. |
| RM-003 | Help the user understand available money through the Active Month decision surface. | Baseline only; excludes notifications, reports, and universal workflow visibility. | `shipped` / `Shipped` (3) | Depends on RM-001; UX improvements remain independent. | Active Month shows budget-used, spent, income, available money, and cash. `C-03`; `PRODUCT.md`; Active Month page; `engram:#1449`. |
| RM-004 | Distinguish payable closed-statement debt from new-cycle spending. | Read-only period clarity; excludes payment tracking and history. | `shipped` / `Shipped` (4) | Depends on statement API and RM-001 expense linkage; RM-009/RM-010 remain open. | Credit-card UI renders closed/in-progress periods. `C-08`; Credit Cards page; Git `92cf906`; technical debt record. |

## Traceability, recovery, and manual boundaries

The primary traceability record is the initial approved source proposal plus `initiative-classification.md`, `reconciliation.md`, `notion-review-draft-manifest.md`, the product documents cited in each initiative, initial publication merge commit `e5bbe3d`, RM-012-first reprioritization commit `b1acbc1`, and the active Engram evidence referenced above. Stable RM IDs are never renumbered; rename/delete decisions preserve their identity, lifecycle, and history. New intent receives an ID only through later approved Git work.

Git remains usable if Notion is unavailable. The pre-publication **Roadmap Review Draft — Archived / Not Canonical** is retained as review evidence only; it was never promoted. The separate **Canonical Roadmap Mirror** is refresher-owned and reflects this published Git version. The separate **Proposed Roadmap Changes** queue is the only Notion intake surface for future intent. Neither is authoritative or an edit path to Git.

## Manual mirror refresh and proposal reconciliation

### Quick path

1. A roadmap refresher compares `docs/product/roadmap.md` with the Mirror and refreshes the records from the selected Git commit.
2. A contributor records proposed intent in the separate Proposed Roadmap Changes queue using its required base commit/version and action.
3. The maintainer requests manual reconciliation. Only approved Git publication, a successful mirror refresh, and verification may set a proposal to `Integrated`.

| Surface | Role | Edit rule |
|---|---|---|
| Git roadmap | Sole canonical authority | Changes require normal Git/SDD review and publication. |
| Canonical Roadmap Mirror | Refresher-owned reference | Direct edits are overwritten by the next requested refresh; submit intent to the queue instead. |
| Proposed Roadmap Changes | Manual proposal intake | `Pending`, `Conflict`, `Integrated`, and `Rejected` are visible states; it cannot change Git itself. |
| Archived Review Draft | Historical review evidence | Non-canonical; never reused as the Mirror or proposal queue. |

Manual reconciliation is maintainer-requested. No automatic synchronization is permitted: webhooks, polling, bot commits, bidirectional synchronization, hidden last-write-wins, and silent rebase are prohibited. A later proposal must carry an existing RM ID or new intent, base commit/version, explicit `change`, `new`, `rename`, or `delete` action, proposed values, rationale, and visible state. A stale base stays `Pending` for explicit re-review or becomes `Conflict`; it is never auto-applied or rebased. Rename/delete preserves the stable RM ID, lifecycle, and history; new intent gets an RM ID only through approved Git work.

## Decision history

| Date | Decision | Evidence |
|---|---|---|
| 2026-08-24 | Created the reconciled initiative set, stable RM IDs, and initially unapproved horizon proposal. | `reconciliation.md`; `initiative-classification.md`; priority proposal; review ledger. |
| 2026-08-25 | Reconciled the sole authorized review delta: RM-026 became `unfinished` / `Now` sequence 1 after its optional-classification, totals, display, later-categorization, and month-close semantics were accepted. | `reconciliation.md`; `notion-review-draft-manifest.md`; `initiative-classification.md`; `priority-horizon-proposal.md`. |
| 2026-08-26 | Maintainer explicitly approved the pinned 29-ID proposal for canonical publication. | `notion-review-draft-manifest.md`; approved hash and digest in this publication record. |
| 2026-08-26 | Published this Git-canonical roadmap from the exact approved source hash. | `publication-verification.md`; merge commit `e5bbe3d`; this document. |
| 2026-08-29 | Archived the Review Draft, then created the separate refresher-owned Mirror from this Git roadmap and the separate manual Proposed Roadmap Changes queue. | `post-publication-verification.md`; recorded Notion surface IDs. |
| 2026-08-30 | Reprioritized RM-012 to `unfinished` / `Now` sequence 1 and RM-026 to sequence 2. RM-012 has no established hard technical dependency on RM-026; duplicate-mutation protection is the minimum safeguard for safe daily use. | Approved proposal `3cc9940c-26cb-814f-b183-ee5a59fbbd7b`; Git-canonical commit `b1acbc1` merged into `dev`; maintainer rationale. |
