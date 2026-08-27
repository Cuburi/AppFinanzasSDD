# Candidate Reconciliation — Create Product Roadmap

## Outcome

This is the Phase 3.1 reconciliation record. It converts the approved candidate dispositions into a clean, traceable initiative set for later metadata assignment. It is **not** the canonical roadmap: it assigns no `RM-###` IDs, roadmap status/horizon pairs, priority order, delivery commitment, or implementation work.

**Reconciled from:** `candidate-inventory.md` (checkpoint completed 2026-08-24), the active proposal, specification, design, and review ledger. Historical sources remain evidence; they are not silently deleted when current evidence or a maintainer disposition differs.

## Reconciliation rules applied

1. Preserve every candidate record and its cited provenance in the inventory.
2. Treat a `record-shipped` disposition as a shipped baseline only; it does not absorb separately open improvements or prove every historical outcome complete.
3. Consolidate only the explicitly approved merges, preserving each source outcome and history.
4. Keep unresolved financial meaning, scope, and product-decision questions explicit and unprioritized.
5. Keep C-18 Future-only with all six safeguards. Nothing in this artifact revives recovery work.

## Reconciled initiative set

| Reconciliation unit | Candidate source(s) | Reconciliation result | Preserved boundary / follow-up condition |
|---|---|---|---|
| Monthly financial core baseline | C-01 | Shipped baseline retained separately from its improvements. | The existing monthly loop is evidence-backed; no end-to-end claim for every downstream workflow is added. |
| Basic active-month reporting baseline | C-02 | Shipped baseline retained separately from broader reporting outcomes. | C-19 remains cross-month reporting; C-20 remains PDF report export. Historical “no reports” sources remain status-drift provenance. |
| Active Month decision-surface baseline | C-03 | Shipped baseline retained separately from UX improvements. | Historical partial-dashboard labels remain provenance; C-21, C-22, C-25, C-26, C-27, and C-30 are not absorbed. |
| Credit-card statement-period clarity baseline | C-08 | Shipped baseline retained separately from payment tracking and history. | Stale frontend-pending technical-debt text remains preserved; C-09 and C-10 remain open. |
| Recurring financial operations | C-24, with merged sources C-04/C-05 | One consolidated accepted initiative. | Preserve both recurring-expense and recurring-income outcomes, their original evidence, and unresolved frequency/lifecycle/posting rules. |
| Grouped information architecture | C-22, with merged source C-23 | One combined accepted initiative for category/subcategory and income information overload. | Preserve both source intents; do not merge C-25 movements redesign or C-26 dependent selection. |
| Pocket allocation and goal-excess automation | C-06 | Accepted, distinct open outcome. | Manual funding is preserved as partial evidence; C-07 zero-out closeout remains separate. |
| Explicit zero-out surplus closeout | C-07 | Accepted, distinct open outcome. | Does not redesign allocation or replace C-06. |
| Credit-card statement history | C-10 | Accepted, distinct open outcome. | Requires a stable history policy and later-edit reconciliation policy; supports C-09. |
| Credit-card statement payment tracking | C-09 | Accepted, distinct open outcome. | Depends on C-10 identity/history and must avoid double-counting original consumption. |
| Debt integration decision/exploration | C-11 | Accepted only as a decision-and-exploration record; unprioritized. | Cash, available-money, and monthly-movement effects remain unresolved. No integration design is implied. |
| Financial mutation retry protection | C-12 | Accepted, narrowly bounded correctness outcome. | Limited to retried financial CREATE mutations; excludes transaction semantics and blanket PATCH/DELETE idempotency. |
| Product-quality evidence safeguards | C-13 | Accepted safeguards grouping. | Browser accessibility/responsiveness, coverage, lint, and assertion-quality evidence remain open; later work may split this group. |
| Identity and privacy decision | C-14 | Accepted future decision gate; unprioritized. | It is not authentication implementation and remains a prerequisite for reliable scope of C-15/C-16. |
| Backup/export | C-15 | Accepted future capability; unprioritized. | Ownership, privacy, and restore remain unresolved; it does not absorb C-20 PDF report export or C-18 recovery. |
| Multi-user support | C-16 | Retained as `decision needed` future idea; unprioritized. | Personal-use focus and C-14 dependency remain explicit. |
| Bank integration | C-17 | Retained as `decision needed` distant exploratory idea; unprioritized. | Provider, synchronization, value, and data-ownership boundaries are unchosen. |
| Production recovery | C-18 | Retained as `decision needed`, deferred / Future-only; excluded from ordinary prioritization. | All six safeguards below remain mandatory; the withdrawn recovery-lock work has no completion claim. |
| Cross-month comparison/reporting | C-19 | Accepted, distinct open reporting outcome. | Current active-month reports are a baseline, not proof of this outcome; comparison scope remains to be decided. |
| PDF report export | C-20 | Retained as `decision needed` idea; unprioritized. | It is distinct from both C-02 basic reporting and C-15 backup/data export. |
| Money-input interaction quality | C-21 | Accepted concrete cross-product interaction outcome. | Preserve formatting, zero/placeholder, and native-stepper concerns; surface audit and behavior rules remain open. |
| Movements view redesign | C-25 | Accepted screen-level outcome. | Final interaction model remains unresolved; it is not merged into C-22, C-26, or C-30. |
| Dependent category/subcategory selection | C-26 | Accepted functional selection outcome. | Edit, migration, and empty-state rules remain unresolved; it is distinct from information organization. |
| Destructive-action confirmation | C-27 | Accepted protective outcome. | Exact action inventory, risk threshold, and undo alternatives remain unresolved; no global pattern is assumed. |
| Pocket withdrawal semantics | C-28 | Accepted with unresolved accounting semantics; unprioritized. | Whether withdrawal becomes cash, available money, transfer, or expense remains an explicit decision gate. |
| Uncategorized expense recording | C-29 | Accepted with unresolved accounting/reporting semantics; unprioritized. | Default labels, budget/report treatment, and recategorization remain explicit decision gates. |
| Holistic UI refinement | C-30 | Retained as `decision needed` exploratory screen-by-screen audit; unprioritized. | It must not absorb C-21, C-22/C-23, C-25, C-26, or C-27. |
| Financial-threshold notifications | C-31 | Retained as `decision needed` exploratory idea; unprioritized. | Thresholds, trigger events, channels, and safety boundaries remain unresolved. The single-judge historical-provenance concern remains non-blocking info only. |
| Personal deployment decision | C-32 | Accepted operational decision initiative; unprioritized. | Hosting, topology, credentials, automation, procedures, and implementation remain unchosen. The single-judge historical-provenance concern remains non-blocking info only. |

