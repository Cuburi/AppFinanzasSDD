# Personal-use money workflow stabilization

Issue: #202 — feature: stabilize personal-use money workflows
Branch: `feat/personal-use-money-workflows`

## Goal

Stabilize the highest-impact personal production frictions in one PR while keeping the implementation split into reviewable work-unit commits.

## Scope

- Repair the Active Month layout regression where the expense registration panel and recent movements area separate into an awkward broken layout with excessive empty space.
- Normalize currency and numeric entry so money fields do not preserve malformed leading-zero values like `0124`, and COP display is consistent across the affected screens.
- Make pockets operational for day-to-day use by supporting pocket withdrawals/spending and simple external pocket deposits that do not require a category or active-month funding source.

## Non-goals

- No recurring expenses in this PR.
- No Template collapsible categories in this PR.
- No full redesign of Pockets beyond what is required for external deposit and withdrawal/spend operations.
- No broad replacement of native selects/category selection in this PR unless required for the layout bug.

## Work units

1. Active Month layout stabilization.
2. Money formatting and numeric input normalization.
3. Pocket external deposits and withdrawals/spend.

## Tasks

- [x] Explore current layout, money formatting, and pocket movement contracts.
- [x] Fix Active Month registration/recent-movements layout and commit it.
- [x] Normalize affected money/number inputs and COP formatting and commit it.
- [ ] Add pocket external deposit and withdrawal/spend flow and commit it.
- [ ] Run full focused checks, native review/fallback if needed, and prepare PR.

## Acceptance checks

- Active Month expense registration and recent movements render as a coherent responsive layout without large unintended gaps at desktop widths.
- Affected money inputs normalize or reject malformed leading-zero values, and submitted amounts are stored/displayed consistently as COP.
- Pocket UI exposes clear actions for external deposit and withdrawal/spend from a pocket.
- Pocket withdrawal/spend updates the pocket balance safely and is represented in pocket movement history.
- External pocket deposits can be recorded without selecting an active-month category or month-funded source.
- Existing financial flows covered by tests keep passing, with focused tests added for the new pocket and formatting behavior.

## Evidence

- Exploration mapped Active Month workspace CSS, duplicated money formatting, and pocket movement contracts.
- Layout fix pins the expense registration slip and monthly ledger to the first dashboard workspace row while secondary actions remain below.
- `pnpm --dir client test -- visual-system.contract.test.ts ActiveMonthPage.test.tsx` — passed (24 files, 215 tests).
- `pnpm --dir client typecheck` — passed.
- `git diff --check -- client/src/styles.css client/src/visual-system.contract.test.ts` — passed.
- Commit `e4f1d19` — `fix(active-month): stabilize workspace layout`.
- Money normalization added shared `client/src/lib/money.ts` helpers for COP display plus leading-zero amount normalization.
- Writer verification: focused money/page tests passed (84 tests), `pnpm --dir client typecheck` passed, `git diff --check` passed.
- Native assessment was unassessable because current untracked helper/test files require explicit declaration; per ASSESS plan, independent verifier ran.
- Independent verifier passed: focused tests (84 tests) and `pnpm --dir client typecheck` passed.
