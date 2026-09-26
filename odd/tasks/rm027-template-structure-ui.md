# RM-027 Template Structure UI

## Intent

Refine the budget template screen so it reads as the future-month budget structure, not a flat CRUD form, while preserving template behavior.

## Boundary

In scope:

- Strengthen the template header around the future-month effect and total planned amount.
- Present categories as budget structure blocks with subtotals.
- Make subcategory rows easier to scan while keeping existing editable inputs.
- Clarify that template changes affect future months, not active months already opened.
- Preserve active pocket default selection behavior.
- Add or adjust focused tests for copy, totals, and editable structure behavior.

Out of scope:

- Changing template persistence semantics or API contracts.
- Changing Active Month current-month adjustments.
- Adding drag-and-drop, charts, or a new component library.
- Broad CSS refactors outside the template slice.

## Tasks

- [x] Map current template page tests and implementation.
- [x] Rebuild the template composition around future-month structure and budget subtotals.
- [x] Add focused tests for the new hierarchy without changing behavior.
- [x] Run focused verification.
- [ ] Commit and push only after explicit confirmation.

## Evidence log

- 2026-09-26: User selected the budget template structure screen as the next UI priority after the post-Prototype D audit, because it better connects to the current-month `Ajustes del mes` distinction: template changes affect future months, active-month adjustments affect the current month.
- `cd client && pnpm test -- TemplatePage.test.tsx`: failed as expected during RED; the newly added hierarchy and COP-format assertions were absent (2 TemplatePage assertions failed; 205 unrelated tests passed).
- `cd client && pnpm exec vitest run src/pages/TemplatePage.test.tsx`: passed after implementation (3 tests).
- `cd client && pnpm typecheck`: passed.
- 2026-09-26 parent verification after removing page-to-page formatter coupling: `pnpm --dir client test -- TemplatePage.test.tsx` passed (24 files / 207 tests); `pnpm --dir client typecheck` passed; `git diff --check -- client/src/pages/TemplatePage.tsx client/src/pages/TemplatePage.test.tsx client/src/styles.css odd/tasks/rm027-template-structure-ui.md` passed.
