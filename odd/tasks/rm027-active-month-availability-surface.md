# RM-027 Active Month Availability Surface

## Intent

Rebuild the Active Month primary composition to follow the documented Prototype D / WealthWise Dark direction: make availability the hero and place expense capture beside it without changing financial or ledger behavior.

## Boundary

In scope:

- Make `Disponible del mes` a dominant dark-green availability hero with status, amount, explanation, pulse/depth decoration, and attached glass metrics.
- Position expense capture beside the hero on desktop and stack it after the hero on mobile.
- Preserve existing financial values, registration behavior, and MonthlyLedger semantics.
- Preserve meaningful accessibility roles and reduced-motion behavior.

Out of scope:

- Navigation regrouping.
- Rebuilding movement management or the full ledger.
- Changing financial semantics or API behavior.
- Broad design-system cleanup outside the availability surface.

## Source direction

- `docs/product/rm027-ui-direction-audit.md`
- `docs/product/rm027-active-month-visual-prototype.md`
- `docs/product/rm027-active-month-prototype-d-wealthwise-dark.html`

## Tasks

- [x] Transplant the Prototype D hero anatomy and literal CSS values into the real availability surface.
- [x] Map the current Active Month financial summary structure and tests.
- [x] Rebuild the active-month top composition around the Prototype D availability hero and adjacent expense capture.
- [x] Add focused composition and accessibility assertions without changing registration or ledger behavior.
- [x] Run required client verification for the rebuilt composition.
- [x] Commit the completed Prototype D transplant after explicit user authorization.

## Evidence log

- 2026-09-23: Started implementation slice from committed RM-027 documentation direction (`9fdba4f docs(product): capture RM-027 UI direction`).
- 2026-09-23: Updated `ActiveMonthPage.tsx` financial summary markup with a decorative, hidden monthly pulse layer while preserving the `Disponible del mes` region and financial text.
- 2026-09-23: Updated `client/src/styles.css` with a narrow RM-027 availability surface treatment: dark finance card, purposeful pulse background, subtle hover depth, mobile adjustments, and reduced-motion guard.
- 2026-09-23: Updated `client/src/pages/ActiveMonthPage.test.tsx` to assert the primary availability region and hidden pulse decoration.
- 2026-09-23: Verification passed: `git diff --check -- client/src/pages/ActiveMonthPage.tsx client/src/styles.css client/src/pages/ActiveMonthPage.test.tsx odd/tasks/rm027-active-month-availability-surface.md`; `pnpm --dir client test -- ActiveMonthPage.test.tsx` (Vitest ran 24 files / 206 tests, all passed); `pnpm --dir client typecheck`.
- 2026-09-23: User confirmed expense registration works after applying the pending dev idempotency migration. Refined the availability surface closer to Prototype D by adding a visible availability state chip (`Mes seguro`, `Disponible en negativo`, or neutral), stronger hero hierarchy, and glass-like supporting metric cards while keeping the ledger and expense behavior unchanged.
- 2026-09-23: Re-ran verification after the Prototype D alignment pass: `pnpm --dir client test -- ActiveMonthPage.test.tsx` (24 files / 206 tests passed), `pnpm --dir client typecheck`, and `git diff --check -- client/src/pages/ActiveMonthPage.tsx client/src/styles.css client/src/pages/ActiveMonthPage.test.tsx odd/tasks/rm027-active-month-availability-surface.md`.
- 2026-09-23: User rejected the conservative adaptation and required the actual Prototype D composition. Replaced it with a top grid that keeps the availability hero and expense capture together on desktop, adds the hero explanation and CSS-only depth layers, and preserves the existing ledger and mutation paths.
- 2026-09-23: Rebuilt-composition checks passed: `pnpm --dir client test -- ActiveMonthPage.test.tsx` (24 files / 206 tests), `pnpm --dir client test -- ActiveMonthDashboard.test.tsx` (24 files / 206 tests), and `pnpm --dir client typecheck`.
- 2026-09-23: Applied the documented Prototype D composition literally where the real UI permits: a `Tu dinero, en contexto` / `Mes activo` header with current-month surface, full-width green availability hero with static depth/pulse decoration and real metrics, and a workspace that positions the functional expense capture with the canonical editable ledger. The dark sidebar, responsive stacking, semantic labels, and reduced-motion treatment remain intact; no API or data behavior changed.
- 2026-09-23: Restored the availability hero's Prototype D layered aurora, glowing flow line with thick track and dots, depth label, floating orbs/ring, and scoped motion. Reduced-motion disables all hero animations and transforms. The visual-system contract now permits only the five explicitly named `financial-*` hero keyframes. Verification passed: `pnpm --dir client test -- ActiveMonthPage.test.tsx` (24 files / 206 tests), `pnpm --dir client test -- visual-system.contract.test.ts` (24 files / 206 tests), and `pnpm --dir client typecheck`.
- 2026-09-23: User requested an exact Prototype D replication and to ignore the existing project UI. The `gentle-ai-explore` delegation attempt failed before launch due a Pi extension conflict (`ask_user_question` duplicate), so the parent continued inline with the already-mapped surfaces. Added a final Prototype D / WealthWise Dark cascade layer in `client/src/styles.css` that deliberately overrides the previous Living Ledger/project UI: dark sidebar rail, graphite/teal tokens, Prototype D hero gradients, pulse SVG styling, glass metrics, 3D depth layers, responsive drawer behavior, registration slip/card styling, and reduced-motion shutdown for the hero animations. Updated `client/src/visual-system.contract.test.ts` so the visual contract now asserts Prototype D shell/tokens and the allowed financial hero keyframes instead of the old Living Ledger cascade.
- 2026-09-23: Verification after exact Prototype D cascade passed: `git diff --check -- client/src/styles.css client/src/visual-system.contract.test.ts odd/tasks/rm027-active-month-availability-surface.md`, `pnpm --dir client test -- visual-system.contract.test.ts` (Vitest ran 24 files / 206 tests, all passed), and `pnpm --dir client typecheck`.

- 2026-09-24: User-requested polish pass: capped movements preview to five items, wired `Ver y gestionar movimientos` to reveal editable management controls, removed the confusing classification/history block, removed the budget-used bar from the hero, hid the decorative hero text label, and aligned the expense/ledger cards with full-width secondary actions below. Verification passed: `pnpm --dir client test -- MonthlyLedger.test.tsx ActiveMonthPage.test.tsx`, `pnpm --dir client test -- ActiveMonthPage.test.tsx`, `pnpm --dir client typecheck`, and `git diff --check`.

- 2026-09-25: Renamed the maintenance disclosure from `Estructura del mes` to `Ajustes del mes`, clarified that category/subcategory edits are current-month maintenance outside the daily loop and not global template changes, and made the card span the full Prototype D workspace width. Verification passed: `pnpm --dir client test -- ActiveMonthPage.test.tsx` (24 files / 206 tests), `pnpm --dir client typecheck`, and `git diff --check -- client/src/pages/ActiveMonthPage.tsx client/src/styles.css client/src/pages/ActiveMonthPage.test.tsx odd/tasks/rm027-active-month-availability-surface.md`.
