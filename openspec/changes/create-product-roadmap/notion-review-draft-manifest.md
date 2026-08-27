# Roadmap Review Draft — Not Canonical: Creation Manifest

This manifest is the exact pre-publication payload and creation evidence for a disposable Notion review surface. The Review Draft database, its 29 rows, and its seven required review views were created and fresh-read successfully. Task 5.1 reconciliation and task 5.2 explicit approval are complete and pinned in Git/SDD evidence, but the draft remains **NON-CANONICAL — DRAFT/UNAPPROVED**: canonical roadmap publication, post-publication Notion mirror/queue/synchronization, application implementation, commit, push, or PR remain excluded/pending for this slice.

## Quick path for the authorized Notion operator

1. Create the database with the title and schema below; do not reuse or rename a Canonical Roadmap Mirror or Proposed Roadmap Changes queue.
2. Populate the 29 rows exactly as listed, then create the seven review views.
3. Use the recorded fresh-read evidence below for the creation snapshot. Before reconciliation, approval, or publication, perform a new fresh read and re-compute the digest; never treat this creation snapshot as an approval snapshot.

## Source pin and lifecycle boundary

| Field | Exact value |
|---|---|
| Database title | `Roadmap Review Draft — Not Canonical` |
| Visible database description | `NON-CANONICAL — DRAFT/UNAPPROVED. Review-only rendering of the pinned Git/SDD proposal; it does not approve, publish, sync, or change the canonical roadmap.` |
| Source path | `openspec/changes/create-product-roadmap/priority-horizon-proposal.md` |
| Source version | `working-tree blob 559d1111e7990519f7979a4cbc083ff7231b43d7` |
| Source SHA-256 | `1E23E7E7E293D2D6A4A50BA8B94A6620871A786E7CBDDE5B65BB71E80AB98F26` |
| Manifest generated/refreshed | `2026-08-25T20:29:33.1147844-05:00` |
| Source state at manifest generation | `Current` |
| Canonical authority | Git/SDD only; this draft is disposable and has no synchronization authority. |
| Approval state | `Draft/Unapproved` |

The SHA-256 above was recomputed from the current bytes of the source file during this slice. The source file is untracked in the current Git worktree, so its Git blob identifier is a content reference, not a committed source version.

## Database schema

Use the following Notion-compatible properties. `Immutable Status`, `Proposed Horizon`, and `Proposed Sequence` are imported baseline metadata. Reviewers may edit only the `Review *`, decision, and notes fields. Notion property-level immutability must be enforced operationally by the review owner; reconciliation independently treats any changed imported field as a conflict and never trusts it as an approved change.

| Property | Notion type | Allowed values / use |
|---|---|---|
| `Name` | Title | Initiative title. |
| `RM ID` | Rich text | Stable `RM-001` through `RM-029`; never renumber. |
| `Immutable Status` | Select | `shipped`, `unfinished`, `quality/debt`, `idea`, `deferred`; imported reference metadata only. |
| `Proposed Horizon` | Select | `Now`, `Next`, `Later`, `Explore`, `Future-only`, `Shipped`; imported proposal baseline only. |
| `Proposed Sequence` | Number | Positive integer ordering within the imported horizon band. |
| `Rationale` | Rich text | Imported proposal rationale; never silently overwritten by review discussion. |
| `Dependencies/Prerequisites` | Rich text | Imported prerequisites and promotion gates. |
| `Review Horizon` | Select | `No change`, `Now`, `Next`, `Later`, `Explore`, `Future-only`, `Shipped`; editable delta only. |
| `Review Sequence` | Number | Editable proposed sequence delta; leave empty for no change. |
| `Review Rationale` | Rich text | Editable proposed rationale delta; leave empty for no change. |
| `Review Decision` | Select | `Pending maintainer review`, `No change`, `Approve delta`, `Request changes`, `Conflict`; a decision is never approval/publication by itself. |
| `Maintainer Notes` | Rich text | Editable review notes; empty means no note. |
| `Maintainer Important` | Checkbox | Review attention signal only; does not change status, horizon, or sequence. |
| `Source Proposal Hash` | Rich text | Exact source SHA-256 for every row. |
| `Source Generated/Refreshed` | Date | `2026-08-26T01:29:00Z` for this source generation. Notion normalizes this Date field to minute precision; this is the exact stored value. |
| `Source State` | Select | `Current`, `Stale`; use `Stale` if the pinned source hash/version no longer matches a fresh read. |
| `Draft State` | Select | `Draft/Unapproved`, `Pending reconciliation`, `Conflict`, `Archived`; all initial rows are `Draft/Unapproved`. |

