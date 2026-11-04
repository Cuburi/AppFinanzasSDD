# Cierre mensual guiado

El cierre revisa gastos, efectivo y diferencias de presupuesto antes de elegir el destino del disponible real. Los saldos positivos de categorías son informativos, no dinero adicional. Los déficits de categorías deben cubrirse y el disponible no puede ser negativo.

## Destino del sobrante

- **Pasar todo al siguiente mes:** `carryAmount` igual al disponible, `excludedAmount: 0`.
- **Dejar todo fuera del seguimiento:** `carryAmount: 0`, `excludedAmount` igual al disponible.
- **Dividir el sobrante:** ambos montos suman exactamente el disponible actual.

Los montos son números finitos no negativos con hasta dos decimales COP; no se redondean entradas inválidas. El servidor recalcula el disponible bajo bloqueo antes de persistir. Una suma desactualizada devuelve 409 sin cambios. No hay gastos, ingresos ni movimientos de bolsillos artificiales. El cierre conserva el disponible histórico; la decisión es metadata separada.

## Contrato HTTP para la pantalla

- `GET /api/months/active` → `{ month: MonthView | null }` (existente).
- `GET /api/months/:id/closure-review` → revisión existente, más `requiresDisposition: boolean` y `closureAllocation: null | { availableMoney, carryAmount, excludedAmount }`. `canClose` conserva su significado anterior: cierre sin payload permitido. Un sobrante positivo exige disposición aunque no tenga déficits.
- `POST /api/months/:id/close` con `{ "carryAmount": 100000, "excludedAmount": 200000 }` → `MonthView`. Con ingreso 1000000 y gastos no efectivos 700000, estos destinos reparten 300000. También se admite 100000.01/199999.99.
- El POST sin cuerpo sigue permitido con disponible cero; con disponible positivo sigue rechazado. Payload parcial, null, strings, negativos, no finitos o más de dos decimales: 400. Suma incorrecta/desactualizada, déficit o decisión repetida diferente: 409.
- `GET /api/months/:id` → `MonthView` persistido (404 si no existe).
- `GET /api/months/latest-closed` → `{ month: MonthView | null }`, ordenado por año/mes descendente.
- `POST /api/months/open` con `{ year, month }` conserva su respuesta 201 y rechaza meses ya existentes/otro mes activo con 409. La UI propone el mes inmediatamente siguiente, incluso diciembre → enero, pero la API permite saltos cronológicos.

`MonthView` añade `openingBalance: number`, `openingSourceMonthId: string | null`, `closureAllocation: null | { availableMoney, carryAmount, excludedAmount }`. La asignación guarda el disponible original como suma de ambos destinos. Los cierres anteriores a la migración muestran `closureAllocation: null` y no designan saldo inicial. Guardar el identificador del cierre en `closedMonthId` de la URL permite recuperar el resultado sin localStorage.

## Saldo inicial y efectivo

Al abrir, el último mes cerrado anterior al destino aporta solo `carryAmount` como saldo inicial, nunca ingreso ni presupuesto planeado. Una procedencia única, transacción serializable y bloqueo del predecesor impiden reutilizarlo; abrir fuera de orden con un predecesor ya consumido devuelve 409. Repetir apertura no duplica saldo ni efectivo. Repetir idéntico cierre devuelve el cierre original, sin cambiar fecha ni decisión.

El efectivo físico se arrastra de forma independiente mediante el movimiento existente. Los gastos en efectivo no vuelven a descontarse del disponible, pues el retiro ya lo descontó. Dejar dinero fuera del seguimiento no cambia el efectivo físico.

Los reportes básicos usan saldo inicial + ingresos − salidas para disponibilidad; ingresos, gastos y planeado conservan su significado. El ledger con `includeSystemEvents=true` proyecta `OPENING_BALANCE`, descripción «Saldo inicial del cierre anterior», con efecto solo sobre disponible. Es transferencia de sistema, no ingreso, gasto ni registro financiero adicional. El ledger predeterminado sigue ocultando eventos de sistema.

La migración es aditiva: saldo inicial por defecto cero, asignaciones anteriores nulas y referencia única al origen. No reescribe movimientos ni datos históricos.
