# Active Month daily-use polish

Issue: #213 — bug: polish active month daily-use date time and menu
Branch: `fix/active-month-daily-use-polish`

## Goal

Fix the highest-friction Active Month daily-use issues in one reviewable slice: expense date defaults, meaningful movement times, and the responsive menu trigger.

## Scope

- Make `Registrar gasto` default to the correct daily-use date behavior.
- Investigate and fix movement ledger time display so records do not all appear with the same misleading time when meaningful times are available.
- Polish the responsive menu trigger and drawer entry point, especially the button that opens the menu.

## Non-goals

- No template-to-active-month synchronization semantics in this slice.
- No broad movement filtering/sorting redesign.
- No new reporting features.
- No unrelated visual redesign beyond the responsive menu trigger and drawer entry polish needed for this issue.

## Work units

1. Explore the date/time data flow and responsive menu implementation.
2. Fix expense date default behavior with focused tests.
3. Fix or clarify ledger time display with focused tests.
4. Polish responsive menu trigger/drawer entry with focused tests or browser evidence.
5. Run checks, review, and prepare PR to `dev`.

## Tasks

- [x] Explore current Active Month expense defaults, ledger time formatting, and responsive menu code.
- [x] Fix `Registrar gasto` date default behavior.
- [x] Fix meaningful movement time display.
- [x] Polish responsive menu trigger/drawer entry.
- [ ] Run focused checks and prepare reviewable commits/PR.

## Acceptance checks

- New expense registration starts from the intended current daily date instead of a misleading month-default date.
- Movement ledger rows show meaningful distinct times when the underlying movement timestamps are distinct.
- Responsive menu trigger is visible, touch-friendly, and visually coherent on narrow viewports.
- Focused tests or browser evidence cover the changed behavior.
- Relevant client checks pass.

## Evidence

- 2026-10-09: Consolidated scattered recent findings into issue #213 after closing #208–#211.
- Exploration mapped `client/src/pages/ActiveMonthPage.tsx` for date defaults/payloads, `MonthlyLedger.tsx` for rendered times, and `App.tsx`/`client/src/styles.css` for responsive menu trigger behavior.
- Implementation updates new Active Month movements to default to today's date when the active month is current and submit an ISO timestamp using the selected calendar day plus current clock time; edit flows preserve their existing date-only correction behavior.
- Responsive menu trigger now uses the shared button styling, keeps a 44px touch target, and includes a visible menu icon with the `Menú` label.
- Verification passed: `pnpm --dir client exec vitest run src/pages/ActiveMonthPage.test.tsx src/features/monthly-cycle/active-month-dashboard/components/MonthlyLedger.test.tsx src/App.test.tsx src/visual-system.contract.test.ts` (94 tests), `pnpm --dir client typecheck`, and `git diff --check`.