## Explicit merge and baseline history

| Source | Approved disposition | Reconciled treatment | History retained |
|---|---|---|---|
| C-04 recurring expenses | `merge` into C-24 | Source component of recurring financial operations. | Expense outcome and repository/product-document provenance remain in C-04. |
| C-05 recurring income | `merge` into C-24 | Source component of recurring financial operations. | Income outcome and Engram/current-surface provenance remain in C-05. |
| C-23 grouped income information | `merge` into C-22 | Source component of grouped information architecture. | Income-overload outcome and dated maintainer new-intent provenance remain in C-23. |
| C-01, C-02, C-03, C-08 | `record-shipped` | Four shipped baselines, not open initiative containers. | Current implementation evidence and contradictory/stale historical sources remain in the corresponding records. |

## Contradictions, stale evidence, and unresolved scope

| Area | Current reconciliation | Provenance retained | Required later decision or evidence |
|---|---|---|---|
| C-02 reports | Current code supports the basic active-month report baseline. | Historical documents that say no report module/page remain preserved. | Define C-19 comparison scope and decide C-20 PDF report value/boundaries. |
| C-03 Active Month | Current code supports the named decision-surface baseline. | Historical “partial dashboard” documents remain preserved. | Evaluate concrete UX improvements independently; do not infer a broader redesign. |
| C-08 statement periods | Current UI evidence supports closed/in-progress period clarity. | Technical-debt wording that says presentation is pending remains preserved. | C-09 payment tracking and C-10 history require their own outcome evidence. |
| C-11 debt integration | Independent debt behavior is not evidence of monthly-cash integration. | Existing plan/user-story intent remains preserved. | Decide cash, available-money, and monthly-movement effects before any implementation proposal. |
| C-28 pocket withdrawals | Existing pocket behavior does not determine withdrawal accounting. | Dated maintainer new-intent provenance remains preserved. | Decide money meaning before eligibility for implementation. |
| C-29 uncategorized expenses | Existing expense behavior does not determine reporting/accounting treatment. | Dated maintainer new-intent provenance remains preserved. | Decide classification, budget, reporting, and recategorization semantics. |
| C-31/C-32 provenance signals | Approved current records remain authoritative for this checkpoint. | Review-ledger single-judge concerns remain recorded as non-blocking info. | Do not invent historical evidence or corrective work without a separately authorized finding. |

## C-18 Future-only safeguards

C-18 remains deferred / Future-only and outside ordinary prioritization until a future explicit maintainer decision verifies **all** of these safeguards:

1. Shared cross-checkout lock identity.
2. Atomic legacy/replacement lock interoperability.
3. Destructive-stage source-drift detection, including live migration inputs.
4. Owner-identifiable safe manual recovery for orphaned locks.
5. Rollback compatibility with replacement locks.
6. Preservation of the primary reset failure when release also fails.

## Phase boundary and verification checklist

- [x] Approved merges are consolidated without deleting source records or source intent.
- [x] C-01, C-02, C-03, and C-08 are separated as shipped baselines from open improvements.
- [x] Accepted, exploratory, decision-gate, idea, merged, and Future-only dispositions remain intact without roadmap metadata or priority.
- [x] Contradictory/stale evidence is preserved with its reconciliation context.
- [x] C-11, C-28, C-29, C-31, and other unresolved scope questions remain explicit and unprioritized.
- [x] C-18 retains all six safeguards and is not revived.
- [ ] Assign `RM-###` IDs, roadmap status/horizon pairs, rationale, dependencies, completion evidence, and dated initiative history (task 3.2).
- [ ] Prioritize eligible work (task 3.3).

## Decision history

| Date | Decision | Evidence |
|---|---|---|
| 2026-08-24 | Phase 3.1 completed reconciliation from the approved checkpoint dispositions; no initiative metadata, prioritization, publication, runtime change, or recovery activation was performed. | `candidate-inventory.md`; `review-ledger.md`; `tasks.md` task 3.1. |
