# Active Month Structure Editor and Template Propagation

Issue: #209
Branch: `fix/active-month-template-rename-sync`

## Decision

The previous copy-only solution was insufficient. The Active Month structure editor must become clear and usable, visually close to the Template editor, and support an explicit option for current-month structure edits to also update the future-month Template when safe.

## Tasks

- [x] Reopen and approve issue #209 for this slice.
- [x] Confirm current Template/Active Month behavior and initial copy-only approach.
- [x] Re-scope design for a Template-like Active Month structure editor.
- [x] Design identity-safe propagation from month edits to Template.
- [x] Implement backend support for explicit Template propagation from Active Month edits.
- [x] Redesign the Active Month structure editor UI and tests.
- [x] Run focused checks and prepare a reviewable commit.

## Evidence

- Exploration found Template saves intentionally replace future-month template data, while Active Month stores copied snapshot names and `Actualizar información` only refetches the active month.
- User rejected the copy-only outcome as unclear: `Ajustes del mes` is too generic, the editing UI is chaotic, and the user expects this editor to be very similar to Template.
- User selected the larger scope: redesign UI plus propagate existing edits to Template.
- Subagent exploration found a required prerequisite: Template saves must preserve Template category/subcategory IDs before Active Month edits can safely propagate to Template. Current delete/recreate saves null existing month links in PostgreSQL.
- User selected one large PR rather than splitting identity preservation and UI/propagation into separate PRs.
- Backend/API propagation accepts optional `updateTemplate` (default false) on existing category/subcategory PATCH requests. Targets resolve exclusively from stored links; missing/stale links, wrong subcategory parents, inactive Template subcategories and duplicate Template names reject before writes. Opt-in mutations use serializable transactions and return MonthView; deletes remain month-only.
- Subcategory propagation copies the edited name/amount and effective month default pocket (including explicit null); an omitted pocket retains the month pocket, not the Template pocket.
- Active Month now exposes `Editar categorías de este mes`, reuses Template category cards/disclosures and subtotals, and edits names, amounts and pockets inline within the selected item. Creation actions are grouped below existing categories with consistent explicit future-Template labels. Linked edits expose unchecked `updateTemplate`; unlinked edits disable it with an explanation. Closed-month structure remains read-only and deletions remain month-only.
- UI test-first evidence: updated behavior tests initially failed on the missing editor name; the new responsive CSS contract failed on missing row rules. Final focused verification passed: `pnpm --dir client exec vitest run src/pages/ActiveMonthPage.test.tsx` (57 tests), `pnpm --dir client exec vitest run src/visual-system.contract.test.ts` (21 tests). Tests cover linked opt-in and month-only payloads, unavailable links, cancellation reset, creation promotion, closed-month transitions and deletion guards. Test mock queues are reset between cases; ledger assertions wait for asynchronous rows rather than only the containing region.
- Parent updated TemplatePage note/save feedback to reference `Editar categorías de este mes` instead of the old `Ajustes del mes` label.
- Added focused parser/use-case, adapter, service rollback and client serialization tests. Parent verification passed: `pnpm --dir client exec vitest run src/lib/api.test.ts src/pages/TemplatePage.test.tsx` (37 tests), focused server adapter/use-case/integration/routes tests, `pnpm --dir server run --if-present typecheck`, and `git diff --check`. An attempted `pnpm --dir server typecheck` failed because no server typecheck script exists.
- Final focused verification passed: `pnpm --dir client exec vitest run src/lib/api.test.ts src/pages/TemplatePage.test.tsx src/pages/ActiveMonthPage.test.tsx src/visual-system.contract.test.ts` (115 tests), `pnpm --dir client typecheck`, focused server adapter/use-case/integration/routes tests (105 tests), `pnpm --dir server run --if-present typecheck`, and `git diff --check`.
