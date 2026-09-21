# RM-012 Idempotent Financial Creates

## Intent

Prevent retried financial CREATE requests from producing duplicate money records or ledger movements.

## Scope

- Add explicit request-level idempotency for selected financial `POST` endpoints.
- Use a client-supplied `Idempotency-Key` plus server-side method/path/body fingerprinting.
- Return the original successful response for an exact replay.
- Reject same-key requests when the method/path/body fingerprint differs.

## Initial endpoint target set

- `POST /api/months/:id/expenses`
- `POST /api/months/:id/cash-withdrawals`
- `POST /api/months/:id/incomes`
- `POST /api/pockets/deposits`
- `POST /api/months/:id/closure-actions`
- `POST /api/debts/:id/payments`

## Non-goals

- PATCH/DELETE idempotency.
- Natural duplicate detection based on payload contents.
- Blanket transaction redesign.
- Non-money setup creates unless later explicitly promoted.

## Work units

1. [x] Define server idempotency persistence and route helper.
2. [x] Apply the helper to selected financial create routes with focused server tests.
3. [x] Generate and send stable client idempotency keys per submit with focused client tests.
4. [x] Run focused and broader verification, then update evidence.

## Verification plan

Focused first:

- `pnpm --dir server test -- src/modules/monthly-cycle/routes.test.ts`
- `pnpm --dir server test -- src/modules/debts/http/debts.routes.test.ts`
- `pnpm --dir client test -- src/lib/api.test.ts src/lib/api.debts.test.ts`

Broader before delivery:

- `pnpm --dir server test`
- `pnpm --dir client test`
- `pnpm --dir client typecheck`

## Rollback boundary

Revert this task document plus idempotency schema/helper changes, selected route wiring/tests, and client API key generation changes. This should remove RM-012 without affecting RM-026 or unrelated roadmap updates.

## Evidence log

- 2026-09-20: Created ODD task from roadmap RM-012 and read-only exploration result.
- 2026-09-20: Added `IdempotencyRecord` schema/migration, reusable idempotency store/helper, and in-memory helper tests for replay, conflict, and missing-key compatibility.
- 2026-09-20: Wired idempotency to selected financial create routes only: month expenses, cash withdrawals, incomes, pocket deposits, closure actions, and debt payments.
- 2026-09-20: Updated client API to generate a fresh `Idempotency-Key` for the selected create calls, with focused API tests asserting the headers.
- 2026-09-20: `pnpm --dir server test -- src/lib/idempotency.test.ts` timed out after 120s because the package script ignores the path argument and ran the broader server suite; the new helper/debt-route tests passed before unrelated PostgreSQL migration/lock tests failed or hung.
- 2026-09-20: `pnpm --dir server exec node --import tsx --test src/lib/idempotency.test.ts src/modules/monthly-cycle/routes.test.ts src/modules/debts/http/debts.routes.test.ts` passed: 41 tests, 0 failures.
- 2026-09-20: `pnpm --dir client test -- src/lib/api.test.ts src/lib/api.debts.test.ts` passed: Vitest reported 24 files and 203 tests because the script ignored the path arguments.
- 2026-09-20: `pnpm --dir client typecheck` passed.
- 2026-09-20: `pnpm --dir server build` passed.
- 2026-09-20: Independent verification reran `pnpm --dir server exec node --import tsx --test src/lib/idempotency.test.ts src/modules/monthly-cycle/routes.test.ts src/modules/debts/http/debts.routes.test.ts`; passed with 41 tests, 0 failures.
- 2026-09-20: Independent verification ran `pnpm --dir client test -- src/lib/api.test.ts src/lib/api.debts.test.ts && pnpm --dir client typecheck && pnpm --dir server build`; passed. Vitest reported 24 files and 203 tests because the script ignored the path arguments.
- 2026-09-20: Native review correction fixed `R3-idempotency-retry-key` by adding optional caller-supplied idempotency keys to the selected financial create API calls while preserving automatic key generation when omitted.
- 2026-09-20: Native review correction fixed `R3-orphaned-reservation` by abandoning pending reservations only when execution fails before a response exists; completion persistence failures remain unsafe and are not silently re-executed.
- 2026-09-20: Correction verification `pnpm --dir server exec node --import tsx --test src/lib/idempotency.test.ts src/modules/monthly-cycle/routes.test.ts src/modules/debts/http/debts.routes.test.ts` passed: 43 tests, 0 failures.
- 2026-09-20: Correction verification `pnpm --dir client test -- src/lib/api.test.ts src/lib/api.debts.test.ts` passed: Vitest reported 24 files and 206 tests because the script ran the broader suite.
- 2026-09-20: Correction verification first ran `pnpm --dir client typecheck` and failed on the new test fixture using invalid closure action type `DEFICIT_FROM_AVAILABLE_ON_CLOSE`; the fixture was corrected to `SURPLUS_TO_POCKET_ON_CLOSE`.
- 2026-09-20: Correction verification `pnpm --dir client typecheck` passed.
- 2026-09-20: Native review correction verification `pnpm --dir server exec node --import tsx --test src/lib/idempotency.test.ts` passed: 5 tests, 0 failures; completion-persistence failures now replay a stored 500 response without re-executing the request.
- 2026-09-20: Re-ran focused route/helper verification after the completion-failure correction: `pnpm --dir server exec node --import tsx --test src/lib/idempotency.test.ts src/modules/monthly-cycle/routes.test.ts src/modules/debts/http/debts.routes.test.ts` passed with 43 tests, 0 failures. `pnpm --dir client typecheck` passed.
