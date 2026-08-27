# Design: Create Product Roadmap

## Technical Approach

Git remains the only canonical authority. Before priority approval, a clearly labeled Notion **Roadmap Review Draft** may render `priority-horizon-proposal.md` for lower-load review. After approval and publication, a separate refresher-owned **Canonical Roadmap Mirror** reflects `docs/product/roadmap.md`; later user intent enters a separate **Proposed Roadmap Changes** queue. No Notion surface writes Git automatically.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Three explicit Notion concepts | More lifecycle steps; no ambiguous authority. | Separate pre-publication Review Draft, post-publication Canonical Mirror, and post-publication Proposed Changes queue. |
| Version-pinned draft | Refresh is manual; stale conclusions fail closed. | Pin the exact source path, priority-proposal version, SHA-256 of its bytes, and generated/refreshed timestamp. |
| Baseline plus review fields | Duplicates values; preserves a deterministic delta. | Imported proposal values remain intact; maintainer moves/edits affect review fields only. |
| Automatic synchronization | Faster propagation; unsafe conflicts and false freshness. | Reject bidirectional sync, webhooks, polling, runtime services, bot commits, hidden rebases, and last-write-wins. |

## Data Flow

```text
priority-horizon-proposal.md@source-version+hash -> Roadmap Review Draft (Draft/Unapproved)
maintainer review fields@Notion-revision+delta-digest -> explicit Pending decisions/deltas -> SDD reconciliation
    -> reconciled-proposal@hash -> final snapshot re-check -> approval record -> docs/product/roadmap.md@approved-hash
    -> archive draft -> Canonical Roadmap Mirror refresh

Proposed Roadmap Changes@base commit -> manual SDD review -> Git publication
    -> successful mirror refresh -> Integrated
```

Notion outage never blocks proposal review, approval, or Git publication. The Review Draft is disposable and recreatable from its source artifact.

## File Changes

| File | Action | Description |
|---|---|---|
| `openspec/changes/create-product-roadmap/design.md` | Modify | Define the three-surface lifecycle and fail-closed review contract. |
| `openspec/changes/create-product-roadmap/priority-horizon-proposal.md` | Read only | Version-pinned source for the Review Draft. |
| `docs/product/roadmap.md` | Create later | Sole canonical roadmap after approval. |

## Interfaces / Contracts

### Roadmap Review Draft

The draft page displays **NON-CANONICAL — DRAFT/UNAPPROVED**, source path, exact priority-proposal version, source SHA-256, generated/refreshed timestamp, and `Current|Stale` source state. Each RM-001–RM-029 record imports its immutable classified lifecycle status and contains RM ID, title, imported proposed horizon/sequence, rationale, dependencies/prerequisites, review horizon/sequence, review decision, maintainer notes, and Draft/Unapproved state. Views filter/group review values for `Now`, `Next`, `Later`, `Explore`, `Future-only`, and `Shipped`; a Decisions/Changes Requested view shows non-empty notes, changed review values, or decisions requiring action.

The imported lifecycle status is display-only and cannot be changed by a review-field edit or board move. Review horizon/sequence values are proposed deltas only; they do not alter classified lifecycle status, approve work, or create a canonical change. Reconciliation validates every imported status and proposed horizon against this complete matrix before it can create a resulting proposal:

| Immutable classified status | Valid proposed horizons | Promotion prerequisites |
|---|---|---|
| `shipped` | `Shipped` only | The bounded classified baseline has completion evidence. A move to `Shipped` without that evidence fails closed. |
| `unfinished` | `Later`, `Next`, `Now` | `Now` additionally requires accepted work, all stated dependencies/prerequisites resolved, and focused evidence/design sufficient for the proposed commitment. |
| `quality/debt` | `Later`, `Next`, `Now` | `Now` additionally requires accepted scope, the relevant evidence gap and dependencies resolved, and a focused evidence/design plan. |
| `idea` | `Explore` only | It remains non-committed until its explicit decision/semantics gate is accepted through a later reconciliation. |
| `deferred` | `Explore`, `Future-only` | A deferred item remains non-committed. RM-018/C-18 is the stricter exception below. |

