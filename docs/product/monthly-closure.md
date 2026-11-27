# Cierre mensual guiado

El cierre revisa gastos, efectivo y diferencias de presupuesto antes de elegir el destino del disponible real. Los saldos positivos de categorías son informativos, no dinero adicional. Los déficits de categorías y el disponible negativo son avisos: el servidor permite cerrar con confirmación explícita, sin crear movimientos de cobertura.

## Decidido (2026-11-26): el cierre avisa, no bloquea

**Estado: contrato de servidor y pantalla para v1.0.**

Principio: la app registra el dinero, no lo controla. Una desviación de presupuesto (planear mal) es información; un disponible negativo (faltó dinero) se avisa, pero puede haberse resuelto fuera de la app.

1. **Subcategoría sobrepasada con disponible positivo.** Ejemplo: Transporte con $50.000 presupuestados y $60.000 gastados (−$10.000) y disponible +$500.000. El cierre se permite tras un aviso en Revisar y una confirmación explícita («Entiendo, cerrar igual»). El gasto ya está registrado y descontado: no se descuenta otra vez ni hay que reponer. Presupuesto, gasto real y desviación se conservan en el cierre y en los reportes.
2. **Disponible negativo.** El cierre se permite tras un aviso y una confirmación explícita. El faltante puede cubrirse fuera de la app. Se eliminan ambas acciones de cobertura del cierre; si se usó un bolsillo registrado, se registra un retiro ordinario en Bolsillos.
3. **Mes siguiente tras cerrar en negativo sin reponer:** arranca con saldo inicial $0. El cierre registra el faltante como «cubierto fuera de la app» y queda visible en el historial y los reportes; es la contraparte de «dejar fuera del seguimiento» en el sobrante positivo.
4. **Se eliminan ambas reposiciones del cierre:** no se crean movimientos nuevos ni se oculta la desviación. Los movimientos de cobertura históricos se siguen mostrando en el ledger.

Decisiones del usuario:

> Conincido con la C pero ahm no se si dejar la parte de poder "reponer" porque en teoria en ese caso el gasto ya se registro

> Concuerdo contigo dejarlo cuando el disponible es negativo, pero aca algo muy importante es no limitarlo a sacar de bolsilllo dejemoslo tambien como a confirmar porque, por ejemplo mi bolsillo de emergencia no lo tengo en la app porque diariamiente crece por queesta en una cuenta de alto rendimiento pero bueno el punto es la posibilidad de darle al usuario que cierre el mes y ya el pues  a nivel interno gestione ese desfalco porque no siempre involucra que gaste de mis bolsillos registrados

Mes siguiente tras cerrar en negativo: «Arranca en $0».

Solicitud original:

> Ahm, eso anotalo porque creo que hay que mirarlo bine, me refiero creo que eso de lo negativo sirve mas como para informar, no se si deba limitar el cierre del mes, es decir si mi subcategoria de transporte quedo con -10,000 pero mi reporte general del mes es +500,000 quiere decir que este mas gaste mas delo presupuestado en esa sub categoria pero no quiere decir que no pueida cerrar el mes, pero tocaria revisarlo bien, ademas de que esto tambien ayuda en terminos de reportes saber si una categoria tiene mucho o poco asignado

## Pantalla de cierre

La ruta `/close-month` ofrece tres pasos: **Revisar → Destino → Confirmar**, con progreso lateral en escritorio y horizontal en móvil. Los paneles comparten tamaño intrínseco sin mostrar ni enfocar pasos inactivos. El detalle nativo de efectivo, bolsillos y presupuesto se cierra al avanzar de revisión a destino. Volver conserva la selección y los textos de división mientras no se refresque la revisión.

**Revisar** muestra saldo inicial + ingresos − salidas netas = disponible real. Las salidas netas se reconcilian desde los saldos del backend: incluyen retiros de efectivo y depósitos a bolsillos con sus ajustes, no solo gastos. El efectivo físico y el margen del presupuesto son contexto, nunca sumandos adicionales. Las subcategorías sobrepasadas muestran avisos como «Transporte se pasó $10.000 del presupuesto», sin descontar otra vez el gasto. Si hay avisos, hay que marcar «Entiendo, cerrar igual» para avanzar. La confirmación se reinicia al refrescar la revisión. No hay formularios ni acciones de cobertura. El servidor exige confirmación de los avisos, no cobertura ni corrección de movimientos.

**Destino** solo despliega campos al dividir. Escribí números completos sin separadores de miles, con punto decimal opcional y hasta dos decimales. No se aceptan negativos, exponentes, NaN, infinito, prefijos numéricos con texto ni sumas incorrectas. Se comparan centavos enteros exactos antes de habilitar el siguiente paso. Con disponible cero no hace falta elegir una distribución. Con disponible negativo se omite Destino: Revisar explica que el faltante queda «cubierto fuera de la app» y el siguiente mes empieza en $0; Confirmar muestra el faltante y ambos destinos en cero. El historial cerrado conserva el disponible negativo y el monto cubierto fuera de la app.

**Confirmar** presenta ambos destinos y el total antes de la acción financiera irreversible. Durante el envío se bloquean acciones duplicadas. Si falla el cierre, se vuelve a consultar el estado persistido y se exige revisar los nuevos totales; si también falla la consulta, se conservan ambos errores y no se permite cerrar con la revisión anterior. Refrescar permite reintentar las consultas fallidas.