### Select-option set

Create all select options exactly as spelled above before row population. Do not add `Approved`, `Canonical`, `Synced`, or `Integrated` to this database.

## Exact initial row payload

All omitted delta values below mean an explicit empty value (`""`) in the digest serialization, not an implicit approval. Every row has `Source Proposal Hash = 1E23E7E7E293D2D6A4A50BA8B94A6620871A786E7CBDDE5B65BB71E80AB98F26`, `Source Generated/Refreshed = 2026-08-26T01:29:00Z` (the exact Notion-stored, minute-precision value), `Source State = Current`, and `Draft State = Draft/Unapproved`.

| RM ID | Name | Immutable Status | Proposed Horizon | Proposed Sequence | Rationale | Dependencies/Prerequisites | Review Horizon | Review Sequence | Review Rationale | Review Decision | Maintainer Notes | Important |
|---|---|---|---|---:|---|---|---|---:|---|---|---|---|
| RM-001 | Monthly financial core baseline | shipped | Shipped | 1 | Preserve baseline. It anchors daily use but is not new committed work. | Bounded current-month baseline; open improvements remain separate. | No change |  |  | Pending maintainer review |  | false |
| RM-002 | Basic active-month reporting baseline | shipped | Shipped | 2 | Preserve baseline. It does not close cross-month reporting or PDF export. | Depends on RM-001 monthly data; RM-019 and RM-020 remain separate. | No change |  |  | Pending maintainer review |  | false |
| RM-003 | Active Month decision-surface baseline | shipped | Shipped | 3 | Preserve baseline. Concrete high-friction improvements remain separately prioritized. | Depends on RM-001; UX improvements remain independent initiatives. | No change |  |  | Pending maintainer review |  | false |
| RM-004 | Credit-card statement-period clarity baseline | shipped | Shipped | 4 | Preserve baseline. It does not replace statement history or payment tracking. | Depends on current statement API and RM-001 expense linkage; RM-009 and RM-010 remain separate. | No change |  |  | Pending maintainer review |  | false |
| RM-005 | Recurring financial operations | unfinished | Later | 3 | Valuable automation, but posting, frequency, edit propagation, pause/resume, and lifecycle policy require a dedicated decision before commitment. | Depends on RM-001 and future lifecycle policy decisions. | No change |  |  | Pending maintainer review |  | false |
| RM-006 | Grouped information architecture | unfinished | Next | 6 | A useful current-experience improvement after the first integrity slice; keep interaction and persistence choices open for its focused SDD. | Depends on presentation-surface inventory; distinct from RM-022 and RM-023. | No change |  |  | Pending maintainer review |  | false |
| RM-007 | Pocket allocation and goal-excess automation | unfinished | Later | 1 | Useful automation after the core is trustworthy; retain its distinct allocation semantics. | Depends on RM-001 and pocket movement semantics; distinct from RM-008. | No change |  |  | Pending maintainer review |  | false |
| RM-008 | Explicit zero-out surplus closeout | unfinished | Later | 2 | A helpful closeout option, but it follows clearer core and allocation workflows and remains distinct from RM-007. | Depends on RM-001 closing behavior; related to, but independent from, RM-007. | No change |  |  | Pending maintainer review |  | false |
| RM-009 | Credit-card statement history | unfinished | Next | 1 | Establishes addressable history and reconciliation evidence; it remains before RM-010. | Promotion to Now requires an explicit later-edit reconciliation decision and focused-design evidence that stable statement identity/history preserves that policy. | No change |  |  | Pending maintainer review |  | false |
| RM-010 | Credit-card statement payment tracking | unfinished | Next | 2 | Direct personal-use value, but only after RM-009 gives statements stable identity/history and protects against double-counting. | Depends on RM-009 stable identity/history and financial-correctness rules. | No change |  |  | Pending maintainer review |  | false |
| RM-011 | Debt integration decision/exploration | idea | Explore | 1 | Keep non-committed until cash, available-money, and monthly-movement semantics are explicitly decided. | Depends on RM-001 financial semantics and an explicit money-meaning decision. | No change |  |  | Pending maintainer review |  | false |
| RM-012 | Financial mutation retry protection | unfinished | Now | 1 | Start first. A bounded correctness safeguard against duplicate financial CREATE movements; it protects existing and future money-moving workflows. | Accepted, dependency-resolved bounded integrity slice; focused implementation proposal still required. | No change |  |  | Pending maintainer review |  | false |
| RM-013 | Product-quality evidence safeguards | quality/debt | Next | 7 | Strengthens confidence after the first correctness slice. Scope it into reviewable evidence work rather than treating the broad group as one large delivery. | Supports every user-facing initiative; relevant evidence gaps and focused plan must be resolved for Now. | No change |  |  | Pending maintainer review |  | false |
| RM-014 | Identity and privacy decision | idea | Explore | 2 | Required decision gate before dependable scope for backup/export, multi-user, and bank integration; no authentication commitment. | Blocks reliable scope for RM-015 and RM-016. | No change |  |  | Pending maintainer review |  | false |
| RM-015 | Backup/export | deferred | Explore | 3 | Later capability only after RM-014 and explicit ownership, privacy, portability, and restore decisions. | Depends on RM-014 plus data/privacy and restore decisions. | No change |  |  | Pending maintainer review |  | false |
| RM-016 | Multi-user support | idea | Explore | 4 | Conflicts with the present personal-use focus and depends on RM-014; do not commit it. | Depends on RM-014. | No change |  |  | Pending maintainer review |  | false |
| RM-017 | Bank integration | idea | Explore | 5 | Defer until value, provider, synchronization, ownership, and privacy boundaries are chosen. | Depends on RM-014 and data ownership/privacy decisions. | No change |  |  | Pending maintainer review |  | false |
| RM-018 | Production recovery | deferred | Future-only | 1 | Not prioritized. A future explicit decision must verify all six safeguards. | Must remain Future-only until shared lock identity; atomic legacy/replacement interoperability; destructive-stage source-drift detection including live inputs; owner-identifiable safe orphan recovery; rollback compatibility; and primary reset-failure preservation when release also fails are verified. | No change |  |  | Pending maintainer review |  | false |
| RM-019 | Cross-month comparison/reporting | unfinished | Next | 8 | Reporting closure follows core correctness and current-experience work, and precedes automation. First define a bounded comparison outcome; current active-month reports remain a shipped baseline. | Depends on RM-001 and a maintainer-defined comparison outcome; precedes RM-007, RM-008, and RM-005 automation. | No change |  |  | Pending maintainer review |  | false |
| RM-020 | PDF report export | idea | Explore | 6 | Consider only after report scope and relevant identity/privacy choices; it is neither backup/export nor a substitute for reporting closure. | Depends on RM-002 or defined report scope and relevant RM-014 decision. | No change |  |  | Pending maintainer review |  | false |
| RM-021 | Money-input interaction quality | unfinished | Next | 3 | High-friction current experience: make formatting, zero/placeholder behavior, and stepper behavior consistent while preserving validation and decimal semantics. | Promotion to Now requires a completed money-entry surface inventory and focused-design evidence that validation and decimal semantics remain preserved. | No change |  |  | Pending maintainer review |  | false |
| RM-022 | Movements view redesign | unfinished | Later | 4 | Useful but larger interaction scope; follow the smaller clarity and selection improvements and keep it separate from the holistic audit. | Depends on later movements-workflow exploration; distinct from RM-006 and RM-023. | No change |  |  | Pending maintainer review |  | false |
| RM-023 | Dependent category/subcategory selection | unfinished | Next | 5 | A concrete daily-flow correctness and friction reduction. Its focused proposal must protect historic records and resolve edit, migration, and empty states. | Depends on authoritative relationships and preservation of valid historic records. | No change |  |  | Pending maintainer review |  | false |
| RM-024 | Destructive-action confirmation | unfinished | Next | 4 | Reduce avoidable loss in existing flows after inventorying actions and choosing risk thresholds, language, and undo alternatives. | Depends on action inventory and product-specific consequences. | No change |  |  | Pending maintainer review |  | false |
| RM-025 | Pocket withdrawal semantics | idea | Explore | 7 | Keep non-committed until the accounting meaning of withdrawal is decided; do not invent cash, transfer, expense, or available-money semantics. | Depends on RM-001 and existing pocket movement semantics; accounting decision must precede implementation. | No change |  |  | Pending maintainer review |  | false |
| RM-026 | Uncategorized expense recording | idea | Explore | 8 | Keep non-committed until classification, budget, reporting, and recategorization rules are decided. | Depends on RM-001 and explicit accounting/reporting rules. | No change |  |  | Pending maintainer review | **Maintainer-important review input only; it does not change Immutable Status `idea`, Proposed Horizon `Explore`, or Proposed Sequence.** | true |
| RM-027 | Holistic UI refinement | idea | Explore | 9 | Later screen-by-screen audit only. It must not absorb the concrete current-experience initiatives. | Depends on future screen audit and primary-workflow evidence; distinct from RM-021 through RM-024. | No change |  |  | Pending maintainer review |  | false |
| RM-028 | Financial-threshold notifications | idea | Explore | 10 | Explore only after trustworthy threshold formulas, trigger events, channels, and safety boundaries are selected. | Depends on maintainer decisions about trustworthy thresholds, triggers, and channels. | No change |  |  | Pending maintainer review |  | false |
| RM-029 | Personal deployment decision | idea | Explore | 11 | Keep later while ownership, privacy, security, credentials, operational support, and recovery boundaries are undecided. | Depends on ownership, privacy, security, support, and recovery-boundary decisions; does not promote RM-018. | No change |  |  | Pending maintainer review |  | false |

