# Credit card management UI

Issue: #198 — feature: add credit card management UI
Branch: `feat/credit-card-management-ui`

## Goal

Turn the Credit Cards page from read-only inventory into a production-minimum management surface for personal setup and ongoing maintenance.

## Scope

- Add client API/types for creating, updating, activating, and inactivating credit cards.
- Add a create-card form to the Credit Cards page.
- Add edit controls for existing cards.
- Add activate/inactivate actions for card lifecycle management.
- Refresh card inventory and statement summaries after successful mutations.
- Preserve statement totals and safe partial-success/error messaging.

## Non-goals

- No credit-card payment flow.
- No statement math changes.
- No backend schema changes unless exploration proves a hard API gap.
- No expense-capture changes beyond preserving existing card selection behavior.

## Tasks

- [x] Add client credit-card mutation API/types.
- [x] Add create/edit/activate/inactivate UI behavior.
- [x] Add frontend tests for management flows and failure handling.
- [x] Add API contract coverage for credit-card mutation calls.
- [x] Run focused verification.
- [x] Complete independent verification fallback.
- [ ] Commit the verified work.

## Acceptance checks

- Empty Credit Cards page offers a usable create-card form.
- Creating a card calls the backend mutation and refreshes cards/statements.
- Editing card fields calls update and refreshes cards/statements.
- Active cards can be inactivated; inactive cards can be reactivated when visible.
- Backend validation errors are shown without pretending success.
- Successful mutation with failed refresh reports partial success instead of full failure.

## Evidence

- `pnpm --dir client test -- CreditCardsPage.test.tsx` — passed (24 files, 213 tests).
- `pnpm --dir client typecheck` — passed.
- `git diff --check -- client/src/types.ts client/src/lib/api.ts client/src/pages/CreditCardsPage.tsx client/src/pages/CreditCardsPage.test.tsx odd/tasks/credit-card-management-ui.md` — passed (line-ending warnings only).
- `pnpm --dir client test -- CreditCardsPage.test.tsx api.test.ts` — passed (24 files, 214 tests).
- `git diff --check -- client/src/types.ts client/src/lib/api.ts client/src/lib/api.test.ts client/src/pages/CreditCardsPage.tsx client/src/pages/CreditCardsPage.test.tsx odd/tasks/credit-card-management-ui.md` — passed (line-ending warnings only).
- `pnpm check:client` — passed (24 files, 214 tests; build passed).
- Native RDD review was unavailable because `gentle_review` reported `package-local-binary-missing`; `gentle_review assess` returned `unassessable` and required an independent verifier.
- Independent verifier `quick card ui verify` — passed with `NONE` findings by diff/file inspection.
