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
- [ ] Improve Active Month secondary panel layout and commit it.
- [ ] Add Template collapsible groups plus stable card polish and commit it.
- [ ] Improve category/subcategory selection efficiency and commit it.
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