## View definitions

Create these views over the Review Draft database. Each view must display `RM ID`, `Immutable Status`, `Proposed Horizon`, `Proposed Sequence`, `Review Horizon`, `Review Sequence`, `Review Decision`, `Maintainer Notes`, `Maintainer Important`, `Source State`, and `Draft State` so reviewers see deltas rather than an apparent canonical plan.

| View | Type | Filter | Sort / grouping |
|---|---|---|---|
| `Now` | Table | `Proposed Horizon = Now` OR `Review Horizon = Now` | Review Horizon then Review Sequence ascending, then RM ID ascending. |
| `Next` | Table | `Proposed Horizon = Next` OR `Review Horizon = Next` | Review Horizon then Review Sequence ascending, then RM ID ascending. |
| `Later` | Table | `Proposed Horizon = Later` OR `Review Horizon = Later` | Review Horizon then Review Sequence ascending, then RM ID ascending. |
| `Explore` | Table | `Proposed Horizon = Explore` OR `Review Horizon = Explore` | Review Horizon then Review Sequence ascending, then RM ID ascending. |
| `Future-only` | Table | `Proposed Horizon = Future-only` OR `Review Horizon = Future-only` | RM ID ascending; visually call out RM-018 as restricted. |
| `Shipped` | Table | `Proposed Horizon = Shipped` OR `Review Horizon = Shipped` | Proposed Sequence ascending, then RM ID ascending. |
| `Requested Changes` | Table | `Review Decision = Request changes` OR `Review Decision = Conflict` OR `Maintainer Notes is not empty` OR `Review Horizon != No change` OR `Review Sequence is not empty` OR `Review Rationale is not empty` | Review Decision, then RM ID ascending. |

