# Plan de Implementación - AppFinanzas

## Resumen

| Sprint | Duración | Entregable |
|--------|----------|------------|
| 1 | 2 semanas | Auth + Setup + Ingresos |
| 2 | 2 semanas | Categorías/Subcategorías |
| 3 | 2 semanas | Gastos + Efectivo |
| 4 | 2 semanas | Dashboard + Notificaciones |
| 5 | 2 semanas | Deudas + Ahorros |
| 6 | 2 semanas | Sobrantes + Reportes |
| 7 | 1.5 semanas | Polish + Despliegue |
| **Total** | **13.5 semanas** | MVP completo |

---

## Sprint 1: Auth + Setup + Ingresos

### 1.1 Setup del Proyecto
- [ ] Inicializar proyecto (client + server separados)
- [ ] Configurar ESLint, Prettier, TypeScript
- [ ] Configurar estructura de carpetas
- [ ] Crear README

### 1.2 Autenticación
- [ ] HU-1: Registrar usuario con email y contraseña
- [ ] HU-2: Iniciar sesión
- [ ] Middleware de autenticación
- [ ] Logout

### 1.3 Base de Datos
- [ ] Diseñar esquema de base de datos (Prisma)
- [ ] Implementar migraciones
- [ ] Crear seeders de prueba

### 1.4 Gestión de Ingresos
- [ ] HU-31: Registrar múltiples fuentes de ingreso
- [ ] HU-32: Ver total de ingresos del mes
- [ ] HU-33: Ver dinero disponible (ingresos + efectivo)

---

## Sprint 2: Categorías y Subcategorías

### 2.1 Gestión de Categorías
- [ ] HU-3: Crear categoría grande
- [ ] HU-5: Editar y eliminar categorías

### 2.2 Gestión de Subcategorías
- [ ] HU-4: Crear subcategoría con presupuesto mensual
- [ ] HU-5: Editar y eliminar subcategorías
- [ ] HU-6: Ver presupuesto disponible por subcategoría

---

## Sprint 3: Gastos + Efectivo

### 3.1 Registro de Gastos
- [ ] HU-7: Registrar gasto (monto, subcategoría, fecha, descripción opcional, medio de pago)
- [ ] HU-8: Ver historial de gastos del mes
- [ ] HU-9: Registrar gastos recurrentes mensuales
- [ ] HU-10: Permitir saldo negativo (desfalco)

### 3.2 Control de Efectivo
- [ ] HU-34: Registrar retiros de efectivo
- [ ] HU-35: Ver efectivo actual y cómo suma al disponible total
- [ ] HU-36: Gasto en efectivo descuenta del disponible y del efectivo
- [ ] HU-37: Efectivo acumula mes a mes

---

## Sprint 4: Dashboard + Notificaciones

### 4.1 Dashboard
- [ ] HU-11: Vista mensual presupuesto total vs gastado
- [ ] HU-12: Indicadores visuales por subcategoría (disponible/desfalco)

### 4.2 Notificaciones
- [ ] HU-13: Alertas por subcategoría al alcanzar umbral (ej: 80%)

---

## Sprint 5: Deudas + Ahorros

### 5.1 Control de Deudas
- [ ] HU-14: Registrar deudas que YO debo (nombre, valor total, pagado, fecha límite)
- [ ] HU-15: Registrar deudas que ME deben (fecha límite opcional)
- [ ] HU-16: Marcar pagos parciales o totales
- [ ] HU-17: Ver saldo restante de cada deuda

### 5.2 Ahorros con Propósito
- [ ] HU-18: Crear ahorro con destino específico
- [ ] HU-19: Ahorro con meta o sin meta
- [ ] HU-20: Asignar monto mensual a cada ahorro
- [ ] HU-21: Ver progreso acumulado
- [ ] HU-22: Meta cumplida pasa a ahorro sin meta

---

## Sprint 6: Sobrantes + Reportes

### 6.1 Sobrantes de Subcategorías
- [ ] HU-23: Elegir destino del sobrante (acumular en ahorro o reiniciar)

### 6.2 Reportes
- [ ] HU-24: Ver subcategorías que sobran
- [ ] HU-25: Ver subcategorías que desfalcan
- [ ] HU-26: Top subcategorías con más gasto
- [ ] HU-27: Top subcategorías con más sobrante
- [ ] HU-28: Top subcategorías con más desfalco
- [ ] HU-29: Comparativa entre meses
- [ ] HU-30: Exportar reportes a PDF

---

## Sprint 7: Polish y Despliegue

- [ ] Testing de todas las funcionalidades
- [ ] Corrección de bugs
- [ ] Responsive design
- [ ] Despliegue en Railway
- [ ] Documentación final

---

## Dependencias entre Historias de Usuario

```
HU-1, HU-2 (Auth)
    ↓
HU-31, HU-32, HU-33 (Ingresos)
    ↓
HU-3, HU-4, HU-5, HU-6 (Categorías)
    ↓
HU-7, HU-8, HU-9, HU-10 (Gastos)
    ↓
HU-34, HU-35, HU-36, HU-37 (Efectivo)
    ↓
HU-11, HU-12, HU-13 (Dashboard + Notif)
    ↓
HU-14, HU-15, HU-16, HU-17 (Deudas)
    ↓
HU-18, HU-19, HU-20, HU-21, HU-22 (Ahorros)
    ↓
HU-23 (Sobrantes)
    ↓
HU-24 - HU-30 (Reportes)
```

---

## Funcionalidades para Futuros MvPs

- Transferencias entre subcategorías
- Adjuntar recibos/fotos a gastos
- Integración con bancos
- Respaldo/exportación de datos
- Multi-usuario