Invalid status/horizon pairs fail closed as review errors/conflicts. A `Shipped` move without classified completion evidence, or a `Now` move for unresolved or non-accepted work, also fails closed and remains a review error/conflict. RM-018/C-18 may not move out of `Future-only`: it remains `deferred`/`Future-only` until a future explicit maintainer decision verifies all six C-18 safeguards. RM-026 remains visibly flagged `Maintainer-important` as review input only; the flag neither changes its imported `idea` status nor silently promotes it from `Explore`.

Before conclusions are accepted, reconciliation records an exact input snapshot: source priority-proposal path, version, and SHA-256; the Notion review revision identifier; and a deterministic SHA-256 digest of every review decision/delta field read. The digest serializes RM IDs in ascending order and each field name/value with explicit empty values, including review horizon, review sequence, review decision, and maintainer notes. Reconciliation produces and records the exact SHA-256 of the resulting priority proposal.

Immediately before maintainer approval or publication, the workflow re-reads the source priority-proposal hash and version plus the Notion revision and all digest-covered review decision/delta fields. Any source mismatch, Notion revision mismatch, or delta-digest mismatch is a new edit or stale snapshot: mark the result `Pending` or `Conflict`, block approval/publication, and require reconciliation again. A valid approval record pins the source hash, Notion revision/delta digest, and reconciled proposal hash. Publication is permitted only when the proposal being published exactly matches that approved reconciled hash. This is a fail-closed read/reconcile/re-read protocol, not an atomic Notion compare-and-swap claim or bidirectional synchronization.

Changed review fields become explicit `Pending` deltas against the imported baseline; board moves are never treated as approval or canonical change.

### Canonical Mirror and Proposed Changes

After approved Git publication, archive the Review Draft with its review evidence. An explicit conversion must still create/refresh a **separate** Canonical Mirror from the published commit; the draft never silently becomes canonical. The mirror has one refresher-owned record per immutable RM ID, canonical fields, source commit/version, and refreshed time.

Future edits use separate Proposed Changes records: RM ID or new intent, base commit/version, action `change|new|rename|delete`, proposed values, rationale, and `Pending|Conflict|Integrated|Rejected`. A stale base remains `Pending` for re-review or becomes `Conflict`; it is never silently rebased. `Integrated` requires maintainer/SDD approval, Git publication, successful mirror refresh from that commit, and verification. Failure leaves visible staleness and a non-`Integrated` proposal.

Canonical statuses remain `shipped`, `unfinished`, `deferred`, `idea`, `quality/debt`; horizons remain `Now`, `Next`, `Later`, `Explore`, `Future-only`, `Shipped`. The Review Draft imports and validates those lifecycle constraints but never becomes their authority. Unresolved work cannot enter `Now`. RM-018 remains `deferred`/`Future-only` unless all six C-18 safeguards hold: shared cross-checkout lock identity, atomic legacy/replacement interoperability, destructive-stage source-drift detection including live inputs, owner-identifiable safe orphan recovery, rollback compatibility, and preservation of primary reset failure when release also fails.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Draft contract | Labels, 29 records, immutable statuses, matrix validation, RM-026 input-only flag, deterministic deltas. | Checklist against classification/source and sampled invalid board moves. |
| Freshness | Matching/mismatched source version/hash, Notion revision, and delta digest. | Prove any changed snapshot cannot yield acceptance without reconciliation. |
| Publication | Approved triple pin, matching reconciled proposal hash, archive boundary, mirror ownership, stale proposals/outages. | Table-driven fail-closed scenarios; Git remains usable. |

## Migration / Rollout

No runtime migration. Create the Review Draft first; reconcile all review deltas into the SDD proposal before approval. Publish Git, archive the draft, then create/refresh the separate Canonical Mirror and Proposed Changes queue. The current specification/tasks require later alignment before implementation because they still prohibit all pre-publication Notion creation.

## Open Questions

None.