El cierre correcto guarda su identidad en `?closedMonthId=…` mediante el historial del navegador, sin localStorage. Al recargar se consulta ese mes exacto antes de buscar el activo; una identidad o estado incompatible se muestra como error, nunca como otro cierre. Sin selector se busca el activo o el último cerrado. Los cierres antiguos indican que no tienen distribución registrada. Abrir el siguiente mes limpia el selector y muestra el saldo inicial devuelto por la API separado de ingresos, incluso si falla la posterior revisión.

## Destino del sobrante

- **Pasar todo al siguiente mes:** `carryAmount` igual al disponible, `excludedAmount: 0`.
- **Dejar todo fuera del seguimiento:** `carryAmount: 0`, `excludedAmount` igual al disponible.
- **Dividir el sobrante:** ambos montos suman exactamente el disponible actual.
- **Disponible negativo:** `carryAmount: 0`, `excludedAmount: 0`, `shortfallAmount` igual al faltante absoluto y `acknowledgedWarnings: true`. Se registra como «cubierto fuera de la app».

La igualdad en centavos es `carryAmount + excludedAmount − shortfallAmount = availableMoney`. Con disponible no negativo, el faltante se omite o es cero.

Los montos son números finitos no negativos con hasta dos decimales COP; no se redondean entradas inválidas. El servidor recalcula el disponible bajo bloqueo antes de persistir. Una suma desactualizada devuelve 409 sin cambios. No hay gastos, ingresos ni movimientos de bolsillos artificiales. El cierre conserva el disponible histórico; la decisión es metadata separada.

## Contrato HTTP para la pantalla

- `GET /api/months/active` → `{ month: MonthView | null }` (existente).
- `GET /api/months/:id/closure-review` → revisión existente, más `requiresDisposition: boolean`, `requiresAcknowledgement: boolean`, `shortfallAmount: number` y `closureAllocation: null | { availableMoney, carryAmount, excludedAmount, shortfallAmount }`. `canClose` conserva su significado anterior: cierre sin payload permitido. Un sobrante positivo exige disposición aunque no tenga déficits.
- `POST /api/months/:id/close` con `{ "carryAmount": 100000, "excludedAmount": 200000 }` → `MonthView`. Con ingreso 1000000 y gastos no efectivos 700000, estos destinos reparten 300000. También se admite 100000.01/199999.99.
- El POST sin cuerpo solo se permite en un mes ACTIVE, con disponible cero y sin avisos. Con avisos, se exige `acknowledgedWarnings: true`; de lo contrario devuelve 409 («Debe confirmar que entiende los avisos antes de cerrar el mes.»). Si se incluye la confirmación con otro valor, devuelve 400. Payload parcial, null, strings, negativos, no finitos o más de dos decimales: 400. Distribución incorrecta/desactualizada o decisión repetida diferente: 409. Los déficits confirmados no bloquean el cierre.
- `GET /api/months/:id` → `MonthView` persistido (404 si no existe).
- `GET /api/months/latest-closed` → `{ month: MonthView | null }`, ordenado por año/mes descendente.
- `POST /api/months/open` con `{ year, month }` conserva su respuesta 201 y rechaza meses ya existentes/otro mes activo con 409. La UI propone el mes inmediatamente siguiente, incluso diciembre → enero, pero la API permite saltos cronológicos.

`MonthView` añade `openingBalance: number`, `openingSourceMonthId: string | null`, `closureAllocation: null | { availableMoney, carryAmount, excludedAmount, shortfallAmount }`. El disponible original es la suma de ambos destinos menos el faltante. Los cierres nuevos guardan faltante cero o positivo; el valor nulo de cierres heredados se lee como cero. Los cierres anteriores a la migración muestran `closureAllocation: null` y no designan saldo inicial. Guardar el identificador del cierre en `closedMonthId` de la URL permite recuperar el resultado sin localStorage.

## Saldo inicial y efectivo

Al abrir, el último mes cerrado anterior al destino aporta solo `carryAmount` como saldo inicial, nunca ingreso ni presupuesto planeado. Tras un cierre negativo, el siguiente mes arranca en $0: el faltante no se arrastra. Una procedencia única, transacción serializable y bloqueo del predecesor impiden reutilizarlo; abrir fuera de orden con un predecesor ya consumido devuelve 409. Repetir apertura no duplica saldo ni efectivo. Repetir idéntico cierre devuelve el cierre original, sin cambiar fecha ni decisión.

El efectivo físico se arrastra de forma independiente mediante el movimiento existente. Los gastos en efectivo no vuelven a descontarse del disponible, pues el retiro ya lo descontó. Dejar dinero fuera del seguimiento no cambia el efectivo físico.

Los reportes básicos usan saldo inicial + ingresos − salidas para disponibilidad; ingresos, gastos y planeado conservan su significado. El ledger con `includeSystemEvents=true` proyecta `OPENING_BALANCE`, descripción «Saldo inicial del cierre anterior», con efecto solo sobre disponible. Es transferencia de sistema, no ingreso, gasto ni registro financiero adicional. El ledger predeterminado sigue ocultando eventos de sistema.

La migración es aditiva: saldo inicial por defecto cero, asignaciones anteriores nulas y referencia única al origen. No reescribe movimientos ni datos históricos.
