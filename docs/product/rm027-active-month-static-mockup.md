# RM-027 Active Month Static Mockup

This is a static, documentation-only mockup for the RM-027 Active Month direction. It is not implementation-ready CSS and does not authorize product-code changes by itself.

## Design thesis

**Mes activo should feel like a calm personal-finance command center:** one dominant money answer, one primary daily action, and evidence underneath.

The user should be able to answer in one scan:

- How much money is available this month?
- Is the month safe, tight, or blocked?
- Where do I record a new expense?
- What changed recently?

## Desktop static mockup

```txt
┌──────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────┐
│ AppFinanzas              │  Mes activo                                                       Actualizado hace 2 min  │
│ Finanzas personales      │  Tu centro de decisión para el mes.                                [Actualizar]            │
│                          │                                                                                            │
│ DAILY                    │  ┌───────────────────────────────────────────────┐  ┌────────────────────────────────────┐ │
│ ● Mes activo             │  │ DISPONIBLE DEL MES                            │  │ REGISTRAR GASTO                    │ │
│   Cierre                 │  │                                               │  │ Movimiento del mes                  │ │
│   Reportes               │  │ $1.245.000 COP                                │  │                                    │ │
│                          │  │ Mes seguro · vas dentro del presupuesto        │  │ Monto                              │ │
│ FINANCIAL CONTEXT        │  │                                               │  │ ┌────────────────────────────────┐ │ │
│   Bolsillos              │  │ ┌────────────┐ ┌────────────┐ ┌────────────┐ │  │ │ 80.000                         │ │ │
│   Deudas                 │  │ │ Ingresos   │ │ Gastado    │ │ Efectivo   │ │  │ └────────────────────────────────┘ │ │
│   Tarjetas               │  │ │ $3.200.000 │ │ $1.955.000 │ │ $240.000   │ │  │ Subcategoría                       │ │
│                          │  │ └────────────┘ └────────────┘ └────────────┘ │  │ [Supermercado · quedan $220.000 v] │ │
│ SETUP                    │  │                                               │  │ Método                             │ │
│   Plantilla              │  │ Presupuesto usado                             │  │ [No efectivo] [Tarjeta opcional]   │ │
│                          │  │ ████████████░░░░░░ 62%                        │  │                                    │ │
│                          │  │                                               │  │ [Registrar gasto]                  │ │
│                          │  └───────────────────────────────────────────────┘  └────────────────────────────────────┘ │
│                          │                                                                                            │
│                          │  ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
│                          │  │ MOVIMIENTOS RECIENTES                                                                 │ │
│                          │  │ Evidencia del mes, ordenada por fecha.                                                 │ │
│                          │  │                                                                                        │ │
│                          │  │ Hoy, 9:14     Gasto · Supermercado             -$80.000       [Editar] [Eliminar]       │ │
│                          │  │ Ayer, 18:20   Ingreso · Nómina                 +$3.200.000    [Ver detalle]            │ │
│                          │  │ Ayer, 12:02   Depósito a bolsillo · Viaje      -$120.000      [Ver detalle]            │ │
│                          │  │                                                                                        │ │
│                          │  │ [Ver todos los movimientos]                                                           │ │
│                          │  └────────────────────────────────────────────────────────────────────────────────────────┘ │
│                          │                                                                                            │
│                          │  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐                  │
│                          │  │ Registrar ingreso    │ │ Retirar efectivo    │ │ Depositar bolsillo  │                  │
│                          │  │ Aumenta disponible   │ │ Mueve a cash        │ │ Reserva dinero      │                  │
│                          │  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘                  │
│                          │                                                                                            │
│                          │  ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
│                          │  │ MANTENIMIENTO DEL MES                                                                  │ │
│                          │  │ Categorías, subcategorías y estructura de este mes. No es parte del registro diario.    │ │
│                          │  │ [+ Mostrar ajustes del mes]                                                            │ │
│                          │  └────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Mobile static mockup

```txt
┌────────────────────────────────────┐
│ AppFinanzas                  Menú  │
├────────────────────────────────────┤
│ Mes activo                         │
│ Tu centro de decisión para el mes. │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ DISPONIBLE DEL MES            │ │
│ │ $1.245.000 COP                │ │
│ │ Mes seguro                    │ │
│ │                                │ │
│ │ Ingresos       $3.200.000     │ │
│ │ Gastado        $1.955.000     │ │
│ │ Efectivo       $240.000       │ │
│ │                                │ │
│ │ Presupuesto usado █████░ 62%  │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ REGISTRAR GASTO                │ │
│ │ Monto                          │ │
│ │ [80.000                      ] │ │
│ │ Subcategoría                   │ │
│ │ [Supermercado               v] │ │
│ │ Método                         │ │
│ │ [No efectivo                v] │ │
│ │ [Registrar gasto]              │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ MOVIMIENTOS RECIENTES          │ │
│ │ Hoy · Supermercado   -$80.000  │ │
│ │ Ayer · Nómina      +$3.200.000 │ │
│ │ [Ver todos]                    │ │
│ └────────────────────────────────┘ │
│                                    │
│ Acciones secundarias               │
│ [Ingreso] [Retiro] [Bolsillo]      │
│                                    │
│ Mantenimiento del mes              │
│ [+ Mostrar ajustes]                │
└────────────────────────────────────┘
```

## Visual notes

### Shell

- Keep a left rail on desktop, but group navigation by product mode.
- Use a compact top header only for context and refresh, not as a second navigation system.
- Mobile keeps the current drawer idea.

### Hero availability surface

- This is the emotional center of the screen.
- The main number should be visually dominant and calm.
- Status copy should be plain: `Mes seguro`, `Atención`, `En riesgo`, only when backed by clear business rules.
- Budget progress is supporting context, not the hero.

### Expense capture

- The form should feel like a receipt/slip: fast, focused, and daily.
- Amount comes first.
- Payment method and card are supporting fields, not primary blockers.
- Submit button is the only visually dominant action in the form.

### Recent movements

- This is the evidence layer.
- It should answer “why did my available money change?”
- It should expose edit/delete only when allowed, but those actions should not dominate the row.

### Secondary actions

- Income, withdrawal, and pocket deposit remain visible but visually quieter than expense capture.
- Each card explains the money effect in one line.

### Maintenance

- Month structure editing is intentionally lower on the screen.
- The copy must clarify that it changes this month only unless explicitly promoted to template.

## Color direction

| Role | Direction |
|---|---|
| Background | Existing dark green/near-black foundation. |
| Primary financial value | High-contrast text, not neon. |
| Primary action | Muted money green. |
| Safe state | Restrained green. |
| Warning/tight month | Muted amber. |
| Risk/blocker | Muted red, stronger only for irreversible or blocking states. |
| Maintenance/editing | Guidance accent, muted violet/sage. |

## Component implications

Potential future primitives or feature components:

- `AvailabilitySurface`
- `FinancialMetricStrip`
- `ExpenseCaptureSlip`
- `RecentMovementList`
- `SecondaryMoneyActionCard`
- `MonthMaintenanceDisclosure`

These should be feature-level components first, not generic UI primitives, until reuse is proven.

## Open validation questions

- Should `Cierre` live in Daily, or should it be a lifecycle group under the nav?
- Should `Reportes` be Daily-adjacent or Financial context?
- Should `Movimientos recientes` show only recent rows or the full ledger by default?
- How much of `Estructura del mes` should remain on Mes activo versus move to a dedicated maintenance path?
- Does the main status label need backend rules, or should the first implementation avoid status labels beyond raw values?
