---
version: 1
slug: "client-src-pages-activemonthpage-tsx"
primary_target: "client/src/pages/ActiveMonthPage.tsx"
related_targets: ["client/src/features/monthly-cycle/active-month-dashboard/components/ActiveMonthDashboard.tsx","client/src/features/monthly-cycle/active-month-dashboard/components/DashboardSections.tsx"]
---

<!--
THESIS: Active Month is a Personal Treasury Desk, not a stack of finance cards; it refuses the generic neon-fintech dashboard.
OWN-WORLD: Matte ink planes, ruled ledger alignment, Ledger Lime action slips, Carbon Violet guidance marks, and tabular financial columns.
STORY: The person sees what remains, understands pressure and reliability, registers an expense, then reviews or maintains the month.
FIRST VIEWPORT: Month state sits above a 7/5 desktop split: available money and budget pressure on the left, the expense slip on the right; warnings interrupt before activity.
FORM: Grounded direction 3, staged as an asymmetric ledger plus attached working slip; direction seed cab75ffc.
-->

# Active Month — Personal Treasury Desk

## Scope and mode

- **Primary target:** `client/src/pages/ActiveMonthPage.tsx`
- **Related targets:** Active Month dashboard composition and dashboard sections.
- **Visitor mode:** Operate.
- **Scope:** Replace the Active Month visual world and composition while preserving routes, API behavior, domain meaning, mutations, edit/delete flows, recovery actions, and all lifecycle states.

## Audience, job, and action

- **Audience:** an ordinary person managing personal finances, not a finance professional.
- **First-30-second job:** answer “¿Cuánto dinero me queda disponible este mes?” without scanning secondary administration.
- **Next priority:** register an expense quickly enough that the displayed availability remains trustworthy.
- **Primary action:** `Registrar gasto`.
- **Success condition:** available money is unmistakable, data reliability is visible, and expense capture is reachable immediately by touch, mouse, and keyboard.

## Content and truth to preserve

The surface must continue to distinguish:

- `Disponible del mes`
- monthly income
- actual monthly spending, including its loading and failed-refresh states
- physical cash
- planned versus used budget
- category and subcategory availability
- savings-pocket deposits
- credit-card association and no-card/cash handling
- active versus closed month behavior
- snapshot-only category/subcategory corrections versus template promotion

All interface copy is Spanish. Existing mixed-language navigation labels should be normalized to `Tarjetas de crédito` and `Reportes` during implementation without changing routes.

## Chosen direction

**Personal Treasury Desk** applies the global Living Ledger world to one operating surface. The page behaves like a monthly ledger with an attached expense slip: the ledger establishes truth; the slip lets the person keep it true.

The category rut is a dark card dashboard with a glowing accent. Its predictable opposite is a soft pastel budgeting planner. This direction uses neither. It is dark because of the evening household scene, matte because the product needs authority, and asymmetric because one financial answer and one action matter more than everything else.

**Memorable moment:** the eye lands on the large `Disponible del mes` amount, follows one ruled budget line to its pressure state, and reaches the adjacent Ledger Lime `Registrar gasto` action without crossing unrelated content.

## First viewport composition

### Wide desktop (`>= 1120px`)

Use a 12-column content grid after the navigation rail.

1. **Context strip, full width:** month name and year on the left; `Mes abierto` or `Mes cerrado`, freshness metadata, and `Actualizar información` on the right. It is compact and must not compete with the money.
2. **Treasury ledger, columns 1–7:** `Disponible del mes` is the largest value. `Ingresos`, `Gastado`, and `Efectivo disponible` align beneath it in one amount grid. Budget use is one ruled progress line with percentage, spent, and planned values.
3. **Expense slip, columns 8–12:** `Registrar gasto` is the only solid Ledger Lime action in the viewport. The form keeps current behavior and fields. Visually prioritize `Monto` and `Subcategoría del gasto`; keep date, payment method, optional card, and description immediately available but quieter.
4. **Warnings, full width:** blocking or degraded information appears after the financial/action pair and before activity. Recovery buttons remain adjacent to the failing source.

Do not wrap the context strip, treasury ledger, and action slip in three visually identical cards. They are different structural roles.

### Medium (`768px–1119px`)

- Place the context strip first, treasury ledger second, and expense slip third.
- Keep all routes available through the labeled `Menú` navigation drawer.
- Let secondary metrics use two columns, then one when labels or values would compress.
- Warnings remain before recent activity.

### Compact (`< 768px`)

- Order: month state → available money → budget pressure → primary expense action/form → warnings → recent expenses → remaining workflows.
- Use a full-width `Registrar gasto` action. If it remains an anchor, it must move focus to the first invalid or first required expense field after navigation; never leave keyboard focus behind at the trigger.
- Split currency unit from the amount only when necessary; never clip, marquee, or horizontally scroll money.
- Use at least `44px` targets and preserve `320px` no-overflow behavior.

## Surface hierarchy after the first viewport

### Primary runway

1. Treasury ledger.
2. Expense capture.
3. Degraded-state warnings and retry actions.
4. `Historial de gastos del mes`, with card filter and edit/delete actions.

