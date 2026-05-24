# User Stories - AppFinanzas

Este documento muestra el backlog funcional y el estado actual del MVP. La marca indica qué tan cubierta está cada historia por la implementación actual.

## Leyenda

- ✅ Implementada: existe flujo usable en backend y frontend.
- 🟡 Parcial: existe una parte importante, pero falta alcance funcional o pulido.
- ⬜ Pendiente: todavía no está implementada.

## 1. Autenticación

- ⬜ **HU-1**: Como usuario, quiero crear una cuenta con email y contraseña para acceder a mis datos financieros.
- ⬜ **HU-2**: Como usuario, quiero iniciar sesión para ver mi información.

> Estado: fuera del MVP técnico actual. La app funciona sin usuarios/autenticación por ahora.

## 2. Gestión de Categorías y Subcategorías

- ✅ **HU-3**: Como usuario, quiero crear categorías grandes (ej: "Gastos hogar") para organizar mis gastos.
- ✅ **HU-4**: Como usuario, quiero crear subcategorías dentro de una categoría (ej: "Cuota administración") con un presupuesto mensual asignado.
- ✅ **HU-5**: Como usuario, quiero editar y eliminar categorías y subcategorías.
- ✅ **HU-6**: Como usuario, quiero ver el presupuesto disponible de cada subcategoría en cualquier momento.

> Estado: cubierto desde la plantilla presupuestaria y el mes activo. La edición/eliminación se maneja guardando la plantilla completa, no con CRUD granular por item.

## 3. Registro de Gastos

- ✅ **HU-7**: Como usuario, quiero registrar un gasto rápido indicando: monto, subcategoría, fecha y descripción opcional.
- ✅ **HU-8**: Como usuario, quiero ver el historial de gastos del mes actual.
- ⬜ **HU-9**: Como usuario, quiero registrar gastos recurrentes mensuales.
- ✅ **HU-10**: Como usuario, quiero permitir que una subcategoría muestre saldo negativo (desfalco).

> Estado: registrar gastos ya incluye monto, subcategoría, fecha, medio de pago y descripción opcional. El mes activo muestra historial mensual y recalcula saldos. Sigue pendiente HU-9: gastos recurrentes.

## 4. Dashboard Mensual

- 🟡 **HU-11**: Como usuario, quiero ver una vista mensual con mi presupuesto total vs gastado.
- ✅ **HU-12**: Como usuario, quiero ver indicadores visuales por subcategoría (disponible/desfalco).
- ⬜ **HU-13**: Como usuario, quiero recibir notificaciones cuando una subcategoría alcance un umbral de gasto (ej: 80%).

> Estado: la página de mes activo ya muestra ingresos, dinero disponible y saldos por subcategoría. Falta un resumen explícito de presupuesto total vs gastado y falta convertirlo en dashboard más visual.

## 5. Control de Deudas

- ✅ **HU-14**: Como usuario, quiero registrar deudas que YO debo (nombre, valor total, pagado, fecha límite).
- ✅ **HU-15**: Como usuario, quiero registrar deudas que ME deben a mí (nombre, valor total, pagado, fecha límite opcional).
- ✅ **HU-16**: Como usuario, quiero marcar pagos parciales o totales de mis deudas.
- ✅ **HU-17**: Como usuario, quiero ver el saldo restante de cada deuda.

> Estado: implementado como módulo independiente `debts`, con modelo `Debt`/`DebtPayment`, dirección explícita (`I_OWE` / `OWED_TO_ME`), pagos parciales, saldo restante derivado, estado `OPEN`/`PAID`, API `/api/debts` y página básica `/debts`. MVP limitado a COP; todavía no se integra con caja/ciclo mensual ni recordatorios.

## 6. Ahorros con Propósito

- ✅ **HU-18**: Como usuario, quiero crear ahorros con destino específico (ej: "Ropa", "Aseo").
- ✅ **HU-19**: Como usuario, quiero que cada ahorro pueda tener una meta o ser sin meta.
- 🟡 **HU-20**: Como usuario, quiero asignar un monto mensual a cada ahorro.
- ✅ **HU-21**: Como usuario, quiero ver el progreso acumulado de mis ahorros.
- ⬜ **HU-22**: Como usuario, cuando un ahorro con meta se cumple y sigo ahorrando, quiero que ese excedente pase a un ahorro sin meta.

> Estado: implementado como `SavingsPocket`/"Bolsillos", con metas opcionales, saldos y movimientos. El monto mensual puede representarse vinculando subcategorías de plantilla a un bolsillo y transfiriendo sobrantes, pero falta automatización completa de excedentes al cumplir meta.

## 7. Sobrantes de Subcategorías

- 🟡 **HU-23**: Como usuario, quiero elegir qué hacer con el sobrante de una subcategoría al final del mes: acumular en un ahorro existente o reiniciar en cero.

> Estado: el cierre mensual permite revisar sobrantes y transferirlos a bolsillos antes de cerrar el mes. Falta una opción explícita para reiniciar el sobrante en cero sin acumularlo en un bolsillo.

## 8. Reportes

- ⬜ **HU-24**: Como usuario, quiero ver qué subcategorías me sobran (las que menos gasto vs presupuesto).
- ⬜ **HU-25**: Como usuario, quiero ver qué subcategorías me desfalcan (las que más gasto vs presupuesto).
- ⬜ **HU-26**: Como usuario, quiero ver el top de subcategorías con más gasto.
- ⬜ **HU-27**: Como usuario, quiero ver el top de subcategorías con más sobrante.
- ⬜ **HU-28**: Como usuario, quiero ver el top de subcategorías con más desfalco.
- ⬜ **HU-29**: Como usuario, quiero comparar mis gastos entre meses.
- ⬜ **HU-30**: Como usuario, quiero exportar mis reportes a PDF.

> Estado: pendiente. Hay datos base suficientes para reportes simples, pero todavía no hay módulo/página de reportes.

## 9. Gestión de Ingresos

- ✅ **HU-31**: Como usuario, quiero registrar múltiples fuentes de ingreso (ej: "Salario", "Freelance") con su nombre y monto.
- ✅ **HU-32**: Como usuario, quiero ver el total de ingresos del mes.
- ✅ **HU-33**: Como usuario, quiero ver el dinero disponible del mes (ingresos + efectivo).

> Estado: ingresos mensuales implementados con alta, edición, eliminación y total mensual. El dinero disponible y el efectivo físico se muestran en el mes activo.

## 10. Control de Efectivo

- ✅ **HU-34**: Como usuario, quiero registrar "retiros de efectivo" para apartar dinero de mi disponible a efectivo físico.
- ✅ **HU-35**: Como usuario, quiero ver mi efectivo actual y cómo suma a mi disponible total.
- ✅ **HU-36**: Como usuario, quiero que al registrar un gasto pagado en efectivo, se descuente tanto del disponible total como del efectivo.
- ✅ **HU-37**: Como usuario, quiero que el efectivo acumulado traspase al siguiente mes sumando al disponible.

> Estado: implementado en el ciclo mensual. El efectivo físico se deriva de movimientos de retiro, gasto en efectivo y arrastre positivo entre meses; no se guarda como saldo mutable.

---

## Funcionalidades para Futuros MVPs

- Transferencias entre subcategorías
- Adjuntar recibos/fotos a gastos
- Integración con bancos
- Respaldo/exportación de datos
- Multi-usuario