## Validation and review checklist

### Pre-creation manifest validation — completed

- [x] Title is exactly `Roadmap Review Draft — Not Canonical` and the visible description says `NON-CANONICAL — DRAFT/UNAPPROVED`.
- [x] All RM-001 through RM-029 payload rows are present once, and all initial rows are `Draft/Unapproved`.
- [x] Current source SHA-256 was recomputed from `priority-horizon-proposal.md` and matches every row payload.
- [x] Immutable status/horizon pairs match the approved classification and proposal; RM-018 is `deferred`/`Future-only`.
- [x] RM-026 is `Maintainer Important = true` with a non-promoting explanation and remains `idea`/`Explore`.
- [x] The schema and view plan keep imported fields separate from editable review deltas.
- [x] No approval, canonical publication, mirror, proposed-changes queue, automation, sync, commit, push, or PR is represented as completed.

### Post-creation checks — creation evidence recorded

- [x] Record actual database/page/row IDs and URLs below. A fresh fetch/read at `2026-08-26T01:35:39.009Z` proved database ancestry and sampled RM-026.
- [x] Confirm every created row has the exact source pin and `Draft/Unapproved` state: fresh SQL verification returned `total=29`, `unique_rm=29`, `draft_rows=29`, `pinned_rows=29`, and `current_rows=29`.
- [x] Confirm the seven required views were created: Now, Next, Later, Explore, Future-only, Shipped, and Requested Changes. The separately existing default view is not counted as one of these seven.
- [x] Confirm RM-026 remains `idea` / `Explore`, has `Maintainer Important=true`, `Review Decision=Pending maintainer review`, and preserves its non-promoting maintainer note.

