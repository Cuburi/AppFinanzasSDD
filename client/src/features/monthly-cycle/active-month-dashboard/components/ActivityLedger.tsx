import { Button } from "../../../../components/ui";
import type { ExpenseHistoryItem, MonthlyIncome } from "../../../../types";
import type { ActivityRow } from "../model/buildActivityRows";

type ActivityLedgerProps = {
  canMutate: boolean;
  getExpenseCardLabel: (expense: ExpenseHistoryItem) => string | null;
  onDeleteExpense: (expense: ExpenseHistoryItem) => void;
  onDeleteIncome: (income: MonthlyIncome) => void;
  onEditExpense: (expense: ExpenseHistoryItem) => void;
  onEditIncome: (income: MonthlyIncome) => void;
  rows: ActivityRow[];
};

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-CO", { timeZone: "UTC" });
const formatAmount = (amount: number) => `$${amount < 0 ? "-" : ""}${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Math.abs(amount))} COP`;

export function ActivityLedger({ canMutate, getExpenseCardLabel, onDeleteExpense, onDeleteIncome, onEditExpense, onEditIncome, rows }: ActivityLedgerProps) {
  return (
    <section aria-label="Gastos e ingresos" className="activity-ledger stack-md">
      <header className="activity-ledger-header">
        <div>
          <h2>Gastos e ingresos</h2>
          <p>Incluye gastos e ingresos registrados; no incluye retiros ni depósitos a bolsillos.</p>
        </div>
        <span className="activity-ledger-column-label">Monto</span>
      </header>
      {rows.length === 0 ? <p>No hay gastos ni ingresos registrados para este mes.</p> : null}
      <div className="activity-ledger-rows">
        {rows.map((row) => {
          const isIncome = row.type === "income";
          const record = row.record;
          return (
            <article className="activity-ledger-row" key={`${row.type}-${row.id}`}>
              <time dateTime={row.date}>{formatDate(row.date)}</time>
              <div className="activity-ledger-type"><strong>{isIncome ? "Ingreso" : "Gasto"}</strong><span aria-hidden="true">{isIncome ? "↑" : "↓"}</span></div>
              <div className="activity-ledger-concept"><strong>{row.concept}</strong><span>{row.metadata}</span>{!isIncome && getExpenseCardLabel(record as ExpenseHistoryItem) ? <span>Tarjeta: {getExpenseCardLabel(record as ExpenseHistoryItem)}</span> : null}</div>
              <strong className="activity-ledger-amount">{formatAmount(row.amount)}</strong>
              {canMutate ? (
                <div className="activity-ledger-actions">
                  {isIncome ? (
                    <>
                      <Button disabled={!canMutate} onClick={() => onEditIncome(record as MonthlyIncome)} type="button" variant="secondary">Editar ingreso {row.concept}</Button>
                      <Button disabled={!canMutate} onClick={() => onDeleteIncome(record as MonthlyIncome)} type="button" variant="tertiary">Eliminar ingreso {row.concept}</Button>
                    </>
                  ) : (
                    <>
                      <Button disabled={!canMutate} onClick={() => onEditExpense(record as ExpenseHistoryItem)} type="button" variant="secondary">Editar gasto {row.concept}</Button>
                      <Button disabled={!canMutate} onClick={() => onDeleteExpense(record as ExpenseHistoryItem)} type="button" variant="tertiary">Eliminar gasto {row.concept}</Button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
