# RM-027 UI Direction Audit

This document captures the RM-027 audit before any redesign work. It records current UI structure, flow risks, and direction hypotheses so later UI implementation can stay bounded and evidence-led.

## Boundary

RM-027 is not a redesign implementation. It may recommend direction and sequencing, but it does not authorize broad visual rebuild work.

## Product hierarchy hypothesis

The app should be understood through four product modes:

1. **Daily operation** — record expenses and understand today’s monthly availability.
2. **Monthly control** — correct income, cash, deposits, categories, and subcategories for the current month.
3. **Financial context** — inspect pockets, debts, cards, and reports.
4. **Lifecycle** — close the month and move into the next cycle.

The current UI mostly exposes these as one flat navigation list. The audit should determine whether that flat list hides the primary daily loop.

## Screen inventory

| Screen | Current role | First audit question |
|---|---|---|
| Mes activo | Default operational dashboard, expense capture, availability, ledger, secondary actions, month structure. | Can the user understand availability and record an expense within one confident scan? |
| Plantilla | Budget template setup for future months. | Is it clearly setup/configuration rather than current-month correction? |
| Bolsillos | Pocket list, goals, active/inactive filter, external deposits. | Is the relationship between pockets and available money understandable? |
| Deudas | Debt creation, direction, remaining balance, payment registration. | Is debt tracking clearly independent from monthly cash/availability? |
| Tarjetas de crédito | Read-only statement periods, in-progress cycle, card inventory. | Is closed-statement debt distinct from current-cycle spending? |
| Cierre | Closure review, blockers, deficit coverage, close/open next month. | Are blockers and irreversibility clear enough before closing? |
| Reportes | Active-month summary and category/subcategory analysis. | Does it explain month health without duplicating/conflicting with Mes activo? |

## Initial findings to validate

### 1. The daily loop has the right destination but too many neighboring responsibilities

Evidence:

- `/active-month` is the default route in `client/src/App.tsx`.
- `client/src/pages/ActiveMonthPage.tsx` owns expense capture, income, cash withdrawal, pocket deposit, ledger, history filters, credit-card fallback messaging, and month structure editing.
- `DashboardSections.tsx` already names a useful hierarchy: context, treasury, action, activity.

Audit direction:

- Preserve Mes activo as the primary daily destination.
- Separate “record now” from “maintain/correct structure” in the mental model.
- Treat month structure as maintenance, not part of the normal daily scan.

### 2. Availability is the product’s central promise and should be the anchor concept

Evidence:

- Active Month emphasizes “Disponible del mes.”
- Reports repeats income, available money, cash balance, planned/spent totals.
- Cierre blocks on available-money surplus/deficit.

Audit direction:

- Define one terminology path for availability, cash, planned/spent, surplus, and deficit.
- Ensure every related screen explains whether it is actionable now, descriptive, or a closure blocker.

### 3. Navigation currently mixes different modes at the same level

Evidence:

- `App.tsx` presents: Mes activo, Plantilla, Bolsillos, Deudas, Tarjetas de crédito, Cierre, Reportes.
- These include daily action, setup, accounts, liabilities, lifecycle, and analysis.

Audit direction:

- Evaluate grouping or ordering before changing UI.
- The likely hierarchy is: Mes activo first, then Lifecycle/Reports, then financial context, then configuration.

### 4. Reusable visual primitives exist, but domain-specific patterns are blurred

Evidence:

- `styles.css` defines shared `.card`, `.button`, `.field`, `.budget-line`, status pills, KPI grids, and stack utilities.
- `.budget-line` appears across debts, statements, pockets, closure, and activity-like rows.
- `RegistrationSlip.tsx` is a useful capture-shell abstraction for Active Month forms.

Audit direction:

- Keep shared primitives, but classify domain patterns: KPI, transaction row, account row, blocker row, form slip, setup row.
- Avoid making every financial object look equally urgent.

### 5. State handling is present but not yet narratively consistent

Evidence:

- Loading, empty, error, success, retry, partial failure, read-only, and blocked states exist across screens.
- Active Month has lifecycle-specific handling; Cards has independent partial failure; Reports is simpler; Debts/Pockets/Templates use local page messages.

Audit direction:

