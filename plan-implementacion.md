# Plan de Implementación - AppFinanzas

Este plan refleja el estado real del MVP después del trabajo de ciclo mensual. El objetivo ahora es dejar de mirar una lista vieja como si nada hubiera pasado: ya hay bastante base construida y necesitamos usarla para decidir el siguiente corte.

## Estado actual resumido

| Área | Estado | Nota |
|------|--------|------|
| Setup base | 🟡 Parcial | Monorepo client/server, README, Prisma y tests existen. Falta cerrar tooling como ESLint/Prettier si lo queremos formal. |
| Auth | ⬜ Pendiente | La app todavía funciona sin usuarios. |
| Plantilla presupuestaria | ✅ Implementada | Categorías, subcategorías, presupuesto mensual y bolsillo por defecto. |
| Ciclo mensual | ✅ Implementado | Abrir mes, snapshot de plantilla, mes activo, cierre y bloqueo de mes cerrado. |
| Ingresos | ✅ Implementados | Alta, edición, eliminación y total mensual. |
| Gastos | 🟡 Parcial | Registro de gasto con fecha, medio de pago, historial mensual y desfalco funcionan. Falta gastos recurrentes. |
| Bolsillos / ahorros | 🟡 Parcial | Bolsillos con meta opcional, saldo, movimientos y depósitos. Falta automatización de excedentes al cumplir meta. |
| Sobrantes y cierre | 🟡 Parcial | Revisión de cierre, sobrantes a bolsillo y cobertura de desfases; falta opción explícita de reiniciar sobrante en cero. |
| Efectivo físico | ✅ Implementado | Hay retiros, saldo de efectivo físico, gastos en efectivo sin doble descuento y arrastre positivo entre meses. |
| Deudas | ⬜ Pendiente | No hay modelo ni módulo todavía. |
| Reportes | ⬜ Pendiente | Hay datos base, pero falta módulo/página. |

## Último foco completado

**Historial de gastos + efectivo físico** quedó implementado como el último corte del ciclo mensual.

Qué cerró:

- Registro de gasto con fecha explícita y medio de pago.
- Historial mensual de gastos.
- Retiros de efectivo físico.
- Saldo de efectivo físico derivado de movimientos.
- Gasto en efectivo sin doble descontar el disponible mensual.
- Arrastre positivo de efectivo al abrir un nuevo mes.

**Control de Deudas** sigue siendo el mejor candidato si queremos una feature más aislada y menos riesgosa arquitectónicamente.

---

## Sprint 1: Base + Ingresos

### 1.1 Setup del Proyecto

- ✅ Inicializar proyecto (client + server separados)
- 🟡 Configurar ESLint, Prettier, TypeScript
- ✅ Configurar estructura de carpetas
- ✅ Crear README

### 1.2 Autenticación

- ⬜ HU-1: Registrar usuario con email y contraseña
- ⬜ HU-2: Iniciar sesión
- ⬜ Middleware de autenticación
- ⬜ Logout

> Decisión actual: auth queda postergada. Primero estamos consolidando el dominio financiero en modo single-user/local.

### 1.3 Base de Datos

- ✅ Diseñar esquema de base de datos (Prisma)
- ✅ Implementar migraciones base
- ⬜ Crear seeders de prueba

### 1.4 Gestión de Ingresos

- ✅ HU-31: Registrar múltiples fuentes de ingreso
- ✅ HU-32: Ver total de ingresos del mes
- ✅ HU-33: Ver dinero disponible (ingresos + efectivo)

> Nota: ingresos, disponible mensual y efectivo físico existen. El efectivo se deriva de movimientos, no de un saldo mutable.

---

## Sprint 2: Categorías y Subcategorías

### 2.1 Gestión de Categorías

- ✅ HU-3: Crear categoría grande
- ✅ HU-5: Editar y eliminar categorías

### 2.2 Gestión de Subcategorías

- ✅ HU-4: Crear subcategoría con presupuesto mensual
- ✅ HU-5: Editar y eliminar subcategorías
- ✅ HU-6: Ver presupuesto disponible por subcategoría

> Nota: la plantilla permite modificar la estructura completa. No hay CRUD granular por item, pero la historia queda cubierta funcionalmente para el MVP.

---

## Sprint 3: Gastos + Efectivo

