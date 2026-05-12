# User Stories - AppFinanzas

## 1. Autenticación

- **HU-1**: Como usuario, quiero crear una cuenta con email y contraseña para acceder a mis datos financieros.
- **HU-2**: Como usuario, quiero iniciar sesión para ver mi información.

## 2. Gestión de Categorías y Subcategorías

- **HU-3**: Como usuario, quiero crear categorías grandes (ej: "Gastos hogar") para organizar mis gastos.
- **HU-4**: Como usuario, quiero crear subcategorías dentro de una categoría (ej: "Cuota administración") con un presupuesto mensual asignado.
- **HU-5**: Como usuario, quiero editar y eliminar categorías y subcategorías.
- **HU-6**: Como usuario, quiero ver el presupuesto disponible de cada subcategoría en cualquier momento.

## 3. Registro de Gastos

- **HU-7**: Como usuario, quiero registrar un gasto rápido indicando: monto, subcategoría, fecha y descripción opcional.
- **HU-8**: Como usuario, quiero ver el historial de gastos del mes actual.
- **HU-9**: Como usuario, quiero registrar gastos recurrentes mensuales.
- **HU-10**: Como usuario, quiero permitir que una subcategoría muestre saldo negativo (desfalco).

## 4. Dashboard Mensual

- **HU-11**: Como usuario, quiero ver una vista mensual con mi presupuesto total vs gastado.
- **HU-12**: Como usuario, quiero ver indicadores visuales por subcategoría (disponible/desfalco).
- **HU-13**: Como usuario, quiero recibir notificaciones cuando una subcategoría alcance un umbral de gasto (ej: 80%).

## 5. Control de Deudas

- **HU-14**: Como usuario, quiero registrar deudas que YO debo (nombre, valor total, pagado, fecha límite).
- **HU-15**: Como usuario, quiero registrar deudas que ME deben a mí (nombre, valor total, pagado, fecha límite opcional).
- **HU-16**: Como usuario, quiero marcar pagos parciales o totales de mis deudas.
- **HU-17**: Como usuario, quiero ver el saldo restante de cada deuda.

## 6. Ahorros con Propósito

- **HU-18**: Como usuario, quiero crear ahorros con destino específico (ej: "Ropa", "Aseo").
- **HU-19**: Como usuario, quiero que cada ahorro pueda tener una meta o ser sin meta.
- **HU-20**: Como usuario, quiero asignar un monto mensual a cada ahorro.
- **HU-21**: Como usuario, quiero ver el progreso acumulado de mis ahorros.
- **HU-22**: Como usuario, cuando un ahorro con meta se cumple y sigo ahorrando, quiero que ese excedente pase a un ahorro sin meta.

## 7. Sobrantes de Subcategorías

- **HU-23**: Como usuario, quiero elegir qué hacer con el sobrante de una subcategoría al final del mes: acumular en un ahorro existente o reiniciar en cero.

## 8. Reportes

- **HU-24**: Como usuario, quiero ver qué subcategorías me sobran (las que menos gasto vs presupuesto).
- **HU-25**: Como usuario, quiero ver qué subcategorías me desfalcan (las que más gasto vs presupuesto).
- **HU-26**: Como usuario, quiero ver el top de subcategorías con más gasto.
- **HU-27**: Como usuario, quiero ver el top de subcategorías con más sobrante.
- **HU-28**: Como usuario, quiero ver el top de subcategorías con más desfalco.
- **HU-29**: Como usuario, quiero comparar mis gastos entre meses.
- **HU-30**: Como usuario, quiero exportar mis reportes a PDF.

## 9. Gestión de Ingresos

- **HU-31**: Como usuario, quiero registrar múltiples fuentes de ingreso (ej: "Salario", "Freelance") con su nombre y monto.
- **HU-32**: Como usuario, quiero ver el total de ingresos del mes.
- **HU-33**: Como usuario, quiero ver el dinero disponible del mes (ingresos + efectivo).

## 10. Control de Efectivo

- **HU-34**: Como usuario, quiero registrar "retiros de efectivo" para apartar dinero de mi disponible a efectivo físico.
- **HU-35**: Como usuario, quiero ver mi efectivo actual y cómo suma a mi disponible total.
- **HU-36**: Como usuario, quiero que al registrar un gasto pagado en efectivo, se descuente tanto del disponible total como del efectivo.
- **HU-37**: Como usuario, quiero que el efectivo acumulado traspase al siguiente mes sumando al disponible.

---

## Funcionalidades para Futuros MvPs

- Transferencias entre subcategorías
- Adjuntar recibos/fotos a gastos
- Integración con bancos
- Respaldo/exportación de datos
- Multi-usuario
