import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { ExpenseHistoryItem, Month, MonthlyIncome, PaymentMethod, SavingsPocket } from "../types";

const now = new Date();

const formatMonthDate = (month: Month) => `${month.year}-${String(month.month).padStart(2, "0")}-01`;
const formatDisplayDate = (value: string) => new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" });
const formatPaymentMethod = (paymentMethod: PaymentMethod) => (paymentMethod === "CASH" ? "Efectivo" : "No efectivo");

export const ActiveMonthPage = () => {
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activePockets, setActivePockets] = useState<SavingsPocket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expenseSubcategoryId, setExpenseSubcategoryId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseOccurredAt, setExpenseOccurredAt] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>("NON_CASH");
  const [expenseHistory, setExpenseHistory] = useState<ExpenseHistoryItem[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalOccurredAt, setWithdrawalOccurredAt] = useState("");
  const [withdrawalDescription, setWithdrawalDescription] = useState("");
  const [depositSourceSubcategoryId, setDepositSourceSubcategoryId] = useState("");
  const [depositPocketId, setDepositPocketId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositExternalSource, setDepositExternalSource] = useState("");
  const [incomeSourceName, setIncomeSourceName] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeReceivedAt, setIncomeReceivedAt] = useState("");
  const [incomeNotes, setIncomeNotes] = useState("");
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);

  const refreshExpenseHistory = async (monthId: string) => {
    const expenses = await api.getExpenseHistory(monthId);
    setExpenseHistory(expenses);
  };

  const refreshExpenseHistoryBestEffort = async (monthId: string) => {
    try {
      await refreshExpenseHistory(monthId);
    } catch {
      // A failed history refresh must not turn an already-persisted mutation into a user-facing mutation failure.
    }
  };

  const refresh = async () => {
    const monthData = await api.getActiveMonth();
    setActiveMonth(monthData);
    if (monthData) {
      await refreshExpenseHistory(monthData.id);
    } else {
      setExpenseHistory([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [monthData, pockets] = await Promise.all([api.getActiveMonth(), api.getPockets("active")]);
        setActiveMonth(monthData);
        setActivePockets(pockets);
        if (monthData) {
          setExpenseOccurredAt(formatMonthDate(monthData));
          setWithdrawalOccurredAt(formatMonthDate(monthData));
          await refreshExpenseHistory(monthData.id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo consultar el mes activo y los bolsillos activos.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleOpenMonth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const createdMonth = await api.openMonth({
        year: Number(year),
        month: Number(month),
      });

      setActiveMonth(createdMonth);
      setExpenseOccurredAt(formatMonthDate(createdMonth));
      setWithdrawalOccurredAt(formatMonthDate(createdMonth));
      await refreshExpenseHistoryBestEffort(createdMonth.id);
      setMessage(`Mes ${createdMonth.year}-${String(createdMonth.month).padStart(2, "0")} abierto con snapshot de la plantilla vigente.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo abrir el mes.");
    } finally {
      setSubmitting(false);
    }
  };

  const subcategories = activeMonth?.categories.flatMap((category) => category.subcategories) ?? [];
  const canMutateActiveMonth = activeMonth?.status === "ACTIVE";

  const resetIncomeForm = (monthData = activeMonth) => {
    setIncomeSourceName("");
    setIncomeAmount("");
    setIncomeReceivedAt(monthData ? formatMonthDate(monthData) : "");
    setIncomeNotes("");
    setEditingIncomeId(null);
  };

  const startEditingIncome = (income: MonthlyIncome) => {
    setIncomeSourceName(income.sourceName);
    setIncomeAmount(String(income.amount));
    setIncomeReceivedAt(income.receivedAt.slice(0, 10));
    setIncomeNotes(income.notes ?? "");
    setEditingIncomeId(income.id);
  };

  const handleExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMonth = await api.recordExpense({
        monthId: activeMonth.id,
        sourceSubcategoryId: expenseSubcategoryId,
        amount: Number(expenseAmount),
        description: expenseDescription,
        occurredAt: expenseOccurredAt || formatMonthDate(activeMonth),
        paymentMethod: expensePaymentMethod,
      });
      setActiveMonth(updatedMonth);
      setExpenseAmount("");
      setExpenseDescription("");
      await refreshExpenseHistoryBestEffort(updatedMonth.id);
      setMessage("Gasto registrado y saldos recalculados.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el gasto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashWithdrawal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMonth = await api.withdrawCash({
        monthId: activeMonth.id,
        amount: Number(withdrawalAmount),
        occurredAt: withdrawalOccurredAt || formatMonthDate(activeMonth),
        description: withdrawalDescription || undefined,
      });
      setActiveMonth(updatedMonth);
      setWithdrawalAmount("");
      setWithdrawalDescription("");
      setMessage("Retiro de efectivo registrado y saldos recalculados.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo retirar efectivo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncome = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const input = {
        monthId: activeMonth.id,
        sourceName: incomeSourceName,
        amount: Number(incomeAmount),
        receivedAt: incomeReceivedAt || formatMonthDate(activeMonth),
        notes: incomeNotes || null,
      };
      const updatedMonth = editingIncomeId
        ? await api.updateMonthlyIncome({ ...input, incomeId: editingIncomeId })
        : await api.createMonthlyIncome(input);

      setActiveMonth(updatedMonth);
      resetIncomeForm(updatedMonth);
      setMessage(editingIncomeId ? "Ingreso actualizado y totales recalculados." : "Ingreso registrado y totales recalculados.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el ingreso.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = async (income: MonthlyIncome) => {
    if (!activeMonth || !canMutateActiveMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMonth = await api.deleteMonthlyIncome(activeMonth.id, income.id);
      setActiveMonth(updatedMonth);
      if (editingIncomeId === income.id) {
        resetIncomeForm(updatedMonth);
      }
      setMessage(`Ingreso de ${income.sourceName} eliminado y totales recalculados.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo eliminar el ingreso.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMonth = await api.depositToPocket({
        monthId: activeMonth.id,
        sourceSubcategoryId: depositSourceSubcategoryId || undefined,
        targetPocketId: depositPocketId,
        amount: Number(depositAmount),
        externalSourceLabel: depositSourceSubcategoryId ? undefined : depositExternalSource,
      });
      setActiveMonth(updatedMonth ?? (await api.getActiveMonth()));
      setDepositAmount("");
      setDepositExternalSource("");
      setMessage("Depósito a bolsillo registrado.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el depósito.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p>Cargando mes activo...</p>;
  }

  return (
    <section className="page stack-lg">
      <header className="page-header">
        <div>
          <h1>Mes activo</h1>
          <p>Abrí manualmente un mes nuevo. La API bloquea abrir un segundo mes mientras exista uno activo.</p>
        </div>
      </header>

      <article className="card stack-md">
        <h2>Abrir mes manualmente</h2>

        <form className="row gap-sm wrap" onSubmit={handleOpenMonth}>
          <label className="field small-field">
            <span>Año</span>
            <input min="2000" step="1" type="number" value={year} onChange={(event) => setYear(event.target.value)} />
          </label>

          <label className="field small-field">
            <span>Mes</span>
            <input min="1" max="12" step="1" type="number" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>

          <button className="button primary" disabled={submitting} type="submit">
            {submitting ? "Abriendo..." : "Abrir mes"}
          </button>
        </form>

        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </article>

      {activeMonth ? (
        <article className="card stack-md">
          <div>
            <h2>Ingresos del mes</h2>
            <p>El dinero disponible lo calcula la API con ingresos, gastos y depósitos a bolsillos.</p>
          </div>

          <div className="row gap-sm wrap">
            <span className="pill success">Ingresos: ${activeMonth.monthlyIncomeTotal.toFixed(2)}</span>
            <span className={activeMonth.availableMoney < 0 ? "pill danger" : "pill success"}>Disponible del mes: ${activeMonth.availableMoney.toFixed(2)}</span>
            <span className={activeMonth.cashBalance < 0 ? "pill danger" : "pill success"}>Efectivo físico: ${activeMonth.cashBalance.toFixed(2)}</span>
          </div>

          {canMutateActiveMonth ? (
            <form className="row gap-sm wrap" onSubmit={handleIncome}>
              <label className="field">
                <span>Fuente del ingreso</span>
                <input value={incomeSourceName} onChange={(event) => setIncomeSourceName(event.target.value)} required />
              </label>
              <label className="field small-field">
                <span>Monto</span>
                <input min="0.01" step="0.01" type="number" value={incomeAmount} onChange={(event) => setIncomeAmount(event.target.value)} required />
              </label>
              <label className="field small-field">
                <span>Fecha</span>
                <input type="date" value={incomeReceivedAt || formatMonthDate(activeMonth)} onChange={(event) => setIncomeReceivedAt(event.target.value)} required />
              </label>
              <label className="field">
                <span>Notas</span>
                <input value={incomeNotes} onChange={(event) => setIncomeNotes(event.target.value)} />
              </label>
              <button className="button primary" disabled={submitting} type="submit">
                {editingIncomeId ? "Actualizar ingreso" : "Registrar ingreso"}
              </button>
              {editingIncomeId ? (
                <button className="button secondary" disabled={submitting} onClick={() => resetIncomeForm()} type="button">
                  Cancelar edición
                </button>
              ) : null}
            </form>
          ) : (
            <p className="error">El mes está cerrado: los ingresos son de solo lectura.</p>
          )}

          <div className="stack-sm">
            {activeMonth.incomes.length === 0 ? <p>No hay ingresos cargados para este mes.</p> : null}
            {activeMonth.incomes.map((income) => (
              <div className="budget-line align-start" key={income.id}>
                <div>
                  <strong>{income.sourceName}</strong>
                  <p>
                    {formatDisplayDate(income.receivedAt)}{income.notes ? ` · ${income.notes}` : ""}
                  </p>
                </div>
                <div className="row gap-sm wrap">
                  <span className="pill success">${income.amount.toFixed(2)}</span>
                  {canMutateActiveMonth ? (
                    <>
                      <button className="button secondary" disabled={submitting} onClick={() => startEditingIncome(income)} type="button">
                        Editar ingreso
                      </button>
                      <button className="button tertiary" disabled={submitting} onClick={() => void handleDeleteIncome(income)} type="button">
                        Eliminar ingreso
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {activeMonth ? (
        <article className="card stack-md">
          <h2>Operación diaria</h2>

          <form className="row gap-sm wrap" onSubmit={handleExpense}>
            <label className="field">
              <span>Subcategoría del gasto</span>
              <select value={expenseSubcategoryId} onChange={(event) => setExpenseSubcategoryId(event.target.value)} required>
                <option value="">Elegí una subcategoría</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name} (${subcategory.available.toFixed(2)})
                  </option>
                ))}
              </select>
            </label>
            <label className="field small-field">
              <span>Monto</span>
              <input min="0.01" step="0.01" type="number" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required />
            </label>
            <label className="field small-field">
              <span>Fecha del gasto</span>
              <input type="date" value={expenseOccurredAt || formatMonthDate(activeMonth)} onChange={(event) => setExpenseOccurredAt(event.target.value)} required />
            </label>
            <label className="field small-field">
              <span>Método de pago</span>
              <select value={expensePaymentMethod} onChange={(event) => setExpensePaymentMethod(event.target.value as PaymentMethod)} required>
                <option value="NON_CASH">No efectivo</option>
                <option value="CASH">Efectivo</option>
              </select>
            </label>
            <label className="field">
              <span>Descripción</span>
              <input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} />
            </label>
            <button className="button primary" disabled={submitting} type="submit">
              Registrar gasto
            </button>
          </form>

          <form className="row gap-sm wrap" onSubmit={handleCashWithdrawal}>
            <label className="field small-field">
              <span>Monto a retirar</span>
              <input min="0.01" step="0.01" type="number" value={withdrawalAmount} onChange={(event) => setWithdrawalAmount(event.target.value)} required />
            </label>
            <label className="field small-field">
              <span>Fecha del retiro</span>
              <input type="date" value={withdrawalOccurredAt || formatMonthDate(activeMonth)} onChange={(event) => setWithdrawalOccurredAt(event.target.value)} required />
            </label>
            <label className="field">
              <span>Descripción del retiro</span>
              <input value={withdrawalDescription} onChange={(event) => setWithdrawalDescription(event.target.value)} />
            </label>
            <button className="button primary" disabled={submitting || !canMutateActiveMonth} type="submit">
              Retirar efectivo
            </button>
          </form>

          <form className="row gap-sm wrap" onSubmit={handleDeposit}>
            <label className="field">
              <span>Origen subcategoría (opcional)</span>
              <select value={depositSourceSubcategoryId} onChange={(event) => setDepositSourceSubcategoryId(event.target.value)}>
                <option value="">Ingreso externo</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name} (${subcategory.available.toFixed(2)})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Bolsillo destino</span>
              <select value={depositPocketId} onChange={(event) => setDepositPocketId(event.target.value)} required>
                <option value="">Elegí un bolsillo activo</option>
                {activePockets.map((pocket) => (
                  <option key={pocket.id} value={pocket.id}>
                    {pocket.name} (${pocket.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </label>
            <label className="field small-field">
              <span>Monto</span>
              <input min="0.01" step="0.01" type="number" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} required />
            </label>
            <label className="field">
              <span>Origen externo</span>
              <input disabled={Boolean(depositSourceSubcategoryId)} value={depositExternalSource} onChange={(event) => setDepositExternalSource(event.target.value)} />
            </label>
            <button className="button primary" disabled={submitting} type="submit">
              Depositar en bolsillo
            </button>
          </form>

          <section className="stack-sm">
            <h3>Historial de gastos del mes</h3>
            {expenseHistory.length === 0 ? <p>No hay gastos registrados para este mes.</p> : null}
            {expenseHistory.map((expense) => (
              <div className="budget-line align-start" key={expense.id}>
                <div>
                  <strong>{expense.description || "Gasto sin descripción"}</strong>
                  <p>
                    {formatDisplayDate(expense.occurredAt)} · {expense.subcategory.name} · {expense.category.name} · {formatPaymentMethod(expense.paymentMethod)}
                  </p>
                </div>
                <span className="pill danger">-${expense.amount.toFixed(2)}</span>
              </div>
            ))}
          </section>
        </article>
      ) : null}

      <article className="card stack-md">
        <div className="row between wrap">
          <h2>Snapshot del mes activo</h2>
          <button className="button secondary" onClick={() => void refresh()} type="button">
            Refrescar
          </button>
        </div>

        {activeMonth ? (
          <>
            <p>
              <strong>
                {activeMonth.year}-{String(activeMonth.month).padStart(2, "0")}
              </strong>{" "}
              · estado {activeMonth.status}
            </p>

            <div className="stack-md">
              {activeMonth.categories.map((category) => (
                <section className="stack-sm" key={category.id}>
                  <h3>{category.name}</h3>

                  <div className="stack-sm">
                    {category.subcategories.map((subcategory) => (
                      <div className="budget-line" key={subcategory.id}>
                        <div>
                          <strong>{subcategory.name}</strong>
                          <p>Planificado: ${subcategory.plannedAmount.toFixed(2)}</p>
                        </div>

                        <span className={subcategory.available < 0 ? "pill danger" : "pill success"}>
                          Disponible: ${subcategory.available.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <p>Todavía no hay un mes activo.</p>
        )}
      </article>
    </section>
  );
};