### Reconciliation / approval checks — deliberately pending

- [ ] Fail closed when an `idea` is moved to `Now`/`Shipped`, a `deferred` item is moved outside `Explore`/`Future-only`, a shipped item is moved off `Shipped`, or unresolved unfinished/quality work is moved to `Now`.
- [ ] Confirm RM-018 cannot leave `Future-only` without a future explicit decision and all six safeguards.
- [ ] Re-read the source hash/version and all digest-covered fields before reconciliation, approval, and publication; any mismatch becomes `Pending reconciliation` or `Conflict`.
- [ ] If Notion is unavailable, retain this manifest and source pin, make no approval/canonical claim, and recreate the disposable draft later.

### Pre-reconciliation fail-closed verification — 2026-08-26

This documentary/external-artifact verification is the task 4.4 safety test. No row was mutated to simulate an invalid move. The baseline was fresh-read first: the source SHA-256 matched the 29 row pins, all 29 unique RM IDs were present, all rows were `Draft/Unapproved`/`Current`, and the deterministic five-field digest was recomputed as `F1959D9B676EF01972EDFE70A77D5B24165559B80DCC9AD7309B3C67AA9717CB`.

| Scenario | RED expectation | GREEN evidence | Result |
|---|---|---|---|
| `idea` moved to `Now` or `Shipped` without an accepted semantics gate | Reconciliation rejects it as an invalid lifecycle/horizon pair; no approval or publication can occur. | Spec/design matrix permits `idea -> Explore` only and requires an explicit semantics gate through reconciliation before a source classification can change. | Pass — fail closed. |
| `deferred` move outside `Explore`/`Future-only`, including RM-018 | Reconciliation rejects the move; RM-018 remains restricted until all six C-18 safeguards are verified. | RM-018 fresh-read as `deferred`/`Future-only`; the matrix and its six safeguards remain intact. | Pass — fail closed. |
| `shipped` moved off `Shipped`, or unresolved `unfinished`/`quality/debt` moved to `Now` | Reconciliation returns `Pending` or `Conflict`; no approval/publication can occur. | The matrix requires bounded completion evidence for `Shipped` and accepted scope, resolved prerequisites, and focused evidence/design for `Now`. | Pass — fail closed. |
| Source hash/version, row set, lifecycle, or digest drifts | Reconciliation/approval/publication stops and requires a new reconciliation. | Fresh source SHA-256 and every row pin matched; 29 distinct IDs and the baseline digest matched. No database-wide atomic revision is exposed, so no revision was invented. | Pass — current baseline only. |
| Notion outage or recreation | Git/SDD remains usable; no approval/canonical/synchronization claim is made; the draft may be recreated from the source pin. | The source artifact and manifest retain the path, version, hash, row contract, and digest protocol. | Pass — documented fail-closed fallback. |

The exact live `Source Generated/Refreshed` field is `2026-08-26T01:29:00Z`; the prior manifest text used a higher-precision local timestamp that Notion does not retain. This manifest now records the exact stored value rather than claiming unsupported timestamp precision.

## Real Notion identifiers and creation snapshot

| Capture | Value |
|---|---|
| Actual database ID | `801a7199-4bf2-4230-92f9-c07a9fd94e5c` |
| Actual database URL | `https://app.notion.com/p/801a71994bf2423092f9c07a9fd94e5c?pvs=204` |
| Actual data source | `collection://d7b1cf95-6eb5-40b2-b6b1-530a1afdf9b3` |
| Actual parent page ID/URL | `None — workspace-private database` |
| Actual row IDs/URLs for RM-001–RM-029 | Recorded in the exact row URL map below. |
| Fresh creation-read timestamp | `2026-08-26T01:35:39.009Z` |
| Actual Notion database-wide revision identifier after creation/fresh read | `UNAVAILABLE — Notion MCP does not expose a database-wide atomic revision identifier.` |
| Creation snapshot timestamp | `2026-08-26T01:35:39.009Z` |
| Deterministic initial delta digest (SHA-256) | `F1959D9B676EF01972EDFE70A77D5B24165559B80DCC9AD7309B3C67AA9717CB` — creation snapshot only; not reconciliation or approval evidence. |
| Reconciled proposal SHA-256 | `EFF80862620D7AC3895E24647690238A4B338C32E25543586BACC688C9E38699` |
| Maintainer approval record | `APPROVED — 2026-08-26 explicit Continue approval after task 5.2 final read; approval is Git/SDD evidence only, not a Notion draft-state mutation or canonical publication.` |
| Approved source/revision/digest/reconciled-hash pin | Review-baseline source SHA-256 `1E23E7E7E293D2D6A4A50BA8B94A6620871A786E7CBDDE5B65BB71E80AB98F26`; Notion revision `UNAVAILABLE` (not fabricated); deterministic delta digest `8118B4702EC650B42CF2FB7CD9A0F3EE90580DCAADEF6A8D287EF66C0BA3CE52`; approved current proposal SHA-256 `31138F924F0FDB6DDC1E5D6DF2C50BAF694D167161E3AF5348E7012F93DAA3F5`; current content reference `4d8a3a516142ff67e3b7390cd2600e37c93a608f`. |

