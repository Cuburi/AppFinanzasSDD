## Exploration: Uncategorized expense recording (RM-026)

### Current State
The monthly-cycle domain already models `Movement.sourceSubcategoryId` as nullable in Prisma and in most movement infrastructure types, but the expense boundary makes it mandatory. `RecordExpenseInput.sourceSubcategoryId` is a required string; its DTO parser rejects omission; the movement workflow verifies the subcategory exists; and the client expense selector is required. Therefore the database can store an uncategorized expense, but the application cannot create or render one safely.

Expenses are `MovementType.EXPENSE` rows linked to a `Month`. Cash expenses reduce cash; non-cash expenses reduce available/subcategory balance through `calculateMonthBalances`. The month is currently mutable only while `ACTIVE`; record, edit, and delete all call `assertMonthIsMutable`, and the UI disables correction controls for closed months. “Valid after close” must therefore be clarified as persistence/reporting after close versus permitting late writes to a closed month.

There is no `openspec/config.yaml` in the repository, so project-specific OpenSpec phase rules are unavailable. Existing roadmap evidence confirms the approved RM-026 semantics and that RM-012 is deferred; this exploration does not alter roadmap files.

### Affected Areas
- `prisma/schema.prisma` — `Movement.sourceSubcategoryId` is already nullable with `onDelete: SetNull`; no category foreign key exists on movements.
- `prisma/migrations/20260503032841_init_monthly_cycle/migration.sql` and later migrations — migration history must be checked during implementation; nullable storage likely needs no destructive migration unless a constraint/index or backfill is introduced.
- `server/src/modules/monthly-cycle/dto/expenses.dto.ts` — make classification optional while preserving validation for supplied IDs and explicit null semantics.
- `server/src/modules/monthly-cycle/workflows/movement-service.ts` — remove mandatory subcategory lookup for uncategorized expenses, retain month/date/payment/cash/card invariants, and decide closed-month write policy.
- `server/src/modules/monthly-cycle/application/use-cases/movement-use-cases.ts`, `application/ports/monthly-cycle-ports.ts`, `shared/service-types.ts`, `infrastructure/prisma/monthly-cycle-prisma-adapters.ts` — propagate nullable classification through use-case, port, adapter, and Prisma update/create contracts.
- `server/src/modules/monthly-cycle/routes.ts` — endpoint wiring is already suitable; DTO behavior and error responses need contract tests, not route-to-Prisma changes.
- `server/src/modules/monthly-cycle/mappers/monthly-cycle-mappers.ts` — `mapExpenseHistory` currently throws when no subcategory context exists; map null classification to a stable `Uncategorized` representation instead.
- `server/src/modules/monthly-cycle/mappers/ledger-mappers.ts` — ledger entries already tolerate nullable movement IDs, but expense source/destination semantics and display identity need an explicit uncategorized contract.
- `server/src/modules/monthly-cycle/mappers/report-mappers.ts` — spending totals currently skip expenses without `sourceSubcategoryId`; total cash/non-cash spend must include them, while subcategory rankings must not invent a category.
- `server/src/modules/monthly-cycle/balance-calculator.ts` and `shared/cash-ledger.ts` — verify both cash and non-cash uncategorized expenses reduce the correct month totals without requiring a subcategory balance.
- `server/src/modules/monthly-cycle/application/use-cases/expense-history-use-cases.ts`, DTO history filters, and routes — history must return uncategorized rows and support an intentional “uncategorized” filter representation rather than treating missing values as an invalid ID.
- `server/src/modules/monthly-cycle/application/use-cases/closure-use-cases.ts` — closure operates on subcategory balances and available money; uncategorized spending should affect month-wide available/cash truth but must not create a synthetic pending subcategory or closure transfer.
- `client/src/pages/ActiveMonthPage.tsx` — expense selector is required and submission always sends a string; edit/reset/history display and closed-month messaging need nullable classification handling.
- `client/src/types.ts`, `client/src/lib/api.ts` — API input and history item types currently require category/subcategory objects; update to represent nullable classification and the UI label contract.
- `client/src/features/monthly-cycle/active-month-dashboard/components/MonthlyLedger.tsx`, reports pages/components, and related tests — display `Uncategorized`, preserve accessible labels/status text, and avoid blank identities.
- `server/src/modules/monthly-cycle/dto/expenses.dto.test.ts`, `workflows`/use-case tests, mapper/report/ledger tests, `server/src/modules/monthly-cycle/routes.test.ts`, `client/src/pages/ActiveMonthPage.test.tsx`, and dashboard/report tests — Strict-TDD insertion points for omitted/null classification, later categorization, totals, history, filters, and closed-month behavior.

