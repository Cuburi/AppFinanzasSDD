# Proposal: Uncategorized Expense Recording (RM-026)

## Intent

Remove the daily recording barrier that forces users to invent a category for legitimate one-off expenses, while preserving truthful month totals, reporting, and closed-month immutability.

## Scope

### In Scope
- Record expenses with both category and subcategory absent; reject partial classification.
- Include uncategorized expenses in every applicable total and balance, plus a separate `Uncategorized` report group.
- Expose explicit `Uncategorized` history/list filtering and stable nullable API/UI representations.
- Allow later categorization only while the owning month is active; preserve uncategorized records after close without permitting late writes.
- Correct the canonical roadmap so RM-026 precedes RM-012 as part of normal RM-026 delivery.

### Out of Scope
- Synthetic database categories/subcategories or broader budget-model changes.
- RM-012 retry protection and any separate roadmap promotion cycle.
- Editing, deleting, recording, or categorizing expenses after month close.

## Capabilities

### New Capabilities
- `uncategorized-expense-recording`: Nullable expense classification across recording, active-month categorization, totals, reports, histories, filters, and month closure.

### Modified Capabilities
- None. The `product-roadmap` requirements remain unchanged; only canonical initiative ordering metadata is corrected.

## Approach

Use the existing nullable `Movement.sourceSubcategoryId`; do not add a synthetic category or schema migration. Enforce all-or-neither classification at DTO/application boundaries, propagate null through ports and Prisma adapters, and keep behavior in monthly-cycle use cases/workflows. Make mappers, totals, reports, filters, API types, and token-backed UI explicitly null-safe. Keep routes and module/service contracts wiring-only and preserve `assertMonthIsMutable`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `server/src/modules/monthly-cycle/{dto,application,workflows,infrastructure}` | Modified | Nullable contracts, invariants, active-month categorization |
| `server/src/modules/monthly-cycle/{mappers,shared,balance-calculator.ts}` | Modified | Truthful totals, history, ledger, reports, closure |
| `client/src/{pages,features,lib/api.ts,types.ts}` | Modified | Optional entry, filter, and accessible `Uncategorized` display |
| `docs/product/roadmap.md` | Modified | Restore RM-026 before RM-012 with decision history |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Null-unsafe reads or skipped totals | High | Contract and aggregate tests across every read model |
| Closed-month mutation regression | Medium | Central active-month guard tests for all correction paths |
| Review exceeds 400 changed lines | High | Ask before apply and split by reviewable work units |

## Rollback Plan

Stop new uncategorized writes first; retain null-safe reads/reporting for existing rows. Revert entry/categorization and roadmap ordering together; never restore null-unsafe mappers while null rows exist.

## Dependencies

- Existing nullable movement storage, RM-001 monthly-cycle behavior, and confirmed RM-026 product rules.

## Success Criteria

- [ ] Omitted/null classification records successfully; partial classification is rejected.
- [ ] Totals and balances equal classified plus uncategorized expenses, with a separate report group and explicit filter.
- [ ] Active-month categorization succeeds; every closed-month write path rejects mutation.
- [ ] Existing classified expense flows remain compatible and null histories never fail or render blank.
- [ ] The roadmap records RM-026 before RM-012 without a separate promotion cycle.