### Exact row URL map

| RM ID | Page ID | URL |
|---|---|---|
| RM-001 | `3c89940c26cb814289aecdead4382dd5` | `https://app.notion.com/3c89940c26cb814289aecdead4382dd5` |
| RM-002 | `3c89940c26cb8155aeedc63fc548c6aa` | `https://app.notion.com/3c89940c26cb8155aeedc63fc548c6aa` |
| RM-003 | `3c89940c26cb81599f77f3aa5972982e` | `https://app.notion.com/3c89940c26cb81599f77f3aa5972982e` |
| RM-004 | `3c89940c26cb81dba3f9ed34a346c01c` | `https://app.notion.com/3c89940c26cb81dba3f9ed34a346c01c` |
| RM-005 | `3c89940c26cb8156b1fccf2475da5ae7` | `https://app.notion.com/3c89940c26cb8156b1fccf2475da5ae7` |
| RM-006 | `3c89940c26cb8139b99de5b0fc5d6b69` | `https://app.notion.com/3c89940c26cb8139b99de5b0fc5d6b69` |
| RM-007 | `3c89940c26cb81f4aeb1e13eaef50e24` | `https://app.notion.com/3c89940c26cb81f4aeb1e13eaef50e24` |
| RM-008 | `3c89940c26cb81b78c72da8fd127cd0a` | `https://app.notion.com/3c89940c26cb81b78c72da8fd127cd0a` |
| RM-009 | `3c89940c26cb816896d8d62a0d2c46b5` | `https://app.notion.com/3c89940c26cb816896d8d62a0d2c46b5` |
| RM-010 | `3c89940c26cb812f9b4afb59afaab362` | `https://app.notion.com/3c89940c26cb812f9b4afb59afaab362` |
| RM-011 | `3c89940c26cb81c59a31c102e230390e` | `https://app.notion.com/3c89940c26cb81c59a31c102e230390e` |
| RM-012 | `3c89940c26cb8167a695d9c9d9a829ba` | `https://app.notion.com/3c89940c26cb8167a695d9c9d9a829ba` |
| RM-013 | `3c89940c26cb81698d2ed2b13885ab45` | `https://app.notion.com/3c89940c26cb81698d2ed2b13885ab45` |
| RM-014 | `3c89940c26cb814fb333d48e084aa825` | `https://app.notion.com/3c89940c26cb814fb333d48e084aa825` |
| RM-015 | `3c89940c26cb8145999cec7ab855cea5` | `https://app.notion.com/3c89940c26cb8145999cec7ab855cea5` |
| RM-016 | `3c89940c26cb81dbaa2ae0ddba780a47` | `https://app.notion.com/3c89940c26cb81dbaa2ae0ddba780a47` |
| RM-017 | `3c89940c26cb81a0bfb2f1562c32ee34` | `https://app.notion.com/3c89940c26cb81a0bfb2f1562c32ee34` |
| RM-018 | `3c89940c26cb8112a21dff2ea5fffb46` | `https://app.notion.com/3c89940c26cb8112a21dff2ea5fffb46` |
| RM-019 | `3c89940c26cb81bb8235fa2082ed2c93` | `https://app.notion.com/3c89940c26cb81bb8235fa2082ed2c93` |
| RM-020 | `3c89940c26cb812197f0d1eca8fe8abb` | `https://app.notion.com/3c89940c26cb812197f0d1eca8fe8abb` |
| RM-021 | `3c89940c26cb818ebdabeca1c7f5823e` | `https://app.notion.com/3c89940c26cb818ebdabeca1c7f5823e` |
| RM-022 | `3c89940c26cb813f934dd99d56956f9a` | `https://app.notion.com/3c89940c26cb813f934dd99d56956f9a` |
| RM-023 | `3c89940c26cb819b8c32c86da827c4d0` | `https://app.notion.com/3c89940c26cb819b8c32c86da827c4d0` |
| RM-024 | `3c89940c26cb81dfb7c7d4bfcf4353a0` | `https://app.notion.com/3c89940c26cb81dfb7c7d4bfcf4353a0` |
| RM-025 | `3c89940c26cb81169c7ff74bbd014fe7` | `https://app.notion.com/3c89940c26cb81169c7ff74bbd014fe7` |
| RM-026 | `3c89940c26cb817f80bbe32bda8e18d8` | `https://app.notion.com/3c89940c26cb817f80bbe32bda8e18d8` |
| RM-027 | `3c89940c26cb81908fdbd9ca31c7eb6c` | `https://app.notion.com/3c89940c26cb81908fdbd9ca31c7eb6c` |
| RM-028 | `3c89940c26cb810ab800eda269cb268a` | `https://app.notion.com/3c89940c26cb810ab800eda269cb268a` |
| RM-029 | `3c89940c26cb81988675ebe4f693ef15` | `https://app.notion.com/3c89940c26cb81988675ebe4f693ef15` |

