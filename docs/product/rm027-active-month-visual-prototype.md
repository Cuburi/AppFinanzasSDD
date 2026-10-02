# RM-027 Active Month Visual Prototype Direction

This is a documentation-only prototype direction for RM-027. It does not authorize product-code changes yet.

A more concrete static wireframe is available in `docs/product/rm027-active-month-static-mockup.md`.
The selected interactive direction is captured in `docs/product/rm027-active-month-prototype-d-wealthwise-dark.html`.

## Goal

Turn **Mes activo** into a personal-finance command center that answers three questions quickly:

1. **Can I spend?** — available money, cash position, budget pressure.
2. **What should I do now?** — record expense first; secondary actions stay nearby but quieter.
3. **What changed recently?** — ledger/recent movements as evidence below the decision surface.

## Reference fusion

- Use the WealthWise references for calm sidebar/card discipline and evidence-led dashboards.
- Keep AppFinanzas dark, restrained, and token-driven.
- Avoid RACK's bright accounting-SaaS palette.
- Avoid fake finance modules: every module must answer a real AppFinanzas decision.

## Target layout: desktop

```txt
┌─────────────────────┬──────────────────────────────────────────────────────────────┐
│ AppFinanzas          │ Mes activo                                      [Actualizar] │
│                     │ Disponible para decidir                                      │
│ Mes activo           │                                                              │
│ Cierre               │ ┌──────────────────────────────┐ ┌────────────────────────┐ │
│ Reportes             │ │ DISPONIBLE DEL MES           │ │ REGISTRAR GASTO        │ │
│                     │ │ $X COP                       │ │ Monto                  │ │
│ Bolsillos            │ │ Estado: seguro/riesgo        │ │ Subcategoría           │ │
│ Deudas               │ │ Ingresos / gastado / cash    │ │ Método / tarjeta       │ │
│ Tarjetas             │ │ Budget progress              │ │ [Registrar gasto]      │ │
│                     │ └──────────────────────────────┘ └────────────────────────┘ │
│ Plantilla            │                                                              │
│                     │ ┌──────────────────────────────────────────────────────────┐ │
│                     │ │ Movimiento reciente / ledger                             │ │
│                     │ │ date · type · category · amount · edit/delete if allowed  │ │
│                     │ └──────────────────────────────────────────────────────────┘ │
│                     │                                                              │
│                     │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│                     │ │ Ingresos      │ │ Retiro cash  │ │ Depósito bolsillo    │ │
│                     │ └──────────────┘ └──────────────┘ └──────────────────────┘ │
│                     │                                                              │
│                     │ ┌──────────────────────────────────────────────────────────┐ │
│                     │ │ Mantenimiento del mes: estructura, categorías, ajustes    │ │
│                     │ └──────────────────────────────────────────────────────────┘ │
└─────────────────────┴──────────────────────────────────────────────────────────────┘
```

## Target layout: mobile

```txt
┌────────────────────────────┐
│ AppFinanzas          Menú  │
├────────────────────────────┤
│ Mes activo                 │
│ Disponible para decidir    │
│                            │
│ ┌────────────────────────┐ │
│ │ Disponible del mes     │ │
│ │ $X COP                 │ │
│ │ Safe/risk explanation  │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Registrar gasto        │ │
│ │ Amount first           │ │
│ │ Category/payment       │ │
│ │ [Registrar gasto]      │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Movimientos recientes  │ │
│ └────────────────────────┘ │
│                            │
│ Secondary actions          │
│ [Ingreso] [Retiro] [Pocket]│
│                            │
│ Mantenimiento del mes      │
└────────────────────────────┘
```

## Selected prototype direction

The current preferred direction is **Prototype D: WealthWise Dark**.

Use it as a direction reference, not as production-ready app code:

- Dark command-center shell with calm WealthWise-inspired hierarchy.
- Main `Disponible del mes` card using restrained 3D depth: cursor spotlight, subtle tilt, layered parallax, and reduced-motion fallback.
- Background concept: **monthly spending pulse** — a purposeful financial trajectory behind the balance, not random abstract decoration.
- Recent movements remain evidence, not the hero.
- Movement management uses progressive disclosure instead of a large always-visible table.

The purpose of the 3D treatment is to make the primary balance feel important and alive without turning the product into a casino/crypto visual. Literal money objects, oversized coins, and generic decorative blobs are not the chosen direction.

## Visual grammar

### 1. Command center surface

The top area should feel like a financial cockpit, not a generic page header.

- One dominant number: `Disponible del mes`.
- Plain-language status: `Seguro`, `Atención`, or `En riesgo` only if backed by real rules.
- Supporting values: income, spent, cash, budget utilization.
- No decorative chart unless it explains budget pressure or cashflow.

### 2. Capture slip

Expense capture is the primary action.

- Amount first.
- Subcategory second.
- Payment method/card as supporting context.
- Submit button visually primary.
- Edit mode must be visibly different but not alarming.

### 3. Ledger as evidence

The ledger should not compete with the available-money surface.

- Show recent activity high on the page.
- Details remain progressive-disclosure.
- Edit/delete actions remain available but secondary.
- System-generated movements should look distinct from user-entered movements.

### 4. Secondary actions

Income, cash withdrawal, and pocket deposit are important but not daily-primary.

- Present as a secondary action strip or compact cards.
- Avoid making all actions equal to expense capture.
- Each action should state whether it affects available money, cash, or pockets.

### 5. Maintenance area

Month structure changes are maintenance, not daily operation.

- Keep below the daily loop.
- Use strong copy to clarify current-month-only versus template changes.
- Avoid exposing category/subcategory editing as if it were a daily task.

## Navigation direction

The sidebar should express product modes, not a flat feature list.

Proposed grouping:

```txt
Daily
- Mes activo
- Cierre
- Reportes

Financial context
- Bolsillos
- Deudas
- Tarjetas de crédito

Setup
- Plantilla
```

This is a direction hypothesis, not an implementation decision. It needs validation against current user flows.

## Palette direction

Keep the current dark base. Refine it like this:

- Primary accent: muted money/availability green, not neon.
- Guidance accent: muted violet/sage for edit/maintenance states.
- Warning/danger: semantic and restrained, not loud unless blocking.
- Surfaces: fewer equally weighted cards; more hierarchy through spacing, border weight, and typography.

## Typography direction

- Larger, tighter display treatment for `Disponible del mes`.
- Body text stays plain and human.
- Numeric values use tabular figures where comparison matters.
- Avoid all-caps except small eyebrows.

## Motion direction

- Keep current press feedback.
- Allow subtle command-center depth only where it reinforces hierarchy.
- The primary balance card may use cursor spotlight, subtle 3D tilt, and small parallax layers.
- Background motion should represent product meaning, such as a monthly spending pulse, rather than random decorative movement.
- Always support `prefers-reduced-motion` with a static equivalent.
- No delayed reveal for balances or blockers.

## What should not be copied from references

- Net worth and investment modules.
- AI health score ring.
- Fake cashflow/allocation graphics with no product behavior.
- Bright blue accounting-SaaS palette.
- Dense charts before the user can answer “can I spend?”

## Candidate implementation slices after audit approval

1. Navigation grouping/order copy-only slice.
2. Active Month hero/availability surface slice.
3. Expense capture slip hierarchy slice.
4. Ledger row/evidence hierarchy slice.
5. Secondary actions + maintenance separation slice.
6. Domain row primitives and visual-token cleanup slice.
