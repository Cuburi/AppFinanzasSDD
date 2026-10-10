# Active Month Template Snapshot UX

Issue: #209
Branch: `fix/active-month-template-rename-sync`

## Decision

Template changes remain future-month-only. Already-open Active Months are snapshots and do not automatically sync Template renames. The fix is to make that contract clearer and guide users to the existing Active Month correction path for current-month renames.

## Tasks

- [x] Reopen and approve issue #209 for this slice.
- [x] Confirm current Template/Active Month behavior and product decision.
- [x] Improve Template and Active Month UX copy around snapshot semantics.
- [x] Add/update focused tests for the clarified contract.
- [x] Run focused checks and prepare a reviewable commit.

## Evidence

- Exploration found Template saves intentionally replace future-month template data, while Active Month stores copied snapshot names and `Actualizar información` only refetches the active month.
- User selected: keep snapshot fixed and clarify UX.
- Updated Template copy/save feedback to state that already-open months keep their snapshot and current-month renames belong in Active Month adjustments.
- Updated Active Month adjustments copy to state that Template affects future months and current-month names are corrected there.
- Verification passed: `pnpm --dir client exec vitest run src/pages/TemplatePage.test.tsx src/pages/ActiveMonthPage.test.tsx` (61 tests), `pnpm --dir client typecheck`, and `git diff --check`.