### Required review views

| View | ID |
|---|---|
| Now | `view://3c89940c-26cb-8132-ba74-000c0902a66d` |
| Next | `view://3c89940c-26cb-8190-b3aa-000cca4bbf78` |
| Later | `view://3c89940c-26cb-8187-bca9-000ce88fa05c` |
| Explore | `view://3c89940c-26cb-8106-a135-000c1a3009f7` |
| Future-only | `view://3c89940c-26cb-8132-814e-000c9a077fbd` |
| Shipped | `view://3c89940c-26cb-8132-9747-000c927e1e55` |
| Requested Changes | `view://3c89940c-26cb-813a-947c-000c83ac60bc` |

## Deterministic delta-digest protocol

At reconciliation, perform a fresh Notion read and serialize exactly the following fields in ascending `RM ID` order: `Review Horizon`, `Review Sequence`, `Review Rationale`, `Review Decision`, and `Maintainer Notes`. For every row and field, include the field name and an explicit value; serialize an empty value as `""`. Use UTF-8 and LF newlines, one record per line:

```text
RM-001|Maintainer Notes|""
RM-001|Review Decision|"Pending maintainer review"
RM-001|Review Horizon|"No change"
RM-001|Review Rationale|""
RM-001|Review Sequence|""
...
RM-029|Review Sequence|""
```

SHA-256 the full serialized byte stream and record it only after the fresh read. For the initial creation snapshot above, every value is the initial default except RM-026 `Maintainer Notes`, whose fresh-read text is `Maintainer-important review input only; it does not change Immutable Status idea, Proposed Horizon Explore, or Proposed Sequence.` The resulting digest is the recorded creation-snapshot digest, using UTF-8, LF line endings, ascending RM IDs, and the displayed field order. It is not a reconciliation or approval snapshot.

Notion MCP does not expose a database-wide atomic revision identifier. Do not fabricate one or treat individual page timestamps as a substitute. Later reconciliation must use a new fresh row read, the exact field digest, source hash/version, and the complete row/page set; any changed read or source mismatch fails closed and requires reconciliation again. This is a fail-closed read/reconcile/re-read protocol, not an atomic Notion CAS or synchronization protocol.

## Task 5.1 reconciliation evidence — 2026-08-27

**Outcome: reconciled, not approved.** A fresh complete SQL read of `collection://d7b1cf95-6eb5-40b2-b6b1-530a1afdf9b3` returned exactly 29 unique RM IDs (`RM-001` through `RM-029`) with no additional page. Every row retained source hash `1E23E7E7E293D2D6A4A50BA8B94A6620871A786E7CBDDE5B65BB71E80AB98F26`, source state `Current`, and its original imported lifecycle/proposed fields. The fresh five-field delta digest was `8118B4702EC650B42CF2FB7CD9A0F3EE90580DCAADEF6A8D287EF66C0BA3CE52`.

