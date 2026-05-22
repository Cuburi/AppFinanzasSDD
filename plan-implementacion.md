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
| Gastos | 🟡 Parcial | Registro de gasto y desfalco funcionan; falta fecha explícita, medio de pago y vista clara de historial mensual. |
| Bolsillos / ahorros | 🟡 Parcial | Bolsillos con meta opcional, saldo, movimientos y depósitos. Falta automatización de excedentes al cumplir meta. |
| Sobrantes y cierre | 🟡 Parcial | Revisión de cierre, sobrantes a bolsillo y cobertura de desfases; falta opción explícita de reiniciar sobrante en cero. |
| Efectivo físico | ⬜ Pendiente | No hay flujo específico para retiros/gastos en efectivo. |
| Deudas | ⬜ Pendiente | No hay modelo ni módulo todavía. |
| Reportes | ⬜ Pendiente | Hay datos base, pero falta módulo/página. |

## Próximo foco recomendado

**Historial de gastos + efectivo físico** es el candidato más conectado al núcleo actual.

Por qué:

- Cierra huecos del flujo que ya usamos todos los meses: registrar gastos, ver historial y entender disponible real.
- Completa partes pendientes de HU-7, HU-8, HU-33 y HU-34 a HU-37.
- Evita construir deudas encima de una base mensual que todavía no distingue efectivo físico ni medio de pago.
- Es más transversal que Deudas, así que conviene hacerlo con SDD y cuidando fuerte la arquitectura de `monthly-cycle`.

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
- 🟡 HU-33: Ver dinero disponible (ingresos + efectivo)

> Nota: ingresos y disponible mensual existen. Falta sumar el concepto específico de efectivo físico.

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

- 🟡 HU-7: Registrar gasto (monto, subcategoría, fecha y descripción opcional)
- 🟡 HU-8: Ver historial de gastos del mes
- ⬜ HU-9: Registrar gastos recurrentes mensuales
- ✅ HU-10: Permitir saldo negativo (desfalco)

> Nota: el registro de gasto descuenta disponibilidad y permite desfalco, pero todavía no permite elegir fecha ni medio de pago. Falta una pantalla/sección de historial mensual y gastos recurrentes.

### 3.2 Control de Efectivo

- ⬜ HU-34: Registrar retiros de efectivo
- ⬜ HU-35: Ver efectivo actual y cómo suma al disponible total
- ⬜ HU-36: Gasto en efectivo descuenta del disponible y del efectivo
- ⬜ HU-37: Efectivo acumula mes a mes

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
Próximo núcleo recomendado: historial de gastos + efectivo físico
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