Recent expenses should read as ledger rows: description and context left, amount aligned right, actions available on focus/hover and still reachable on touch. Do not hide destructive actions behind hover-only UI.

### Maintenance deck

Keep every existing workflow, but place it after the primary runway:

- `Ingresos del mes`
- `Retirar efectivo`
- `Depositar en bolsillo`
- `Estructura del mes`, closed by default and expanded automatically when a structural edit or structural mutation error needs attention.
- create, edit, and delete category/subcategory operations
- optional promotion to the global template

Group these by task and consequence, not as one undifferentiated “Operación diaria” container. Snapshot copy must continue to explain when the global template does or does not change.

## Interaction states

### Expense capture

- **Idle:** amount and subcategory receive strongest field hierarchy; all required fields remain visible and labelled.
- **Focus:** Carbon Violet focus treatment; no lime field glow.
- **Submitting:** keep form geometry stable, disable duplicate commit, and change action text to a Spanish pending label.
- **Success:** announce through the existing live feedback region, clear/reset according to current behavior, and refresh visible financial values without animating digits.
- **Editing:** change title and commit label to the existing edit copy; use a Violet guide edge and keep `Cancelar edición de gasto` adjacent.
- **Error:** preserve entered values, show a specific Spanish error near the form, and focus the first invalid field or summary as appropriate.

### Expense history

- The card filter updates results without moving the viewport.
- Empty state remains explicit: `No hay gastos registrados para este mes.`
- Missing credit-card support remains a local degraded state, not a whole-page failure.
- Edit and delete labels retain the expense description for accessible specificity.

### Financial truth

- `Gastado` loading keeps the label and geometry, with a non-visual status announcement.
- `Gastado` failure displays `No disponible` and `Reintentar Gastado`; it must not imply zero.
- Negative values use Negative plus explicit text or sign. Positive values never rely on green alone.
- Budget progress exposes the same value through text and the semantic progress element.

## Lifecycle and recovery

| State | Required composition |
| --- | --- |
| Loading | Immediate Spanish status text; no decorative skeleton that implies false values. |
| Blocking load failure | One focused recovery surface with error and `Reintentar`; no empty dashboard behind it. |
| Unopened month | `Todavía no hay un mes activo.` followed by `Abrir mes manualmente`; year and month remain labelled. |
| Active month | Full treasury desk with enabled mutation workflows. |
| Closed month | Financial truth remains readable; mutation controls are removed or disabled according to current behavior; `Mes cerrado` and read-only explanations are explicit. |
| Report support failure | Local warning and `Reintentar reporte` before activity. |
| Closure-review failure | Local warning and `Reintentar revisión de cierre` before activity. |
| Mutation success/error | Existing Spanish feedback remains announced and visually adjacent to the affected workflow. |

Warnings must remain in DOM order and visual order before activity. A support failure never blocks unrelated available-money or expense behavior.

## Motion

- The first financial region may enter once with a `160ms` opacity and `6px` vertical settle; no stagger beyond one `40ms` relationship between context and ledger.
- Expense controls, filters, keyboard actions, and balance recalculation respond immediately.
- Press feedback is `scale(0.98)` for `100ms`; hover is pointer-capability gated.
- Use strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for entry and press recovery.
- No count-up numbers, progress sweeps, ambient loops, parallax, glow pulses, or celebratory finance motion.
- Reduced motion removes transforms and delays while preserving clear state changes.

## Accessibility acceptance

- Logical heading structure: one page `h1`, section `h2`, subgroup `h3`.
- DOM, visual, and keyboard order match at every breakpoint.
- Visible focus survives all tonal surfaces and is not clipped.
- Text contrast targets WCAG AA: `4.5:1` body text, `3:1` large text and non-text UI boundaries.
- Every status color has text; every icon has a label or accessible name.
- Form labels remain persistent; errors are programmatically associated with fields.
- Success/loading use polite status announcements; blocking and mutation errors use alerts without duplicate announcements.
- At `200%` text zoom and `320px` width, no content or action is lost and no page-level horizontal scrollbar appears.
- Touch targets are at least `44px`; touch never depends on hover.

## Explicit anti-patterns

- No generic neon-fintech treatment, luminous lime edges, glowing violet charts, or gradient mesh background.
- No glass cards, stacked translucent surfaces, or blur used as a substitute for hierarchy.
- No equal-weight KPI/card grid above the primary action.
- No decorative chart whose source data or financial meaning is unavailable.
- No collapsed or hidden degraded-state recovery.
- No visual reorder that contradicts warning or keyboard order.
- No conversion of cash, budget availability, pocket funds, and total available money into one generic balance concept.
- No new component library, CSS-in-JS system, or page-local hardcoded visual values; implementation extends existing token-backed primitives.

## Unresolved decisions

- The exact implementation split between route composition and feature components should be decided during implementation, following the existing feature-first frontend architecture.
- Exact token values are implementation seeds and must be browser-validated for contrast and perceptual balance, then carbonized into `DESIGN.md` frontmatter and `.impeccable/design.json` after the first build.
- Product-specific accessibility conformance beyond WCAG AA remains unconfirmed in `PRODUCT.md`; AA is the implementation floor, not a claim of certified compliance.
