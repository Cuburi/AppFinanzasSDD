# Personal-use UI polish

Issue: #205 — feature: polish personal-use UI workflows
Branch: `feat/personal-use-ui-polish`

## Goal

Polish the remaining personal-use UI friction points as a coherent, reviewable UI slice after the core money workflows were promoted.

## Scope

- Improve Active Month secondary panels opened by `Registrar ingreso`, `Retirar efectivo`, and `Depositar bolsillo` so they use available space clearly and responsively.
- Add collapsible Template category groups for readable future-month planning.
- Improve category/subcategory selection efficiency where long selectors slow daily use.
- Review and polish the Pockets UI around deposits, withdrawals, balances, and recent movements.
- Add stable Template/budget card visual polish inspired by the Active Month 3D hover direction without reintroducing layout regressions.
- Improve hero/card padding, borders, and spacing where content feels too close to edges.

## Non-goals

- No recurring incomes or recurring expenses in this PR.
- No Excel export in this PR.
- No database schema changes unless exploration proves a UI behavior absolutely requires one.
- No broad redesign beyond the approved personal-use UI polish scope.

## Work units

1. Explore current UI structures and define a small implementation order.
2. Active Month secondary panel layout polish.
3. Template collapsible category groups and stable visual polish.
4. Category/subcategory selector efficiency improvements.
5. Pockets UI polish.
6. Final responsive/visual contract checks and PR preparation.

## Tasks

- [x] Explore current Active Month, Template, selector, and Pockets UI structures.
- [x] Improve Active Month secondary panel layout and commit it.
- [x] Add Template collapsible groups plus stable card polish and commit it.
- [x] Improve category/subcategory selection efficiency and commit it.
- [ ] Polish Pockets UI and commit it.
- [ ] Run checks, native review/fallback if needed, and prepare PR.

## Acceptance checks

- Active Month secondary panels do not leave awkward unused space at desktop widths and remain usable on narrower screens.
- Template category groups can collapse/expand with understandable controls and no loss of editing behavior.
- Category/subcategory selection is faster or clearer in the most painful flows.
- Pockets page presents deposit/withdrawal actions, balances, and movement history with production-minimum clarity.
- Visual polish is stable, performant, and respects reduced-motion constraints where motion is added.
- Focused tests or visual-system contract checks cover the main UI regressions, and relevant client checks pass.

## Evidence

- Exploration mapped Active Month secondary panels in `client/src/pages/ActiveMonthPage.tsx`, shared `RegistrationSlip`, Template category cards, Pockets movement cards, and visual CSS contracts.
- Implementation order chosen: secondary panels first, selector usability, Template collapsibles/visual polish, Pockets presentation, then final motion/card contracts.
- Risk: avoid replacing native selects with a custom combobox in this PR unless necessary; group/clarify native selectors first to avoid accessibility scope creep.
- Active Month secondary panels now wrap disclosed income, cash withdrawal, and pocket deposit slips in `.secondary-form-panel`, spanning the full desktop workspace and collapsing safely on narrow screens.
- Verification passed: `pnpm --dir client exec vitest run src/visual-system.contract.test.ts src/pages/ActiveMonthPage.test.tsx` (67 tests), full accidental client suite (225 tests), `pnpm --dir client typecheck`, and `git diff --check`.
- Commit `f622627` — `fix(active-month): widen secondary panels`.
- Template category cards now use controlled native `details` disclosures, start open, stay collapsed across ordinary rerenders, and keep existing save/edit behavior.
- Verification passed: `pnpm --dir client exec vitest run src/pages/TemplatePage.test.tsx src/visual-system.contract.test.ts` (21 tests), full accidental client suite (227 tests), and `pnpm --dir client typecheck`.
- Commit `8952b53` — `feat(template): collapse category groups`.
- Active Month expense and pocket-deposit source subcategory selectors now use native category `<optgroup>` grouping while preserving selected subcategory IDs.
- Verification passed: `pnpm --dir client vitest run src/pages/ActiveMonthPage.test.tsx` (53 tests) and `pnpm --dir client typecheck`.