### Classification consistency
The current model stores only a subcategory reference; category is derived through the month snapshot. A supplied subcategory necessarily implies a category because `findMonthSubcategory` searches nested month categories. A subcategory without category is therefore impossible in the current domain. The recommended invariant is: `sourceSubcategoryId = null` means both category and subcategory are absent; never accept a category-only classification. If later categorization is supported, it should update the same expense’s nullable subcategory, subject to the same month ownership rule.

### Approaches
1. **True nullable classification** — retain `sourceSubcategoryId = null` and expose nullable classification in application/API views.
   - Pros: matches existing Prisma nullability and `SetNull` deletion behavior; no synthetic budget bucket; preserves truthful absence; avoids template/category pollution; straightforward backward compatibility for existing rows.
   - Cons: every mapper, report, filter, client type, and test must handle null explicitly; aggregate reports need a deliberate uncategorized policy.
   - Effort: Medium

2. **Synthetic database category/subcategory** — create a reserved “Uncategorized” month category/subcategory and assign every unclassified expense to it.
   - Pros: reuses existing subcategory joins, selectors, balances, and report grouping with fewer nullable API shapes.
   - Cons: changes budget semantics by creating a pseudo-budget line; requires creation/protection across every month/template and migration/backfill decisions; deletion/renaming and user-created name collisions are risks; does not represent “no classification” truthfully; can distort closure surplus/deficit and category reports.
   - Effort: High

3. **Separate expense classification table/fields** — add explicit category state or an expense aggregate independent of generic movements.
   - Pros: future-proof for richer classification/audit workflows.
   - Cons: unnecessary data-model expansion because the generic movement already supports null; duplicates movement identity and correction paths; high migration and reporting complexity.
   - Effort: High

### Recommendation
Use true nullable classification. It is already the persistence model, best matches the approved product semantics, and keeps uncategorized expenses outside category budgets while still allowing month-wide cash/available totals and ledger history to count them. Define one API representation for classification (prefer `category: null` and `subcategory: null`, with presentation text `Uncategorized`) and apply it consistently across history, ledger, reports, filters, and client forms. Keep category-only invalid. Treat later categorization as an optional update, not a validity requirement.

Before implementation, resolve closed-month write semantics: the current architecture explicitly makes closed months immutable, while the approved wording says the uncategorized state remains valid after close. Unless late corrections are deliberately authorized, preserve immutability and interpret this as persistence/reporting after closure. Also decide whether reports show an uncategorized aggregate row, only include it in headline totals, or both; and define the filter query encoding for uncategorized history.

### Risks
- Existing `mapExpenseHistory` throws on null classification, so backend persistence alone would break history reads.
- Report totals currently skip null-source expenses; changing only the UI would produce financially false totals.
- Closed-month correction/late-recording semantics conflict with the existing `assertMonthIsMutable` contract and require an explicit product decision.
- Deleting a month subcategory already nulls movement references; after this change, that behavior becomes an expected uncategorized transition and must be tested.
- Synthetic-category implementation would contaminate budget and closure semantics; avoid unless product explicitly wants an actual budget bucket.
- Existing API clients sending valid subcategory IDs remain compatible; clients assuming non-null response classification may need a versioned/communicated contract update.
- No repository `openspec/config.yaml` was found, so testing commands and project-specific SDD rules must be supplied by later phases.

### Ready for Proposal
Yes, for the nullable-classification approach, with two product decisions recorded before proposal approval: whether closed months permit late expense writes or only retain/report existing uncategorized rows, and the exact report/filter presentation of uncategorized spending.
