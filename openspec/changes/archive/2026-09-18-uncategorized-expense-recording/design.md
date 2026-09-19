# Design: Uncategorized Expense Recording (RM-026)

## Technical Approach

Represent uncategorized expenses with nullable `Movement.sourceSubcategoryId`. Normalize omission/null at HTTP, derive category from a supplied snapshot subcategory, and propagate nullable contracts through readers and UI. Existing categorized requests remain valid; no synthetic budget node or migration is needed.

For JD-B-002, close and every existing-month mutation run in a Prisma interactive transaction and first acquire the same PostgreSQL row lock through `months.lockForMutation(monthId)`. The adapter executes a parameterized `SELECT ... FOR UPDATE` on `Month`, then rereads the aggregate. Status and business invariants are evaluated only after the lock is held; the lock remains until commit or rollback.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|---|---|---|
| Store `sourceSubcategoryId = null` | Reserved category; new table | Existing schema/migration already support nullable storage and `SetNull`; synthetic structure corrupts budget meaning. |
| Derive category from the month snapshot | Independently writable category | Makes partial classification unrepresentable while retaining subcategory transport. |
| Use `classification=uncategorized` | ID sentinel | A named criterion cannot collide with a real subcategory; only the Prisma adapter maps it to `IS NULL`. |
| Make month remaining authoritative at close | Transfer category surplus | Uncategorized spending reduces remaining money but not category balance. Surplus is budget variance, not cash. |
| Serialize on the owning `Month` row | Memory check; serializable-only; advisory lock; trigger | The stable row exists for every aggregate. `FOR UPDATE` fits current Prisma/PostgreSQL transactions, orders close with child writes, and needs no migration. |

## Data Flow

```text
UI (subcategory ID or null) -> expense DTO -> transaction
  -> lock Month row -> reread/assert ACTIVE -> validate -> write child -> commit

Prisma -> balances/history/report/ledger mappers -> nullable API -> client
close request -> transaction -> lock same row -> reread/review -> close -> commit
```

At closure, `availableMoney` is the real cash-availability invariant. With income 10,000, an uncategorized non-cash expense 10,000, and category surplus 10,000, `availableMoney` is 0 and the active month closes. The preserved surplus is informational variance: it neither blocks closure nor produces/recreates transferable cash. Existing category-deficit handling remains unchanged.

If close locks first, a competing writer waits, rereads `CLOSED`, and rolls back with `MONTH_NOT_ACTIVE`. If a writer locks first, close waits and recomputes from the committed write before deciding. Thus no write can commit after the close linearization point.

## Interfaces / Contracts

```ts
type ExpenseClassification =
  | { category: { id: string; name: string }; subcategory: { id: string; name: string } }
  | { category: null; subcategory: null };

type ExpenseHistoryCriterion = { kind: "ANY" } | { kind: "SUBCATEGORY"; subcategoryId: string } | { kind: "UNCATEGORIZED" };

type ClosureCategoryVarianceView = {
  subcategoryId: string; subcategoryName: string; amount: number;
  kind: "SURPLUS" | "DEFICIT"; informational: true;
};

interface MonthRepositoryPort {
  lockForMutation(monthId: string): Promise<MonthRecord>;
}
```

Inputs use `sourceSubcategoryId: string | null`; history and ledger carry `ExpenseClassification`. Closure exposes positive variance as non-transferable “budget variance.” `lockForMutation` is valid only on transaction-scoped ports. Expense/income create-update-delete, categorization, cash withdrawal, month-backed deposits, closure actions, structure changes, and close MUST call it before reads or writes.

## File Changes

| Files | Action | Description |
|---|---|---|
| `dto/{expenses,history,reports,ledger,closure}.dto.ts` | Modify | Nullable contracts, filters, closure variance. |
| `workflows/{movement-service,month-lifecycle-service}.ts`, `application/use-cases/{movement,income,cash,month-structure,closure}-use-cases.ts`, `shared/{month-queries,service-types}.ts`, `application/ports/monthly-cycle-ports.ts` | Modify | Lock-first orchestration and contracts for every mutator. |
| `infrastructure/prisma/monthly-cycle-prisma-adapters.ts`, `mappers/{monthly-cycle,report,ledger}-mappers.ts` | Modify | Row lock, null persistence, null-safe reads. |
| `client/src/{types.ts,lib/api.ts,pages/{ActiveMonthPage,ReportsPage}.tsx,features/monthly-cycle/active-month-dashboard/**}` | Modify | Optional selection, grouping, variance UI. |
| `infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` and relevant tests | Modify | Nullable, closure, and lock-order coverage. |

Routes, `monthly-cycle.module.ts`, and `monthly-cycle-service-contract.ts` remain wiring-only. `balance-calculator.ts` and `cash-ledger.ts` retain their calculations.

## Testing Strategy

| Layer | RED-first coverage |
|---|---|
| Unit | Income 10,000 + uncategorized expense 10,000 yields `availableMoney = 0`, surplus 10,000, informational variance, `canClose = true`, then `CLOSED`. Every mutator must lock before writing and reject locked `CLOSED`. |
| Integration | Preserve active-to-closed numeric coverage and closed reads/rejections. Real PostgreSQL uses instrumented lock signals and deferred barriers, never sleeps: close-first tests every mutator rejects unchanged; expense-first proves close rereads the committed expense and rejects when closure becomes invalid. Assert status, row counts, and error codes. |
| Frontend | Show reconciled month remaining and non-transferable budget variance; cover selection, filtering, report group, labels, and closed controls. |

Run `pnpm --dir server test && pnpm --dir server build`, then `pnpm --dir client check`.

## Migration / Rollout

No Prisma migration. Deploy all lock-participating paths together; mixed old/new writers are unsafe, so pause writers during rollout if multiple server instances overlap. Rollback disables writes before reverting the lock protocol. Tasks must split backend concurrency, contract/closure, read model, frontend, and roadmap work for review.

## Open Questions

None.