### 3.1 Registro de Gastos

- ✅ HU-7: Registrar gasto (monto, subcategoría, fecha y descripción opcional)
- ✅ HU-8: Ver historial de gastos del mes
- ⬜ HU-9: Registrar gastos recurrentes mensuales
- ✅ HU-10: Permitir saldo negativo (desfalco)

> Nota: el registro de gasto ya incluye fecha explícita, medio de pago, recalculo de saldos e historial mensual. Sigue pendiente HU-9: gastos recurrentes.

### 3.2 Control de Efectivo

- ✅ HU-34: Registrar retiros de efectivo
- ✅ HU-35: Ver efectivo actual y cómo suma al disponible total
- ✅ HU-36: Gasto en efectivo descuenta del disponible y del efectivo
- ✅ HU-37: Efectivo acumula mes a mes

> Nota: el efectivo físico queda modelado como ledger derivado: retiros, gastos en efectivo y arrastre positivo entre meses.

---

## Sprint 4: Dashboard + Notificaciones

### 4.1 Dashboard

- 🟡 HU-11: Vista mensual presupuesto total vs gastado
- ✅ HU-12: Indicadores visuales por subcategoría (disponible/desfalco)

> Nota: existe como vista funcional de mes activo. Falta un resumen explícito presupuesto total vs gastado y pulido visual si queremos llamarlo dashboard final.

### 4.2 Notificaciones

- ⬜ HU-13: Alertas por subcategoría al alcanzar umbral (ej: 80%)

---

## Sprint 5: Deudas + Ahorros

### 5.1 Control de Deudas

- ⬜ HU-14: Registrar deudas que YO debo (nombre, valor total, pagado, fecha límite)
- ⬜ HU-15: Registrar deudas que ME deben (fecha límite opcional)
- ⬜ HU-16: Marcar pagos parciales o totales
- ⬜ HU-17: Ver saldo restante de cada deuda

> Corte recomendado si queremos bajo riesgo: implementar este bloque como módulo independiente `debts`.

### 5.2 Ahorros con Propósito

- ✅ HU-18: Crear ahorro con destino específico
- ✅ HU-19: Ahorro con meta o sin meta
- 🟡 HU-20: Asignar monto mensual a cada ahorro
- ✅ HU-21: Ver progreso acumulado
- ⬜ HU-22: Meta cumplida pasa a ahorro sin meta

> Nota: hoy se implementa como `SavingsPocket`/Bolsillos. El usuario puede crear bolsillos, poner meta, ver saldo y registrar depósitos. Falta automatización de excedentes y reglas más finas de asignación mensual.

---

## Sprint 6: Sobrantes + Reportes

### 6.1 Sobrantes de Subcategorías

- 🟡 HU-23: Elegir destino del sobrante (acumular en ahorro o reiniciar)

> Nota: el cierre mensual permite revisar sobrantes y moverlos a bolsillos antes de cerrar. Falta la opción explícita de reiniciar en cero.

### 6.2 Reportes

- ⬜ HU-24: Ver subcategorías que sobran
- ⬜ HU-25: Ver subcategorías que desfalcan
- ⬜ HU-26: Top subcategorías con más gasto
- ⬜ HU-27: Top subcategorías con más sobrante
- ⬜ HU-28: Top subcategorías con más desfalco
- ⬜ HU-29: Comparativa entre meses
- ⬜ HU-30: Exportar reportes a PDF

---

## Sprint 7: Polish y Despliegue

- 🟡 Testing de funcionalidades principales
- 🟡 Corrección de bugs
- ⬜ Responsive design
- ⬜ Despliegue en Railway
- 🟡 Documentación final

---

## Dependencias reales actualizadas

```txt
Base técnica + Prisma
    ↓
Plantilla presupuestaria
    ↓
Abrir mes con snapshot
    ↓
Ingresos + gastos + cálculo de disponibilidad
    ↓
Bolsillos / ahorros + depósitos
    ↓
Cierre mensual + sobrantes/desfases
    ↓
Historial de gastos + efectivo físico
    ↓
Después: deudas, reportes, notificaciones, auth
```

---

## Funcionalidades para Futuros MVPs

- Transferencias entre subcategorías
- Adjuntar recibos/fotos a gastos
- Integración con bancos
- Respaldo/exportación de datos
- Multi-usuario