- Inventory states by route and decide the message contract: what happened, whether money changed, what the user can do next.
- Success/error feedback should distinguish saved mutation, failed mutation, and saved-but-refresh-failed.

## Candidate consolidation areas

These are audit candidates, not implementation decisions:

| Candidate | Why it matters |
|---|---|
| Loadable state patterns | Repeated `loading/error/data` flows can drift in wording and retry behavior. |
| Registration form framing | Expense, income, withdrawal, deposit, and debt payment all capture financial events but do not share one conceptual grammar. |
| Card/section/list framing | `Card` + `SectionHeader` + `.budget-line` is broadly reused; some rows need clearer domain affordances. |
| Feedback messaging | Success/error/status messages repeat locally and may not always communicate persistence or next action. |
| KPI/summary presentation | Active Month and Reports both explain monthly money, but with different structure. |
| Navigation taxonomy | Flat navigation may understate the primary daily loop and overstate secondary maintenance screens. |

## Proposed audit output

RM-027 should finish with:

1. Screen-by-screen friction table.
2. State inventory table.
3. Navigation/product hierarchy recommendation.
4. Component/consolidation candidate list.
5. Bounded follow-up issue sequence.

The first visual prototype direction is recorded separately in `docs/product/rm027-active-month-visual-prototype.md`. The static wireframe is recorded in `docs/product/rm027-active-month-static-mockup.md`. The current preferred interactive reference is `docs/product/rm027-active-month-prototype-d-wealthwise-dark.html`.

## Screen-by-screen audit

| Screen | What works | Friction / risk | Direction |
|---|---|---|---|
| Mes activo | Correctly owns the default route and central financial action. The dashboard has a useful hierarchy: context, treasury, expense capture, activity. | It carries too many neighboring responsibilities: expense capture, income, withdrawals, deposits, ledger, history filters, credit-card fallback, and month structure editing. The daily loop can feel surrounded by maintenance. | Keep it as the command center. Make the first scan answer: “How much can I use?”, “What just happened?”, and “Record expense now.” Move maintenance/correction lower or behind clearer progressive disclosure. |
| Plantilla | Copy explains that future months use this snapshot and existing months do not change. | It is visually similar to operational forms even though it is configuration. Category/subcategory editing can feel like current-month correction. | Treat as setup/configuration. It should look quieter than Mes activo and emphasize future effect before the save action. |
| Bolsillos | Has active/inactive filters, balances, goals, external deposits, and recent movements. It handles saved-but-refresh-failed external deposits. | “Registrar ingreso externo” can be confused with monthly income because both create money-like events. List rows mix account summary, edit controls, movements, and deactivate actions. | Clarify whether a pocket event affects monthly availability. Separate account summary from edit controls. Use a pocket/account row pattern rather than generic budget rows. |
| Deudas | Direction labels, remaining balance, status, payments, empty/loading/error/success states exist. | Debt tracking is intentionally independent from monthly cycle, but the UI has the same card/list/form grammar as operational money flows. Payment registration is inline per debt and can compete with the debt summary. | Make the independence explicit: “does not affect this month unless later linked.” Debt rows should prioritize counterparty, direction, remaining balance, and next payment action. |
| Tarjetas de crédito | Strong conceptual split between closed statement and in-progress cycle; partial failures are handled independently. | The screen is English while most operational surfaces are Spanish. Card statement concepts are important but read-only and may be hard to relate to expense capture. | Localize/copy-align later. Keep read-only status clear. Tie statement concepts to expense capture vocabulary: current-cycle consumption vs payable closed statement. |
| Cierre | Closure blockers are explicit; close button is disabled until safe; surplus/deficit blockers are visible. | This is high-consequence UI but visually uses the same generic card/list patterns as lower-risk screens. “Variación presupuestaria” versus transferable money is explained but still cognitively heavy. | Elevate this as lifecycle/risk UI. Use stronger blocker hierarchy, irreversible-action copy, and a clearer step order before close. |
| Reportes | Summarizes active-month income, available money, cash, planned/spent totals, top spending, uncategorized, surplus, and deficit. | It overlaps with Mes activo and uses English labels. It is descriptive, but some surplus/deficit language can imply action. | Define Reports as retrospective/explanatory, not operational. Align terminology with Mes activo and Cierre. |

