import { Button, Card, StatusPill } from "../../../../components/ui";
import { formatCop } from "../../../../lib/money";
import type { Month } from "../../../../types";

export type ClosedMonthDashboardProps = {
  month: Month;
  onOpenNextMonth: () => void;
  isOpeningNextMonth?: boolean;
};

const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function getNextMonthLabel(month: Month) {
  const nextMonth = month.month === 12 ? 1 : month.month + 1;
  const nextYear = month.month === 12 ? month.year + 1 : month.year;

  return `${monthNames[nextMonth - 1]} de ${nextYear}`;
}

export function ClosedMonthDashboard({ month, onOpenNextMonth, isOpeningNextMonth = false }: ClosedMonthDashboardProps) {
  return (
    <section aria-label="Resumen del mes cerrado" className="stack-lg">
      <Card className="stack-md">
        <div className="stack-sm">
          <h1>{monthNames[month.month - 1].replace(/^\w/, (letter) => letter.toUpperCase())} {month.year}</h1>
          <StatusPill tone="success">Mes cerrado</StatusPill>
          <p>Este mes es de solo lectura y ya no se puede modificar.</p>
        </div>
        <dl>
          <div>
            <dt>Ingresos del mes</dt>
            <dd>${month.monthlyIncomeTotal.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Dinero disponible</dt>
            <dd>${month.availableMoney.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Saldo en efectivo</dt>
            <dd>${month.cashBalance.toFixed(2)}</dd>
          </div>
        </dl>
        {month.closureAllocation ? <section aria-label="Historial de distribución del cierre" className="month-closure-history">
          <h2>Destino del sobrante</h2>
          <dl><div><dt>Disponible al cerrar</dt><dd>{formatCop(month.closureAllocation.availableMoney)}</dd></div><div><dt>Saldo inicial del siguiente mes</dt><dd>{formatCop(month.closureAllocation.carryAmount)}</dd></div><div><dt>Fuera del seguimiento</dt><dd>{formatCop(month.closureAllocation.excludedAmount)}</dd></div></dl>
          <p>El saldo inicial no es un ingreso nuevo. Lo excluido queda en este historial: no es un gasto ni disponible del siguiente mes. El efectivo físico se arrastra de forma independiente.</p>
        </section> : <p>Cierre anterior sin distribución registrada.</p>}
      </Card>

      <Card className="stack-sm">
        <h2>Continuar al siguiente mes</h2>
        <p>Abrí el siguiente mes sin modificar el período cerrado.</p>
        <Button disabled={isOpeningNextMonth} onClick={onOpenNextMonth} type="button">
          {isOpeningNextMonth ? "Abriendo mes..." : `Abrir ${getNextMonthLabel(month)}`}
        </Button>
      </Card>
    </section>
  );
}
