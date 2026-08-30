# Product Roadmap Candidate Inventory

## Review boundary

This is an evidence-based, non-exhaustive **checkpoint disposition record**. It is not the canonical roadmap, contains no `RM-###` IDs, and assigns no final horizons, roadmap statuses, or delivery commitments. The recorded maintainer dispositions make candidates eligible for later reconciliation only; they do not publish initiatives.

**Verified against:** repository `HEAD` at `22cf238`, active OpenSpec artifacts, product documents, Git history, and active Engram observations on 2026-08-20; maintainer new-intent declarations on 2026-08-23 and 2026-08-24; maintainer checkpoint dispositions on 2026-08-24.

## How to review this packet

1. Review the recorded checkpoint disposition and preserved source intent for each candidate.
2. Add missing product intent using the intake fields in [Maintainer additions](#maintainer-additions).
3. Do not prioritize, assign a committed horizon, assign a roadmap status, create an `RM-###` ID, or publish any candidate until later phases.

## Candidate overview

| Ref | Candidate | Current interpretation | Conflict / duplicate | Maintainer disposition (2026-08-24) |
|---|---|---|---|---|
| C-01 | Monthly financial core | Implemented foundation; improvements remain separate. | None found. | `record-shipped` — shipped baseline; improvements remain separate. |
| C-02 | Basic active-month reports | Current code provides basic reports; broader report outcomes remain separate. | Historical report scope is broader than current behavior. | `record-shipped` — shipped baseline; C-19/C-20 remain separate. |
| C-19 | Cross-month comparison/reporting | Historical reporting intent includes comparison beyond the active month; no independent comparison outcome is evidenced in the current basic report surface. | Related to C-02, but active-month reporting is not cross-month comparison. | `accept` — retained as a distinct candidate. |
| C-20 | PDF report export | Historical reporting intent includes a PDF-form report; no independent PDF report outcome is evidenced. | Related to C-02 and C-15, but neither basic reporting nor backup/data export is a PDF report. | `decision needed` — retained as an idea, not committed. |
| C-03 | Active Month decision surface | Current code shows budget-used, spent, income, available money, and cash; UX improvements remain separate. | Older documents call the dashboard partial. | `record-shipped` — shipped baseline; UX improvements remain separate. |
| C-04 | Recurring expenses | No recurring-expense implementation found. | Merged into C-24 while preserving expense outcomes. | `merge` into C-24. |
| C-05 | Recurring income | No recurring-income implementation found. | Merged into C-24 while preserving income outcomes. | `merge` into C-24. |
| C-06 | Pocket allocation and goal-excess automation | Manual funding exists; full allocation and completed-goal excess automation do not. | Related to C-07, but the user outcome differs. | `accept`. |
| C-07 | Explicit zero-out surplus closeout | Closing supports pocket transfers; explicit zero-out outcome is not evidenced. | Related to C-06, not duplicate. | `accept`. |
| C-08 | Credit-card statement-period clarity | Current dashboard separates closed and in-progress periods. | Technical-debt document still says frontend presentation is pending. | `record-shipped` — shipped baseline. |
| C-09 | Credit-card statement payment tracking | Not implemented; original purchase must not be double-counted. | Depends on C-10 identity/history. | `accept`. |
| C-10 | Credit-card statement history | Current endpoint is a rolling snapshot, not browseable history. | Supports C-09; not duplicate. | `accept`. |
| C-11 | Debt integration with monthly cash/cycle | Independent debt ledger is implemented; financial integration is not. | Cash, available-money, and monthly-movement effects are unresolved. | `accept` — decision-and-exploration initiative, not committed implementation. |
| C-12 | Financial mutation retry protection | Retried financial CREATE requests can duplicate financial mutations. | Excludes transactions and blanket PATCH/DELETE idempotency. | `accept` — request-level duplicate protection for retried financial CREATE mutations only. |
| C-13 | Product-quality evidence safeguards | Browser accessibility/responsive checks, coverage, lint, and assertion cleanup remain open. | Quality sub-items may split later. | `accept` — may split later. |
| C-14 | Identity and privacy decision | Single implicit user remains intentional; identity/privacy requirements are unresolved. | Authentication is an implementation consequence, not an approved priority. | `accept` — future decision gate, not auth implementation. |
| C-15 | Backup/export | Explicit future capability; ownership, privacy, and restore are unresolved. | Export is also an unfulfilled historical reports story. | `accept` — future capability. |
| C-16 | Multi-user support | Current product is single-user and personal-use focused. | Depends on C-14. | `decision needed` — retain as a future idea. |
| C-17 | Bank integration | Explicit future-MVP idea; no implementation evidence found. | None found. | `decision needed` — retain as a distant exploratory idea. |
| C-18 | Production recovery | Deferred and Future-only; PR3A recovery work was withdrawn. | No duplicate; must preserve six gates. | `decision needed` — deferred/Future-only with all six safeguards. |
| C-21 | Money-input interaction quality | Money entry needs formatting, correct zero/placeholder behavior, and no native numeric steppers. | Related to C-03 and C-13, but is a concrete cross-product input outcome. | `accept`. |
| C-22 | Grouped category and subcategory information | Category/subcategory information can overload the user. | C-23 is merged into this combined initiative; both source intents are preserved. | `accept` — combined information-overload initiative with C-23. |
| C-23 | Grouped income information | Income information can overload the user. | Merged into C-22 while preserving income source intent. | `merge` into C-22. |
| C-24 | Recurring financial operations | Fixed/recurring income and expenses need one coherent recurring-operations capability. | Consolidates C-04 and C-05; lifecycle/frequency rules remain future discovery. | `accept` — consolidated recurring financial operations. |
| C-25 | Movements view redesign | The movements view needs clearer organization by category and subcategory. | Related to C-22 and C-26; final interaction model is unresolved. | `accept`. |
| C-26 | Dependent category/subcategory selection | Subcategory choices must filter by the selected category. | Related to C-22 and C-25, not a duplicate of information organization. | `accept`. |
| C-27 | Destructive-action confirmation | Destructive user actions need confirmation protection where justified. | Exact action scope is unresolved; do not assume a global confirmation pattern. | `accept`. |
| C-28 | Pocket withdrawal semantics | A user needs to withdraw money from a pocket without corrupting financial meaning. | Accounting semantics are unresolved. | `accept` — unresolved accounting semantics. |
| C-29 | Uncategorized expense recording | A user needs to record an expense without a category or subcategory when appropriate. | Accounting/reporting semantics are unresolved. | `accept` — unresolved accounting/reporting semantics. |
| C-30 | Holistic UI refinement | The product needs a broader UI refinement initiative beginning with a screen-by-screen audit. | Must not absorb concrete UX candidates. | `decision needed` — retain as a separate exploratory screen-by-screen audit. |
| C-31 | Financial-threshold notifications | A user may need notice when a financial threshold is reached. | Thresholds, trigger events, and channels are unresolved. | `decision needed` — retained as an exploratory idea. |
| C-32 | Personal deployment decision | A personal deployment path requires an operational decision. | Hosting and implementation are deliberately unchosen. | `accept` — operational decision initiative only. |

## Candidate details

### C-01 — Monthly financial core

- **Problem / outcome:** A person must keep current-month availability accurate through income, expense, cash, pocket, budget, and closing flows; the intended outcome is a reliable daily financial loop.
- **Scope / non-goals:** Includes the existing single-user monthly lifecycle and its financial meanings. It does not claim multi-user support, recovery, or every downstream workflow is complete.
- **Dependencies / rationale:** Foundation for all financial-core candidates. `PRODUCT.md` describes the primary job and distinct financial meanings.
- **Provenance and completion evidence:** `repo:PRODUCT.md:11-31`; `repo:client/src/pages/ActiveMonthPage.tsx:197-642`; `repo:client/src/pages/ActiveMonthPage.tsx:662-713`; `repo:user-stories.md:20-34,83-96`; `engram:#2562`. Current code supports the named flows, but no current end-to-end daily-use observation proves completion.
- **Conflicts / duplicates:** None found.
- **Maintainer disposition (2026-08-24):** `record-shipped` — shipped baseline; improvements remain separate.

### C-02 — Basic active-month reports

- **Problem / outcome:** The user needs active-month spending, surplus, and deficit information; the outcome is a usable basic report surface without claiming comparison or PDF export.
- **Scope / non-goals:** Current scope is active-month-only summary and ranked subcategories. It excludes cross-month comparison and PDF export.
- **Dependencies / rationale:** Depends on C-01 monthly data. It closes part of the reporting loop, but historical report stories describe a larger capability.
- **Provenance and completion evidence:** `repo:client/src/pages/ReportsPage.tsx:36-142`; `repo:server/src/modules/monthly-cycle/mappers/report-mappers.ts:61-93`; `repo:server/src/modules/monthly-cycle/routes.ts:263-266`; `engram:#487`; `engram:#496`; Git `3c8181a`, `82be477`.
- **Conflicts / duplicates:** `repo:user-stories.md:69-79` and `repo:plan-implementacion.md:149-165` say reports have no module/page, contradicting current repository evidence. Their unfulfilled comparison/PDF outcomes are not duplicates of the current basic report.
- **Maintainer disposition (2026-08-24):** `record-shipped` — shipped baseline; C-19 cross-month reporting and C-20 PDF report export remain separate.

### C-19 — Cross-month comparison/reporting

- **Problem / outcome:** An active-month report does not let the user compare financial results across months; the intended outcome is a clearly bounded cross-month comparison or reporting capability.
- **Scope / non-goals:** Covers comparison or reporting across distinct months only. It does not claim that the current active-month report is incomplete, does not define comparison metrics or presentation, and does not include PDF export.
- **Dependencies / rationale:** Depends on C-01 monthly data and on a maintainer decision about the comparison outcome that is valuable for personal use. C-02 supplies the active-month report baseline, but it does not provide this distinct cross-month outcome.
- **Provenance and completion evidence:** `repo:user-stories.md:69-79`; `repo:plan-implementacion.md:149-165`; `repo:client/src/pages/ReportsPage.tsx:36-142`; `repo:server/src/modules/monthly-cycle/mappers/report-mappers.ts:61-93`; `repo:server/src/modules/monthly-cycle/routes.ts:263-266`. Historical sources preserve the broader reporting intent, while the current reviewed report surface is active-month-only; no cross-month comparison completion evidence was identified.
- **Conflicts / duplicates:** Related to C-02 but not a duplicate: C-02 is the current active-month report surface. Related historical reporting language may overlap with C-20, but comparison/reporting and PDF output are independently reviewable outcomes.
- **Maintainer disposition (2026-08-24):** `accept` — distinct cross-month reporting candidate; no priority, horizon, roadmap status, or RM ID is assigned here.

### C-20 — PDF report export

- **Problem / outcome:** A user may need a shareable or printable report artifact; the intended outcome is a bounded PDF export of a report.
- **Scope / non-goals:** Covers PDF report generation only. It excludes backups, raw data portability, restore/recovery, off-device storage, and defining the report’s content, privacy policy, or delivery mechanism.
- **Dependencies / rationale:** Depends on C-02 or a maintainer-defined report scope, plus any relevant C-14 identity/privacy decision. It must remain separate from C-15 because a PDF report is a presentation artifact, whereas backup/data export concerns portable or recoverable data.
- **Provenance and completion evidence:** `repo:user-stories.md:69-79`; `repo:plan-implementacion.md:149-165`; `repo:client/src/pages/ReportsPage.tsx:36-142`; `repo:server/src/modules/monthly-cycle/mappers/report-mappers.ts:61-93`; `repo:server/src/modules/monthly-cycle/routes.ts:263-266`. Historical sources preserve the PDF report intent, and the reviewed current report surface provides no PDF export completion evidence.
- **Conflicts / duplicates:** Related to C-02 and C-19 as reporting outcomes, but not a duplicate. Related to C-15 only at a data/privacy decision boundary; C-15 explicitly excludes PDF report export and must not be treated as this candidate.
- **Maintainer disposition (2026-08-24):** `decision needed` — retained as an idea, not committed; no priority, horizon, roadmap status, or RM ID is assigned here.

### C-03 — Active Month decision surface

- **Problem / outcome:** The primary user job is understanding available money quickly; the outcome is an understandable daily Active Month surface with budget, spent, income, available money, and cash context.
- **Scope / non-goals:** Covers the decision surface, not notifications, reports, or a claim that every workflow is visible at once.
- **Dependencies / rationale:** Depends on C-01. Active Month is documented as the primary operational dashboard.
- **Provenance and completion evidence:** `repo:PRODUCT.md:11-15,40-45`; `repo:client/src/pages/ActiveMonthPage.tsx:209-215,615-642`; `engram:#1449`.
- **Conflicts / duplicates:** `repo:user-stories.md:36-42` and `repo:plan-implementacion.md:111-118` predate the current budget-used implementation and call the dashboard partial. They may describe remaining usability/polish rather than an absent surface.
- **Maintainer disposition (2026-08-24):** `record-shipped` — shipped baseline; UX improvements remain separate.

### C-04 — Recurring expenses

- **Problem / outcome:** Re-entering predictable monthly expenses is repetitive; the outcome is a controlled recurring-expense workflow.
- **Scope / non-goals:** No behavior, schedule rules, or implementation design is approved here.
- **Dependencies / rationale:** Requires C-01’s month and expense semantics.
- **Provenance and completion evidence:** `repo:user-stories.md:27-34`; `repo:plan-implementacion.md:89-98`; repository search found no recurring-expense implementation.
- **Conflicts / duplicates:** None found.
- **Maintainer disposition (2026-08-24):** `merge` into C-24 recurring financial operations; preserve the recurring-expense outcome and provenance.

### C-05 — Recurring income

- **Problem / outcome:** Predictable income should be available without repeated manual entry; the outcome is a future recurring-income workflow with clear current-versus-future edit rules.
- **Scope / non-goals:** Excludes a priority commitment and excludes inferring recurrence from existing monthly-income CRUD.
- **Dependencies / rationale:** Requires C-01 and a policy for creation on month open and changes to future amounts.
- **Provenance and completion evidence:** `engram:#222`; `repo:client/src/pages/ActiveMonthPage.tsx:531-580`; repository search found no recurring-income implementation.
- **Conflicts / duplicates:** None found.
- **Maintainer disposition (2026-08-24):** `merge` into C-24 recurring financial operations; preserve the recurring-income outcome and provenance.

### C-06 — Pocket allocation and goal-excess automation

- **Problem / outcome:** Pockets can be funded manually, but the user cannot rely on complete monthly allocation rules or automatic routing of excess after a goal is met; the outcome is predictable automated pocket behavior.
- **Scope / non-goals:** Includes allocation and completed-goal excess rules; it does not duplicate C-07’s explicit closeout choice.
- **Dependencies / rationale:** Depends on C-01 and pocket movement semantics.
- **Provenance and completion evidence:** `repo:user-stories.md:53-61`; `repo:plan-implementacion.md:137-145`; `repo:client/src/pages/ActiveMonthPage.tsx:584-613`; Git `bdc51e1`, `5719367`, `a02746a`.
- **Conflicts / duplicates:** Related to C-07 but targets a different outcome.
- **Maintainer disposition (2026-08-24):** `accept` — retain the manual-funding evidence for later reconciliation.

### C-07 — Explicit zero-out surplus closeout

- **Problem / outcome:** A user can transfer surplus to a pocket at close, but cannot explicitly reset a surplus to zero without accumulating it; the outcome is a deliberate closeout choice.
- **Scope / non-goals:** Covers the missing zero-out option only; it does not redesign pocket allocation.
- **Dependencies / rationale:** Depends on C-01 closing behavior and is related to C-06.
- **Provenance and completion evidence:** `repo:user-stories.md:63-67`; `repo:plan-implementacion.md:149-155`.
- **Conflicts / duplicates:** Related to C-06, not a duplicate.
- **Maintainer disposition (2026-08-24):** `accept`.

### C-08 — Credit-card statement-period clarity

- **Problem / outcome:** A user must distinguish payable closed-statement debt from new-cycle spending; the outcome is a truthful period split in the dashboard.
- **Scope / non-goals:** Read-only period clarity only; payment tracking and history remain C-09 and C-10.
- **Dependencies / rationale:** Depends on the current statement API and C-01 expense linkage.
- **Provenance and completion evidence:** `repo:client/src/pages/CreditCardsPage.tsx:87-135`; `engram:#1155`; Git `92cf906`.
- **Conflicts / duplicates:** `repo:docs/product/technical-debt.md:5-50` says frontend presentation remains pending, while current UI renders separate closed and in-progress periods. This is status drift, not evidence to delete.
- **Maintainer disposition (2026-08-24):** `record-shipped` — shipped baseline.

### C-09 — Credit-card statement payment tracking

- **Problem / outcome:** The user cannot record whether a closed statement was paid; the outcome is payment tracking that preserves original consumption and avoids double-counting an expense.
- **Scope / non-goals:** Includes statement-level full/partial payment semantics; excludes inventing payments from card balance changes.
- **Dependencies / rationale:** Requires C-10’s stable statement identity/history and financial correctness rules.
- **Provenance and completion evidence:** `repo:docs/product/technical-debt.md:52-88`. No payment-tracking implementation was found in the reviewed current statement surface.
- **Conflicts / duplicates:** Depends on C-10; not duplicate.
- **Maintainer disposition (2026-08-24):** `accept`.

### C-10 — Credit-card statement history

- **Problem / outcome:** A rolling endpoint loses prior closed statements after a cutoff; the outcome is browseable, addressable historical statements for reconciliation and payment linkage.
- **Scope / non-goals:** Includes stable statement identity and history policy; excludes treating the rolling summary as an audit trail.
- **Dependencies / rationale:** Supports C-09 and depends on a reconciliation policy for later expense edits.
- **Provenance and completion evidence:** `repo:docs/product/technical-debt.md:90-112`; `engram:#1198`.
- **Conflicts / duplicates:** Supports C-09; not duplicate.
- **Maintainer disposition (2026-08-24):** `accept`.

### C-11 — Debt integration with monthly cash/cycle

- **Problem / outcome:** Debt records work independently, but payments do not yet participate in monthly cash/cycle truth; the outcome is an explicitly decided financial integration boundary.
- **Scope / non-goals:** This is not a claim that independent debt tracking is incomplete.
- **Dependencies / rationale:** Requires C-01 financial semantics and a decision on whether/how debt payments affect available money and cash.
- **Provenance and completion evidence:** `repo:user-stories.md:44-51`; `repo:plan-implementacion.md:126-135`.
- **Conflicts / duplicates:** None found.
- **Maintainer disposition (2026-08-24):** `accept` — decision-and-exploration initiative only; cash, available-money, and monthly-movement effects remain unresolved.

### C-12 — Financial mutation retry protection

- **Problem / outcome:** Retried create requests can duplicate financial mutations; the outcome is request-level duplicate protection where a repeated HTTP request must not create a second movement.
- **Scope / non-goals:** Does not treat database transactions or resource-state PATCH/DELETE behavior as request idempotency.
- **Dependencies / rationale:** Cross-cuts C-01 and any future money-moving workflow.
- **Provenance and completion evidence:** `engram:#2404`; reviewed paths recorded there include monthly-cycle, pockets, and credit-card mutation flows.
- **Conflicts / duplicates:** None found.
- **Maintainer disposition (2026-08-24):** `accept` — narrowly limited to request-level duplicate protection for retried financial CREATE mutations; transactions and blanket PATCH/DELETE idempotency are excluded.

### C-13 — Product-quality evidence safeguards

- **Problem / outcome:** The product lacks mature evidence for visual accessibility, responsive behavior, coverage, lint, and some assertion quality; the outcome is reliable evidence before broader frontend growth.
- **Scope / non-goals:** This inventory groups related safeguards for review; the maintainer may later split them into separate work units.
- **Dependencies / rationale:** Supports every user-facing candidate and does not change product behavior by itself.
- **Provenance and completion evidence:** `repo:user-stories.md:108-118`; `engram:#11` confirms unit/integration runners but no coverage or lint; current repository includes browser evidence only for selected monthly-ledger work.
- **Conflicts / duplicates:** Quality sub-items may need a later split, but none are silently merged or retired here.
- **Maintainer disposition (2026-08-24):** `accept` — quality sub-items may split later.

### C-14 — Identity and privacy decision

- **Problem / outcome:** The product uses one implicit user and has unresolved privacy and authentication requirements; the outcome is a maintainer decision that can safely constrain future identity work.
- **Scope / non-goals:** This is a decision gate, not approval to implement authentication.
- **Dependencies / rationale:** Blocks reliable scoping of C-15 and C-16.
- **Provenance and completion evidence:** `repo:PRODUCT.md:29-32`; `repo:user-stories.md:11-16`; `repo:plan-implementacion.md:47-54`.
- **Conflicts / duplicates:** Authentication backlog entries are implementation possibilities under this broader product decision.
- **Maintainer disposition (2026-08-24):** `accept` — future decision gate only, not authentication implementation.

### C-15 — Backup/export

- **Problem / outcome:** The user may need portable or recoverable personal data; the outcome is an explicitly scoped backup/export capability after data-ownership decisions are made.
- **Scope / non-goals:** Does not authorize PDF report export, off-device backup, or production recovery implementation.
- **Dependencies / rationale:** Depends on C-14 and a data/privacy decision.
- **Provenance and completion evidence:** `repo:PRODUCT.md:32`; `repo:user-stories.md:69-79,100-107`; `repo:plan-implementacion.md:203-209`.
- **Conflicts / duplicates:** PDF report export is a narrower historical reporting story; backup/export is broader data portability. Do not merge without maintainer decision.
- **Maintainer disposition (2026-08-24):** `accept` — future capability; ownership, privacy, and restore remain unresolved.

### C-16 — Multi-user support

- **Problem / outcome:** The current implicit single-user model cannot serve shared or distinct users; the outcome is a deliberately scoped multi-user capability if personal-use needs change.
- **Scope / non-goals:** Does not authorize identity architecture or broad growth work.
- **Dependencies / rationale:** Depends on C-14.
- **Provenance and completion evidence:** `repo:PRODUCT.md:29-32`; `repo:user-stories.md:100-107`; `repo:plan-implementacion.md:203-209`.
- **Conflicts / duplicates:** None found.
- **Maintainer disposition (2026-08-24):** `decision needed` — retain as a future idea; the product remains personal-use focused.

### C-17 — Bank integration

- **Problem / outcome:** Bank integration is listed as a future opportunity; the outcome would need maintainer-defined value and boundaries before any work is proposed.
- **Scope / non-goals:** No provider, synchronization, or priority is implied.
- **Dependencies / rationale:** Depends on C-14 and a data ownership/privacy decision.
- **Provenance and completion evidence:** `repo:user-stories.md:100-107`; `repo:plan-implementacion.md:203-209`. No implementation evidence was found.
- **Conflicts / duplicates:** None found.
- **Maintainer disposition (2026-08-24):** `decision needed` — retain as a distant exploratory idea.

### C-18 — Production recovery

- **Problem / outcome:** Future personal production recovery must be safe, local, auditable, and separately designed; the outcome is not active recovery work but preservation of the future acceptance gate.
- **Scope / non-goals:** **Deferred / Future-only.** It does not authorize implementation, ordinary prioritization, backup automation, or revive withdrawn PR3A work.
- **Dependencies / rationale:** Requires an explicit future maintainer decision plus all six safety gates below. The guarded local reset at `HEAD` is a preserved baseline, not this capability.
- **Provenance and completion evidence:** `openspec:openspec/changes/establish-repository-delivery-workflow/specs/personal-production-recovery/spec.md:1-18`; `openspec:openspec/changes/establish-repository-delivery-workflow/verify-report-pr3a.md:1-17`; Git `22cf238`; `engram:#2562`. The recovery-lock implementation was withdrawn, so no completion claim is valid.
- **Six historical safeguards:** (1) shared cross-checkout lock identity; (2) atomic legacy/replacement lock interoperability; (3) destructive-stage source-drift detection including live migration inputs; (4) owner-identifiable safe manual recovery for orphaned locks; (5) rollback compatibility with replacement locks; (6) preservation of the primary reset failure if release also fails.
- **Conflicts / duplicates:** None found. Any absent or unverifiable gate keeps this candidate Future-only.
- **Maintainer disposition (2026-08-24):** `decision needed` — remain deferred / Future-only and preserve all six safeguards until every gate is explicitly designed and approved.

### C-21 — Money-input interaction quality

- **Problem / outcome:** Money fields currently create avoidable entry friction; the intended outcome is consistent formatting, correct zero and placeholder behavior, and no native numeric steppers across the product.
- **Scope / non-goals:** Covers money-input interaction behavior wherever money is entered. It does not prescribe a shared component, currency locale, validation policy, or a visual redesign.
- **Dependencies / rationale:** Depends on an inventory of money-entry surfaces and preservation of existing financial validation and decimal semantics. This is an explicit maintainer usability and correctness concern.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-03’s daily decision surface and C-13’s product-quality safeguards, but neither defines this concrete input outcome.
- **Maintainer disposition (2026-08-24):** `accept` — scope audit and behavior rules remain unresolved; no priority, horizon, roadmap status, or RM ID is assigned here.

### C-22 — Grouped category and subcategory information

- **Problem / outcome:** Flat category and subcategory information can overload the user; the intended outcome is grouped or collapsible organization that improves scanability.
- **Scope / non-goals:** Covers presentation and information organization for categories and subcategories. It does not define the wrapper type, default expanded state, persistence, or selection/filtering behavior.
- **Dependencies / rationale:** Depends on identifying every category/subcategory presentation surface. It is intentionally separate from C-26, which concerns selection dependency rather than information organization.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-26 and C-25; no evidence-backed duplicate merge is made before the checkpoint.
- **Maintainer disposition (2026-08-24):** `accept` — combined initiative for reducing information overload across category/subcategory and income sections; C-23 is merged here and both source intents are preserved.

### C-23 — Grouped income information

- **Problem / outcome:** Income information needs the same reduction in information overload as category information; the intended outcome is grouped or collapsible income organization.
- **Scope / non-goals:** Covers income information organization only. It does not assume that income uses the same UI structure as C-22, nor does it introduce recurring-income behavior.
- **Dependencies / rationale:** Depends on identifying income presentation surfaces and on the maintainer later deciding whether a shared information architecture is appropriate.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Parallel to C-22, but income and category information are distinct product domains; it is not merged by assumption.
- **Maintainer disposition (2026-08-24):** `merge` into C-22; preserve this record's income source intent in the accepted combined initiative for reducing information overload.

### C-24 — Recurring financial operations

- **Problem / outcome:** Fixed or recurring income and fixed or recurring expenses require repeated manual entry; the intended outcome is one coherent recurring-financial-operations capability covering both sides.
- **Scope / non-goals:** Covers the combined product outcome for recurring income and expenses. Frequency, creation timing, edit propagation, pause/resume, deletion, lifecycle, and financial posting rules are explicitly deferred to a dedicated SDD cycle.
- **Dependencies / rationale:** Depends on C-01 financial semantics and later policy decisions for month lifecycle and future changes. It preserves both existing evidence streams rather than allowing one side to disappear.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; `repo:user-stories.md:27-34`; `repo:plan-implementacion.md:89-98`; `engram:#222`. No recurring implementation is claimed.
- **Conflicts / duplicates:** Reconciles overlapping C-04 recurring-expense and C-05 recurring-income candidates as linked components of this unified candidate. C-04 and C-05 remain in the queue with their original provenance until the maintainer records whether to merge, retain as linked candidates, or retire them.
- **Maintainer disposition (2026-08-24):** `accept` — consolidated recurring financial operations; C-04 and C-05 are merged into this candidate while preserving income and expense outcomes. Lifecycle rules remain unresolved.

### C-25 — Movements view redesign

- **Problem / outcome:** The movements view needs clearer organization by category and subcategory; the intended outcome is a more understandable movements experience.
- **Scope / non-goals:** Covers redesign of the movements view’s organization. It does not choose a final interaction model, navigation pattern, filters, grouping behavior, or implementation approach.
- **Dependencies / rationale:** Depends on later exploration of the current movements workflow and relates to category/subcategory organization and selection concerns.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-22 and C-26 but has a separate screen-level outcome; it is not merged before interaction discovery.
- **Maintainer disposition (2026-08-24):** `accept` — final interaction model remains unresolved.

### C-26 — Dependent category/subcategory selection

- **Problem / outcome:** Users need subcategory choices constrained by the selected category; the intended outcome is dependent filtering that prevents irrelevant subcategory selection.
- **Scope / non-goals:** Covers category-to-subcategory filtering during selection. It does not define category taxonomy changes, category management, or the grouped/collapsible presentation in C-22.
- **Dependencies / rationale:** Depends on authoritative category/subcategory relationships and on preserving valid existing financial records when editing or viewing past movements.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-22 and C-25 but functionally distinct from visual organization; no duplicate merge is warranted.
- **Maintainer disposition (2026-08-24):** `accept` — edit, migration, and empty-state behavior remain unresolved.

### C-27 — Destructive-action confirmation

- **Problem / outcome:** Destructive user actions need protection against accidental loss; the intended outcome is confirmation where the action’s risk warrants it.
- **Scope / non-goals:** Does not impose confirmation globally. The applicable actions, irreversibility threshold, confirmation language, and undo alternatives must be determined later.
- **Dependencies / rationale:** Depends on an action inventory and product-specific consequences for each destructive operation; broad assumptions would overreach the maintainer’s intent.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** No evidence-backed duplicate found. It may later intersect with deletion flows in several domains.
- **Maintainer disposition (2026-08-24):** `accept` — exact protection scope remains unresolved.

### C-28 — Pocket withdrawal semantics

- **Problem / outcome:** A user needs to withdraw money from a pocket while keeping financial semantics correct; the intended outcome is a reliable pocket-withdrawal operation.
- **Scope / non-goals:** Covers the withdrawal outcome only. It does not define whether withdrawal becomes cash, available money, a transfer, or an expense, and it does not redesign allocation or closeout.
- **Dependencies / rationale:** Depends on C-01 money meanings and existing pocket movement semantics; financial correctness must be designed before implementation.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-06 allocation and C-07 closeout, but withdrawal has its own money-moving semantics and is not a duplicate.
- **Maintainer disposition (2026-08-24):** `accept` — accounting semantics remain unresolved.

### C-29 — Uncategorized expense recording

- **Problem / outcome:** A user sometimes needs to record an expense without requiring a category or subcategory; the intended outcome is a valid uncategorized-expense path.
- **Scope / non-goals:** Covers allowing the record to be created without those classifications. It does not define default labels, budget allocation, reporting placement, analytics treatment, or later recategorization behavior.
- **Dependencies / rationale:** Depends on C-01 expense semantics and explicit accounting/reporting rules so flexibility does not make financial results misleading.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-02 reporting, C-03 active-month visibility, and C-25 movements organization, but the ability to record an uncategorized expense is a distinct outcome.
- **Maintainer disposition (2026-08-24):** `accept` — accounting and reporting semantics remain unresolved.

### C-30 — Holistic UI refinement

- **Problem / outcome:** The product needs broader UI refinement beyond isolated fixes; the intended outcome is a coherent improvement program beginning with a screen-by-screen audit.
- **Scope / non-goals:** The first step is a dedicated SDD exploration of each current screen. This candidate does not invent a redesign, prescribe visual direction, define components, or claim that C-03/C-13 fully cover the maintainer’s broader intent.
- **Dependencies / rationale:** Depends on a future screen audit that identifies evidence-backed UI issues, users’ primary workflows, and appropriate slices. This preserves the maintainer decision recorded in `engram:#2588`.
- **Provenance and completion evidence:** `maintainer:2026-08-23` — new product intent; `engram:#2588`. It does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-03’s Active Month usability and C-13’s quality evidence, but broader than either. Those candidates remain intact pending explicit reconciliation.
- **Maintainer disposition (2026-08-24):** `decision needed` — retain as a separate exploratory screen-by-screen audit; it must not absorb the concrete accepted UX candidates.

### C-31 — Financial-threshold notifications

- **Problem / outcome:** A user may need timely notice when a financial threshold is reached; the intended outcome is an exploratory notification capability whose value and safety boundaries are decided before implementation.
- **Scope / non-goals:** Does not define a threshold amount or formula, trigger event, channel, scheduling behavior, delivery provider, persistence, or notification implementation.
- **Dependencies / rationale:** Depends on later maintainer decisions about meaningful financial thresholds, trustworthy trigger events, and appropriate channels. Financial ambiguity must be resolved before a notification can be considered for implementation.
- **Provenance and completion evidence:** `maintainer:2026-08-24` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** No evidence-backed duplicate found. Related to the Active Month decision surface (C-03), but a notification is a distinct proactive outcome.
- **Maintainer disposition (2026-08-24):** `decision needed` — retained as an exploratory idea; thresholds, trigger events, and channels remain unresolved.

### C-32 — Personal deployment decision

- **Problem / outcome:** A personal deployment path requires an explicit operational decision before any environment can be selected; the intended outcome is a deliberately scoped deployment decision initiative.
- **Scope / non-goals:** Does not choose hosting, a provider, a topology, credentials, automation, operational procedures, or implementation work.
- **Dependencies / rationale:** Depends on later ownership, privacy, security, operational-support, and recovery-boundary decisions. It must not promote production recovery or imply a hosting implementation.
- **Provenance and completion evidence:** `maintainer:2026-08-24` — new product intent; it does not claim historical implementation or completion.
- **Conflicts / duplicates:** Related to C-14 identity/privacy, C-15 backup/export, and C-18 production recovery, but is a distinct operational decision and does not replace any of them.
- **Maintainer disposition (2026-08-24):** `accept` — operational decision initiative only; hosting is unchosen and implementation is not implied.

## Maintainer additions

The maintainer supplied the following normalized new-intent additions on 2026-08-23 and 2026-08-24. They are formalized in the same candidate queue as C-21 through C-32. Dated provenance records new intent only; the separate checkpoint disposition records the maintainer decision. Neither assigns priority, a final horizon, a roadmap status, an RM ID, or canonical-roadmap publication.

| Ref | Maintainer addition | Required intake context | Provenance |
|---|---|---|---|
| C-21 | Money-input interaction quality | Formatting, zero/placeholder behavior, and removal of native steppers; product-wide scope audit remains open. | `maintainer:2026-08-23` |
| C-22 | Grouped category/subcategory information | Reduce overload with grouped or collapsible wrappers; wrapper behavior remains open. | `maintainer:2026-08-23` |
| C-23 | Grouped income information | Apply equivalent grouped/collapsible organization; domain-specific interaction remains open. | `maintainer:2026-08-23` |
| C-24 | Recurring financial operations | Cover fixed/recurring income and expenses; detailed frequency/lifecycle rules require a dedicated SDD cycle. | `maintainer:2026-08-23` |
| C-25 | Movements view redesign | Improve organization by category/subcategory; final interaction model remains future exploration. | `maintainer:2026-08-23` |
| C-26 | Dependent category/subcategory selection | Filter subcategories by selected category; edit and empty-state rules remain open. | `maintainer:2026-08-23` |
| C-27 | Destructive-action confirmation | Protect destructive actions where needed; exact scope is deliberately not globally assumed. | `maintainer:2026-08-23` |
| C-28 | Pocket withdrawal semantics | Enable withdrawal with correct financial semantics; accounting treatment remains open. | `maintainer:2026-08-23` |
| C-29 | Uncategorized expense recording | Permit no-category/no-subcategory expenses; accounting and reporting effects remain open. | `maintainer:2026-08-23` |
| C-30 | Holistic UI refinement | Begin with a screen-by-screen audit in its own SDD exploration; no redesign is invented now. | `maintainer:2026-08-23`; `engram:#2588` |
| C-31 | Financial-threshold notifications | Exploratory notification idea; thresholds, trigger events, and channels remain unresolved. | `maintainer:2026-08-24` |
| C-32 | Personal deployment decision | Operational decision initiative only; hosting and implementation remain unchosen. | `maintainer:2026-08-24` |

Each record above supplies its problem, intended outcome, scope/non-goals, dependencies, rationale, and provenance in its detailed candidate section. A new candidate must be added to this queue before it can be considered:

| Required field | Maintainer entry |
|---|---|
| Title | |
| Product problem | |
| Intended outcome | |
| Scope / non-goals | |
| Dependencies | |
| Rationale | |
| Provenance | `maintainer:YYYY-MM-DD` only for a new-intent declaration; it cannot claim historical implementation or completion. |

## Reconciliation notes

- Current repository evidence supersedes stale labels only after the maintainer records a disposition; this packet does not silently delete historical candidates.
- C-02 basic active-month reports and C-08 credit-card statement-period clarity are `record-shipped` baselines; older contradictory documents remain preserved as status drift, while C-19 cross-month reporting and C-20 PDF report export remain separate candidates.
- C-24 is the accepted consolidated recurring-financial-operations candidate. C-04 recurring expenses and C-05 recurring income are explicitly merged into C-24; their original records, provenance, and both income/expense outcomes are preserved. Frequency and lifecycle rules remain unresolved.
- C-22 is the accepted combined initiative for reducing information overload across category/subcategory and income sections. C-23 is explicitly merged into C-22; both source intents remain preserved. C-25 movements redesign and C-26 dependent selection remain distinct accepted candidates because they solve different outcomes.
- C-30 remains a separate exploratory screen-by-screen UI audit. It must not absorb C-21, the C-22/C-23 merged initiative, C-25, C-26, or C-27.
- C-11, C-28, C-29, and C-31 preserve explicit unresolved financial or product-semantics questions. Acceptance or retention does not claim an implementation outcome.
- C-12 is limited to retried financial CREATE mutations; it excludes transaction semantics and blanket PATCH/DELETE idempotency.
- C-32 is an operational decision initiative; it neither chooses hosting nor implies deployment implementation.
- The checkpoint records dispositions only. No candidate has a priority, final horizon, roadmap status, RM ID, or canonical-roadmap entry.
- Production recovery remains deferred / Future-only and preserves all six historical safeguards.

## HARD Maintainer Checkpoint history

**Checkpoint completed:** 2026-08-24. All candidates C-01 through C-32 have an explicit maintainer disposition. This history records candidate dispositions and merge relationships only; it is not prioritization, final-horizon assignment, roadmap-status assignment, RM-ID assignment, or canonical-roadmap publication.

| Block | Candidate dispositions | Checkpoint evidence |
|---|---|---|
| Shipped baselines | C-01, C-02, C-03, and C-08: `record-shipped` as shipped baselines; their specified improvements remain separate. | Current implementation evidence remains cited in each candidate record; no broader completion claim is added. |
| Experience | C-21, C-22, C-25, C-26, and C-27: `accept`. C-23: `merge` into C-22 as one accepted information-overload initiative while preserving both source intents. C-30: `decision needed`, retained as a separate exploratory screen-by-screen audit. | Concrete UX candidates remain distinct from C-30. |
| Automation / flexibility | C-24: `accept`; C-04 and C-05: `merge` into C-24 with income and expense outcomes preserved. C-06, C-07, C-28, and C-29: `accept`; C-28 accounting semantics and C-29 accounting/reporting semantics remain unresolved. | C-24 lifecycle rules and the unresolved money semantics remain future decision work. |
| Cards / debt | C-09 and C-10: `accept`. C-11: `accept` as decision-and-exploration, not committed implementation. | C-11 cash, available-money, and monthly-movement effects remain unresolved. |
| Reports / quality | C-19, C-12, and C-13: `accept`. C-20: `decision needed`, retained as an idea. C-31: `decision needed`, retained as an exploratory idea. | C-12 is restricted to retried financial CREATE mutations; C-31 thresholds, triggers, and channels are unresolved. |
| Identity / data / operations | C-14 and C-15: `accept` as future decision/capability records. C-16 and C-17: `decision needed`, retained as future ideas. C-18: `decision needed`, deferred / Future-only. C-32: `accept` as an operational decision initiative. | Product remains personal-use focused; C-18 retains all six safeguards; C-32 does not choose hosting or imply implementation. |