## State audit

| State type | Current evidence | Direction |
|---|---|---|
| Loading | Present in all major routes, with richer lifecycle handling in Active Month. | Keep lightweight loading; do not delay critical balances behind decorative loaders. |
| Empty | No active month, no debts, no pockets, no cards/statements, no report rows. | Empty states should say what the user can do next and whether money state is unavailable or genuinely zero. |
| Error | Page-level errors, partial failures, and retry actions exist. | Standardize copy around: what failed, whether money changed, next safe action. |
| Success | Local success messages after mutations. | Distinguish persisted mutation from refresh failure. Use consistent role/status semantics. |
| Read-only / blocked | Closed month, card management out of scope, closure blockers. | Treat blocked states as product guidance, not just disabled controls. Explain the safe path forward. |

## Visual base recommendation

Do **not** throw away the visual base wholesale. The current base has valuable direction:

- Dark premium finance shell.
- Restrained green/earth palette.
- Token-backed colors, spacing, radii, focus ring, and semantic status tones.
- Existing primitives for button, card, KPI, section header, and status pills.
- Responsive drawer/rail strategy and 44px touch targets.
- Motion contracts that are short, compositor-safe, and reducible.

But the base should be **re-founded**, not merely patched. The reason is not that the colors are wrong; it is that the product hierarchy is still too generic. `styles.css` contains layered historical direction, repeated `:root` overrides, generic `.budget-line` reuse, and an active-month-specific visual priority that secondary screens do not systematically share.

Recommended visual direction:

1. **Keep the dark “finance command center” identity.** It matches the existing `docs/frontend/visual-direction.md` principle: trust over spectacle.
2. **Shift from “green app theme” to “financial state system.”** Green should mean positive/safe or primary action, not just brand surface. Warning/danger/neutral/guidance tokens should carry more of the product meaning.
3. **Create domain surfaces before changing decoration.** The next visual-system slice should define reusable patterns for:
   - command-center balance surface,
   - financial event capture slip,
   - transaction/activity row,
   - account/pocket row,
   - debt/liability row,
   - lifecycle blocker row,
   - report insight card.
4. **Do not add a component library.** The project already has a token/primitive contract forbidding Tailwind, shadcn, CSS-in-JS, or a new library for this direction.
5. **Make typography and spacing do more of the hierarchy work.** The app should feel calmer and more editorial: fewer equally weighted cards, stronger primary financial numbers, clearer section rhythm.
6. **Use motion only for feedback and orientation.** Keep current button press feedback and reduced-motion support; do not add ambient animation.

Bottom line: **evolve the current base into a stricter design system instead of replacing it**. If a bigger visual refresh happens later, it should be a token/primitives refoundation guided by this audit, not a screenshot-driven redesign.

## Reference calibration

The audit can use references, but with a strict rule: references calibrate **direction**, not UI copying. Dribbble is useful for mood and composition, but it often over-optimizes for a static shot instead of real finance workflows. Product references are more important for trust, hierarchy, and state behavior.

| Reference class | What to borrow | What to avoid |
|---|---|---|
| Dribbble dark finance dashboards | Visual density studies, card composition, balance prominence, dark-mode contrast, mobile/web layout ideas. | Neon novelty, fake charts, unlabeled money states, decorative gradients that reduce trust. |
| Mercury / Ramp | Calm finance workspace, transaction evidence, budget/spend control, operational clarity. | Business-admin complexity that does not fit a personal single-user app. |
| Revolut / Curve | Card/account mental models, quick balance scanning, spend/category exploration. | Overly broad consumer-bank feature sprawl. |
| Monzo / Nubank | Human copy, plain-language money states, approachable trust. | Playfulness that weakens high-consequence financial decisions. |
| Linear / Raycast | Premium dark polish, restrained motion, crisp navigation, command-center feel. | Treating finance like a generic productivity dashboard. |

Reference fusion recommendation:

- **Base mood:** Linear-like restraint plus AppFinanzas' current dark green/earth palette.
- **Financial hierarchy:** Mercury/Ramp clarity: financial state first, risk/next action second, evidence third.
- **Human copy:** Monzo/Nubank plain language for blockers, empty states, and recovery.
- **Composition inspiration:** Dribbble only after filtering for real workflow usefulness.

