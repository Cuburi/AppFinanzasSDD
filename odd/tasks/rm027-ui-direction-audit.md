# RM-027 UI Direction Audit

## Intent

Establish a coherent UI direction through a screen-by-screen audit before redesign work.

## GitHub issue

- Issue: https://github.com/Cuburi/AppFinanzasSDD/issues/195
- Roadmap ID: RM-027

## Scope

This task is an audit and direction-setting task only. It may produce documentation and next-step recommendations, but it must not perform a full redesign or visual rebuild.

In scope:

- Screen-by-screen audit of current UI surfaces.
- Product hierarchy and navigation/layout direction.
- Critical-flow friction, especially monthly availability understanding and daily expense capture.
- Loading, empty, error, success, retry, and read-only state inventory.
- Component consolidation candidates.
- A bounded next-step sequence for future UI work.

Out of scope:

- Full redesign implementation.
- Broad visual rebuild.
- Absorbing concrete later UX issues such as money input consistency, destructive confirmations, category/subcategory restrictions, reporting expansion, or credit-card payment semantics.
- Replacing financial behavior or changing domain rules.

## Source evidence

- `client/src/App.tsx` defines the route shell and navigation.
- `client/src/pages/ActiveMonthPage.tsx` is the primary operational screen and daily financial action surface.
- `client/src/features/monthly-cycle/active-month-dashboard/components/ActiveMonthDashboard.tsx` defines active-month lifecycle states.
- `client/src/features/monthly-cycle/active-month-dashboard/components/DashboardSections.tsx` defines current active-month hierarchy.
- `client/src/features/monthly-cycle/active-month-dashboard/components/RegistrationSlip.tsx` frames financial capture forms.
- `client/src/pages/TemplatePage.tsx`, `PocketsPage.tsx`, `DebtsPage.tsx`, `CreditCardsPage.tsx`, `CloseMonthPage.tsx`, and `ReportsPage.tsx` define secondary screens and related financial flows.
- `client/src/styles.css` defines the shared dark/green visual system, layout primitives, responsive navigation, dashboard layout, and reusable list/card/form patterns.

## Initial route inventory

| Route | Current role | Audit focus |
|---|---|---|
| `/active-month` | Primary operational dashboard and default route. | Monthly availability, expense capture, activity ledger, secondary financial actions, month structure. |
| `/template` | Budget template management. | Whether configuration is clearly separated from current-month operations. |
| `/pockets` | Pocket balances, goals, and external deposits. | Relationship to available money, deposits, active/inactive states. |
| `/debts` | Debt creation and payment registration. | Direction clarity, remaining balance, payment flow, independence from monthly cycle. |
| `/credit-cards` | Read-only statement and card context. | Statement period clarity, current-cycle consumption, relationship to expense capture. |
| `/close-month` | Month closure review and next-month opening. | Closure readiness, blockers, irreversibility, surplus/deficit comprehension. |
| `/reports` | Active-month report summary. | Relationship to dashboard summary, descriptive vs actionable content. |

## Critical user hierarchy hypothesis

1. **Daily action** — record an expense quickly and confidently.
2. **Monthly understanding** — know available money, spending pressure, cash, and whether the month is safe.
3. **Correction and maintenance** — adjust income, withdrawals, deposits, categories, subcategories, pockets, debts, and template only when needed.
4. **Closure and retrospective analysis** — close the month and review/report results.

This hierarchy must be tested screen by screen before any redesign.

## Initial friction hypotheses

These are audit leads, not final findings:

- The navigation is flat even though the product has distinct modes: daily operation, setup/configuration, liabilities/accounts, closure, and reporting.
- `ActiveMonthPage.tsx` combines many responsibilities: primary expense capture, availability summary, history, ledger, secondary forms, month structure, and mutation feedback.
- The active-month dashboard has the clearest visual priority, while secondary routes reuse generic card/list patterns with less product hierarchy.
- Similar financial concepts appear in both Active Month and Reports with different terminology and composition.
- `.budget-line` is reused across domains with very different information density.
- Loading/error/success/retry states exist broadly but are implemented differently per screen.

## Audit checklist

- [ ] Define the primary user hierarchy: daily action, monthly understanding, maintenance, and retrospective analysis.
- [ ] Walk each route from navigation entry to first meaningful action.
- [ ] Audit the daily expense flow: discoverability, required fields, payment method/card dependency, edit/delete recovery, and closed-month behavior.
- [ ] Audit “Disponible del mes”: terminology, prominence, supporting figures, negative/uncertain states, and relationship to reports.
- [ ] Audit debt flow: create debt, distinguish directions, register payment, see remaining balance, and understand completion.
- [ ] Audit credit-card flow: statement period versus current-cycle consumption, card context during expense capture, and partial failure behavior.
- [ ] Audit reports: relationship to active month, actionable versus descriptive content, and surplus/deficit comprehension.
- [ ] Inventory every route’s loading, empty, error, success, retry, and read-only state.
- [ ] Compare repeated card, list, KPI, form, feedback, and status patterns for conceptual consistency.
- [ ] Review navigation grouping and labels without redesigning them yet.
- [ ] Record friction, ambiguity, duplication, and missing context screen by screen.
- [ ] Keep redesign, visual rebuild, and concrete UX implementation outside this audit.

## Documentation/prototype outcome

- [x] Select and document Prototype D: WealthWise Dark as the preferred interactive Active Month reference.
- [x] Refine the prototype direction with a restrained 3D Disponible del mes card and purposeful monthly spending pulse background.
- [x] Preserve the boundary: this is documentation/prototype direction only, not application implementation.

## Evidence log

- 2026-09-21: RM-027 issue #195 created and approved.
- 2026-09-21: Started read-only UI surface mapping with route, flow, state, and consolidation candidate inventory.
- 2026-09-21: Added screen-by-screen audit, state audit, visual-base recommendation, and follow-up sequence to `docs/product/rm027-ui-direction-audit.md`.
- 2026-09-21: Added reference-calibration guidance: use Dribbble for composition/mood only, and prioritize Mercury/Ramp/Revolut/Monzo/Nubank/Linear-like product principles for trust, hierarchy, and state behavior.
- 2026-09-21: Reviewed three user-provided Dribbble-style screenshots. Adopted WealthWise-like calm rail/card-grid/transaction-evidence discipline as reference input, rejected literal copying and bright accounting-SaaS palette from the RACK example.
- Documentation-only Active Month visual prototype direction created at `docs/product/rm027-active-month-visual-prototype.md`.
- Static Active Month mockup created at `docs/product/rm027-active-month-static-mockup.md`.
- Prototype D: WealthWise Dark selected and refined as the preferred interactive direction at `docs/product/rm027-active-month-prototype-d-wealthwise-dark.html`; its restrained 3D availability card and purposeful monthly spending pulse background are documentation/prototype evidence only.