| Reconciliation input or output | Value |
|---|---|
| Pinned review source SHA-256 | `1E23E7E7E293D2D6A4A50BA8B94A6620871A786E7CBDDE5B65BB71E80AB98F26` |
| Complete Notion row set | Exactly 29 unique IDs, `RM-001`–`RM-029` |
| Notion revision | `UNAVAILABLE` — Notion MCP exposes no database-wide atomic revision; none is invented |
| Fresh delta digest | `8118B4702EC650B42CF2FB7CD9A0F3EE90580DCAADEF6A8D287EF66C0BA3CE52` |
| Authorized delta | RM-026 only: `Now`, sequence `1`, `Approve delta`, and the accepted optional-classification / totals / display / later-categorization / month-close rationale and notes |
| Lifecycle gate | Resolved truthfully in Git artifacts: RM-026 is reclassified from `idea`/`Explore` to `unfinished`/`Now` only because the maintainer explicitly accepted those semantics; no Notion imported field was altered |
| Reconciled proposal SHA-256 | `EFF80862620D7AC3895E24647690238A4B338C32E25543586BACC688C9E38699` |
| Reconciled proposal Git blob | `d42826f78012d45483894951f0d1a7c4dd70d87f` (working-tree content reference, not a committed version) |
| Approval record | `NOT_APPROVED` — task 5.2 remains the explicit approval gate |

The only priority change is RM-026 first in `Now`, before RM-012. RM-009, RM-010, RM-021, RM-024, RM-023, RM-006, RM-013, and RM-019 retain their previous relative ordering; no other review delta was reconciled. RM-026 remains out of application scope: this change records governance and future implementation semantics only.

The re-read proves the review snapshot, row set, row pins, and source baseline used for reconciliation. It is not an approval snapshot: no fresh final read was used to approve or publish the newly reconciled proposal, and the draft has not been promoted, synchronized, archived, or transformed into a canonical surface. A later explicit approval must perform the required final source/hash and full digest-covered Notion-field re-read; any mismatch must remain `Pending reconciliation` or `Conflict`.

## Task 5.2 final approval evidence — 2026-08-26

**Outcome: approved for the next canonical-publication slice; not published.** The maintainer explicitly selected **Continue** for final read, approval, and canonical publication. This task completes only the approval gate because the task plan reserves canonical publication, draft archival, mirror creation, and the proposal queue for the next autonomous PR 2 work unit.

| Approval precondition | Fresh final-read evidence | Result |
|---|---|---|
| Approved source is unchanged | Current `priority-horizon-proposal.md` content reference is `4d8a3a516142ff67e3b7390cd2600e37c93a608f`; SHA-256 is `31138F924F0FDB6DDC1E5D6DF2C50BAF694D167161E3AF5348E7012F93DAA3F5`. It retains the task 5.1 reconciled decisions and adds only the task 5.2 approval record. | Pass |
| Review baseline remains identifiable | All 29 Notion rows retain source hash `1E23E7E7E293D2D6A4A50BA8B94A6620871A786E7CBDDE5B65BB71E80AB98F26` and `Source State = Current`. The hash is retained as the pre-reconciliation review-source pin, not confused with the reconciled proposal hash. | Pass |
| Complete digest-covered snapshot is unchanged | Fresh SQL read returned exactly 29 unique RM IDs, `RM-001`–`RM-029`, no extras, and the five-field RM-ID-ascending digest is `8118B4702EC650B42CF2FB7CD9A0F3EE90580DCAADEF6A8D287EF66C0BA3CE52`, matching task 5.1. The sole delta remains RM-026: `Now`, sequence `1`, `Approve delta`, and the authorized semantics. | Pass |
| Revision limitation is truthful | Notion MCP still exposes no database-wide atomic revision identifier. No revision was fabricated or substituted with page timestamps. | Pass — recorded as `UNAVAILABLE` |
| Explicit maintainer approval | The maintainer explicitly selected Continue after the final read for approval and the subsequent canonical-publication boundary. | Pass — approval recorded |

### Fail-closed result

Any source/hash, row-set, source-state, digest, or available-revision mismatch would leave the result `Pending reconciliation` or `Conflict` and block both approval and publication. No mismatch was found. This approval does **not** mutate the Notion draft to an approved/canonical state, archive it, create a mirror or queue, synchronize Git, implement RM-026, commit, push, or open a PR.

## Slice evidence and boundary

This PR1 work unit ends with a reconciled, explicitly approved, and Git/SDD-pinned priority proposal plus a created, source-pinned, non-canonical Review Draft. The draft itself remains **DRAFT/UNAPPROVED** until publication; canonical roadmap publication, post-publication Notion mirror/queue/synchronization, application implementation, commit, push, and PR creation remain excluded/pending. Reverting this manifest evidence does not alter the already-disposable Notion Draft; Git/SDD remains authoritative and usable.
