# Monthly Income Management PR Plan

Este cambio usa **feature-branch-chain**. Abrí los PRs en este orden para que cada diff sea revisable.

> Reemplazá `#ISSUE` por el issue aprobado correspondiente y agregá exactamente un label `type:*` en cada PR.

## Orden de PRs

| Orden | Rama | Base/target | Título sugerido | Label |
|---:|---|---|---|---|
| Tracker | `feature/monthly-income-management` | `master` | `feat(income): add monthly income management` | `type:feature` |
| 1 | `feature/monthly-income-management-db-domain` | `feature/monthly-income-management` | `feat(income): add monthly income foundation` | `type:feature` |
| 2 | `feature/monthly-income-management-dto-split` | `feature/monthly-income-management-db-domain` | `refactor(monthly-cycle): split dto by subdomain` | `type:refactor` |
| 3 | `feature/monthly-income-management-backend` | `feature/monthly-income-management-dto-split` | `feat(income): add backend monthly income rules` | `type:feature` |
| 4 | `feature/monthly-income-management-ui` | `feature/monthly-income-management-backend` | `feat(income): add monthly income UI` | `type:feature` |

## PR body templates

### Tracker PR

```markdown
Closes #ISSUE

## Summary
- Tracks the full monthly income management feature chain.
- Integrates DB/domain, DTO refactor, backend rules, and UI slices.
- Final SDD verification passed after focused coverage fixes.

## Review path
Review child PRs in order: PR1 → PR2 → PR3 → PR4. Do not review this tracker diff directly unless you need the accumulated final state.

## Test plan
- [x] SDD verify passed
- [x] Server typecheck passed
- [x] Client typecheck passed
- [x] Server monthly-cycle tests passed
- [x] Client focused page tests passed
```

### PR1 — DB/domain foundation

```markdown
Closes #ISSUE

## Summary
- Adds first-class `MonthlyIncome` persistence linked to `Month`.
- Adds Prisma migration for the income table/index/FK.
- Extends backend/client contracts with income totals and availability fields.

## Out of scope
- Income CRUD behavior.
- UI changes.
- Available-money enforcement.

## Test plan
- [x] Prisma client generated successfully
- [x] Manual backend smoke validated later in the chain
```

### PR2 — DTO split

```markdown
Closes #ISSUE

## Summary
- Splits `monthly-cycle/dto.ts` into subdomain DTO files.
- Adds a `dto/index.ts` barrel and shared parser helpers.
- Updates internal imports to `./dto/index.js` for NodeNext/ESM resolution.

## Out of scope
- No behavior changes.
- No income rules or UI changes.

## Test plan
- [x] Server typecheck passed
- [x] Monthly-cycle tests passed
```

### PR3 — Backend rules/API

```markdown
Closes #ISSUE

## Summary
- Adds income CRUD endpoints guarded by active-month mutability.
- Computes `monthlyIncomeTotal` and backend-owned `availableMoney`.
- Blocks month close when `availableMoney` is positive or negative.
- Fixes Prisma Client generation to target the server package.

## Notes
- This slice has an accepted size exception because backend tests make the diff larger than 400 lines.
- No generic pocket-withdrawal-to-availability flow was added.
- Automatic recurring income remains out of scope.

## Test plan
- [x] Server typecheck passed
- [x] Monthly-cycle tests passed
- [x] Manual REST Client smoke test passed
```

### PR4 — UI/client

```markdown
Closes #ISSUE

## Summary
- Adds income CRUD UI to the active month page.
- Displays monthly income total and available money from backend responses.
- Shows close-month blockers for monthly surplus/deficit availability.
- Adds focused UI tests and final verify coverage tests.

## Out of scope
- Recurring income automation.
- Generic withdrawal from pocket back to monthly availability.

## Test plan
- [x] Client typecheck passed
- [x] ActiveMonthPage and CloseMonthPage tests passed
- [x] Server verification-gap tests passed
- [x] SDD verify passed
```

## Final verification evidence

- Server typecheck: passed
- Client typecheck: passed
- Server tests: 44 passed
- Client focused tests: 11 passed
- SDD verify verdict: PASS
- Build: not run by project convention
