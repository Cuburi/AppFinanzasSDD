# Initial pocket balances

Issue: #197 — feature: add initial pocket balances during setup
Branch: `feat/initial-pocket-balances`

## Goal

Allow first-time personal setup to create a pocket with an optional starting balance without forcing the user to discover the separate external-deposit form.

## Scope

- Add an optional initial-balance input to the create-pocket UI.
- When provided, create the pocket and register an external deposit for that amount.
- Preserve current create-pocket behavior when no initial balance is provided.
- Surface safe failure behavior if pocket creation succeeds but initial deposit/refresh fails.
- Keep the existing standalone external-deposit flow.

## Non-goals

- No database schema changes.
- No import/bulk onboarding flow.
- No credit-card UI work; that is issue #198.

## Tasks

- [x] Update Pockets page create form and behavior.
- [x] Update frontend tests for create without initial balance, create with initial balance, and initial-deposit failure behavior.
- [x] Run focused verification.
- [x] Complete RDD review.
- [ ] Commit the approved work.

## Acceptance checks

- Creating a pocket without initial balance still only calls the create-pocket API and shows the new active pocket.
- Creating a pocket with initial balance registers an external deposit using the created pocket id and reloads balances.
- Invalid/negative initial balances are rejected before mutation by native form constraints or app validation.
- If initial deposit fails after pocket creation, the UI clearly says the pocket was created but the starting balance was not registered.

## Evidence

- `pnpm --dir client test -- PocketsPage.test.tsx` — passed (24 files, 209 tests; PocketsPage: 12 tests).
- `pnpm --dir client typecheck` — passed.
- `git diff --check -- client/src/pages/PocketsPage.tsx client/src/pages/PocketsPage.test.tsx odd/tasks/initial-pocket-balances.md` — passed.
- RDD review `review-af140e7c4f2dc1ea` — approved and acknowledged.