The visual target should be: **a personal-finance command center that feels calm, serious, and fast to act in — not a flashy fintech concept shot**.

### User-provided visual references

The user supplied three local Dribbble-style screenshots as mood references. They are not to be copied literally.

| Reference | Useful qualities | Risks / reject |
|---|---|---|
| WealthWise dashboard, broad overview (`dad0b47cdd311ab4e1ef1b440cd63453.webp`) | Calm high-density finance workspace; left rail; large headline financial number; card grid; supporting cashflow/spending/transactions evidence; muted teal accent. | Too many analytical modules for AppFinanzas' immediate daily loop; investment/net-worth/AI-health framing does not match current product scope. |
| WealthWise budget/spending (`2.webp`) | Better fit for AppFinanzas: top KPI strip, recurring/weekly spending, recent transaction table, sparse teal accent, strong white-space discipline. | Still analytics-heavy and static; recurring/subscription concepts are not current RM-027 scope. |
| RACK accounting dashboard (`3.webp`) | Strong page title, large KPI cards, simple side nav, obvious transaction section and action buttons. | Too generic/accounting-SaaS; bright blue primary color and red/yellow/green chart palette feel less premium and less personal-finance trustworthy. |

Reference takeaways for AppFinanzas:

1. **Use the WealthWise layout discipline, not its content.** AppFinanzas can borrow the calm rail + card grid + transaction evidence rhythm, but must replace net worth/investment/AI modules with monthly availability, expense capture, recent movements, closure risk, and pocket/debt/card context.
2. **Prefer muted teal/earth accents over bright SaaS blue.** The first two references support the current restrained direction better than the third.
3. **Keep the dashboard airy, but not dashboard-for-dashboard's-sake.** AppFinanzas should not add fake charts to look financial; every module must answer a money decision.
4. **Adopt a top summary strip selectively.** A compact strip can work for secondary screens like Reports/Debts/Pockets, but Mes activo still needs one dominant availability surface plus the primary expense action.
5. **Tables/ledgers are evidence, not the hero.** The transaction table pattern is useful below the decision surface, especially for Monthly Ledger and Reports.

Refined visual direction after references:

- Start from **WealthWise #2's clarity** + current AppFinanzas dark command-center identity.
- Avoid RACK's bright accounting-SaaS palette.
- Use white/light reference screenshots as structure references only; AppFinanzas should stay dark unless a later explicit decision changes the brand foundation.

## Prototype outcome

**Prototype D: WealthWise Dark** is the selected direction. It keeps the dark finance command-center base and makes the **Disponible del mes** card the dominant surface.

Its 3D treatment is restrained: cursor spotlight, subtle tilt, layered parallax, and a reduced-motion fallback. The background should communicate the monthly spending pulse purposefully, not introduce random shapes or literal money objects. Movements remain evidence: show a preview first and reveal more progressively.

This outcome remains prototype/documentation only. If implementation is chosen, slice it narrowly, beginning with the Active Month availability surface.

## Recommended follow-up sequence

1. **RM-027-A: Navigation and hierarchy decision.** Decide the product modes and route grouping/order without implementation churn.
2. **RM-027-B: Active Month command-center audit fix.** Reduce the first scan to availability, record expense, recent activity, and clear secondary actions.
3. **RM-027-C: State/message contract.** Standardize loading/empty/error/success/read-only language across routes.
4. **RM-027-D: Domain row/surface primitives.** Split generic `.budget-line` usage into financial event, account, liability, lifecycle blocker, and report insight patterns.
5. **RM-027-E: Secondary route alignment.** Apply the hierarchy to Template, Pockets, Debts, Credit Cards, Closure, and Reports in small slices.
6. **RM-027-F: Visual-token cleanup.** Reconcile historical CSS overrides and keep the final system token-first.

## Non-goals preserved

- No full redesign in this audit.
- No broad visual rebuild in this audit.
- No concrete implementation of RM-021, RM-024, RM-023, RM-006, RM-009, RM-010, RM-013, or RM-019.
- No change to financial semantics.
