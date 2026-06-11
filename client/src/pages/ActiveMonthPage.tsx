import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { Button, Card, KpiCard, SectionHeader, StatusPill } from "../components/ui";
import type { ExpenseHistoryItem, Month, MonthCategory, MonthlyIncome, MonthSubcategory, PaymentMethod, SavingsPocket } from "../types";

const now = new Date();

const formatMonthDate = (month: Month) => `${month.year}-${String(month.month).padStart(2, "0")}-01`;
const formatDisplayDate = (value: string) => new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" });
const formatPaymentMethod = (paymentMethod: PaymentMethod) => (paymentMethod === "CASH" ? "Efectivo" : "No efectivo");
const balanceTrend = (amount: number) => (amount < 0 ? "negative" : amount > 0 ? "positive" : "neutral");

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
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryAddToTemplate, setNewCategoryAddToTemplate] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryPlannedAmount, setSubcategoryPlannedAmount] = useState("");
  const [subcategoryDefaultPocketId, setSubcategoryDefaultPocketId] = useState("");
  const [newSubcategoryParentId, setNewSubcategoryParentId] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryPlannedAmount, setNewSubcategoryPlannedAmount] = useState("");
  const [newSubcategoryDefaultPocketId, setNewSubcategoryDefaultPocketId] = useState("");
  const [newSubcategoryAddToTemplate, setNewSubcategoryAddToTemplate] = useState(false);

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
    resetCorrectionForms(monthData);
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
  const canMutateActiveMonth = activeMonth?.status === "ACTIVE" && !activeMonth.closedAt;

  const resetIncomeForm = (monthData = activeMonth) => {
    setIncomeSourceName("");
    setIncomeAmount("");
    setIncomeReceivedAt(monthData ? formatMonthDate(monthData) : "");
    setIncomeNotes("");
    setEditingIncomeId(null);
  };

  const resetExpenseForm = (monthData = activeMonth) => {
    setExpenseSubcategoryId("");
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseOccurredAt(monthData ? formatMonthDate(monthData) : "");
    setExpensePaymentMethod("NON_CASH");
    setEditingExpenseId(null);
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryName("");
  };

  const resetCreateCategoryForm = () => {
    setNewCategoryName("");
    setNewCategoryAddToTemplate(false);
  };

  const resetSubcategoryForm = () => {
    setEditingSubcategoryId(null);
    setSubcategoryName("");
    setSubcategoryPlannedAmount("");
    setSubcategoryDefaultPocketId("");
  };

  const resetCreateSubcategoryForm = () => {
    setNewSubcategoryParentId("");
    setNewSubcategoryName("");
    setNewSubcategoryPlannedAmount("");
    setNewSubcategoryDefaultPocketId("");
    setNewSubcategoryAddToTemplate(false);
  };

  const resetCorrectionForms = (monthData = activeMonth) => {
    resetExpenseForm(monthData);
    resetCategoryForm();
    resetSubcategoryForm();
    resetCreateCategoryForm();
    resetCreateSubcategoryForm();
  };

  const applyActiveMonthCorrection = async (mutation: () => Promise<Month>, successMessage: string, fallbackError: string, afterSuccess?: (monthData: Month) => void) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMonth = await mutation();
      setActiveMonth(updatedMonth);
      await refreshExpenseHistoryBestEffort(updatedMonth.id);
      afterSuccess?.(updatedMonth);
      setMessage(successMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : fallbackError);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingIncome = (income: MonthlyIncome) => {
    setIncomeSourceName(income.sourceName);
    setIncomeAmount(String(income.amount));
    setIncomeReceivedAt(income.receivedAt.slice(0, 10));
    setIncomeNotes(income.notes ?? "");
    setEditingIncomeId(income.id);
  };

  const startEditingExpense = (expense: ExpenseHistoryItem) => {
    setExpenseSubcategoryId(expense.subcategory.id);
    setExpenseAmount(String(expense.amount));
    setExpenseDescription(expense.description ?? "");
    setExpenseOccurredAt(expense.occurredAt.slice(0, 10));
    setExpensePaymentMethod(expense.paymentMethod);
    setEditingExpenseId(expense.id);
  };

  const startEditingCategory = (category: MonthCategory) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
  };

  const startEditingSubcategory = (subcategory: MonthSubcategory) => {
    setEditingSubcategoryId(subcategory.id);
    setSubcategoryName(subcategory.name);
    setSubcategoryPlannedAmount(String(subcategory.plannedAmount));
    setSubcategoryDefaultPocketId(subcategory.defaultPocketId ?? "");
  };

  const handleExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth) return;
    const input = {
      monthId: activeMonth.id,
      sourceSubcategoryId: expenseSubcategoryId,
      amount: Number(expenseAmount),
      description: expenseDescription,
      occurredAt: expenseOccurredAt || formatMonthDate(activeMonth),
      paymentMethod: expensePaymentMethod,
    };

    await applyActiveMonthCorrection(
      () => (editingExpenseId ? api.updateExpense({ ...input, expenseId: editingExpenseId }) : api.recordExpense(input)),
      editingExpenseId ? "Gasto actualizado en el mes activo y saldos recalculados." : "Gasto registrado y saldos recalculados.",
      editingExpenseId ? "No se pudo actualizar el gasto." : "No se pudo registrar el gasto.",
      resetExpenseForm,
    );
  };

  const handleDeleteExpense = async (expense: ExpenseHistoryItem) => {
    if (!activeMonth || !canMutateActiveMonth) return;
    await applyActiveMonthCorrection(
      () => api.deleteExpense(activeMonth.id, expense.id),
      "Gasto eliminado del mes activo y saldos recalculados.",
      "No se pudo eliminar el gasto.",
      (updatedMonth) => {
        if (editingExpenseId === expense.id) resetExpenseForm(updatedMonth);
      },
    );
  };

  const handleCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth || !editingCategoryId) return;
    await applyActiveMonthCorrection(
      () => api.updateMonthCategory({ monthId: activeMonth.id, categoryId: editingCategoryId, name: categoryName }),
      "Categoría del mes activo actualizada sin modificar la plantilla global.",
      "No se pudo actualizar la categoría del mes activo.",
      () => resetCategoryForm(),
    );
  };

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth) return;
    const shouldPromote = newCategoryAddToTemplate;
    await applyActiveMonthCorrection(
      () => api.createMonthCategory({ monthId: activeMonth.id, name: newCategoryName, addToTemplate: shouldPromote }),
      shouldPromote
        ? "Categoría creada en este mes y copiada a la plantilla global para próximos meses."
        : "Categoría creada solo en el snapshot del mes activo; la plantilla global no cambió.",
      "No se pudo crear la categoría del mes activo.",
      () => resetCreateCategoryForm(),
    );
  };

  const handleSubcategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth || !editingSubcategoryId) return;
    await applyActiveMonthCorrection(
      () =>
        api.updateMonthSubcategory({
          monthId: activeMonth.id,
          subcategoryId: editingSubcategoryId,
          name: subcategoryName,
          plannedAmount: Number(subcategoryPlannedAmount),
          defaultPocketId: subcategoryDefaultPocketId || null,
        }),
      "Subcategoría del mes activo actualizada sin modificar la plantilla global.",
      "No se pudo actualizar la subcategoría del mes activo.",
      () => resetSubcategoryForm(),
    );
  };

  const handleCreateSubcategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth) return;
    const shouldPromote = newSubcategoryAddToTemplate;
    await applyActiveMonthCorrection(
      () =>
        api.createMonthSubcategory({
          monthId: activeMonth.id,
          categoryId: newSubcategoryParentId,
          name: newSubcategoryName,
          plannedAmount: Number(newSubcategoryPlannedAmount),
          defaultPocketId: newSubcategoryDefaultPocketId || null,
          addToTemplate: shouldPromote,
        }),
      shouldPromote
        ? "Subcategoría creada en este mes y copiada a la plantilla global para próximos meses."
        : "Subcategoría creada solo en el snapshot del mes activo; la plantilla global no cambió.",
      "No se pudo crear la subcategoría del mes activo.",
      () => resetCreateSubcategoryForm(),
    );
  };

  const handleDeleteCategory = async (category: MonthCategory) => {
    if (!activeMonth || !canMutateActiveMonth) return;
    await applyActiveMonthCorrection(
      () => api.deleteMonthCategory(activeMonth.id, category.id),
      "Categoría eliminada del mes activo sin modificar la plantilla global.",
      "No se pudo eliminar la categoría del mes activo.",
      () => {
        if (editingCategoryId === category.id) resetCategoryForm();
      },
    );
  };

  const handleDeleteSubcategory = async (subcategory: MonthSubcategory) => {
    if (!activeMonth || !canMutateActiveMonth) return;
    await applyActiveMonthCorrection(
      () => api.deleteMonthSubcategory(activeMonth.id, subcategory.id),
      "Subcategoría eliminada del mes activo sin modificar la plantilla global.",
      "No se pudo eliminar la subcategoría del mes activo.",
      () => {
        if (editingSubcategoryId === subcategory.id) resetSubcategoryForm();
      },
    );
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
      <SectionHeader title="Mes activo" description="Abrí manualmente un mes nuevo. La API bloquea abrir un segundo mes mientras exista uno activo." />

      <Card aria-label="Abrir mes manualmente" className="stack-md">
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

          <Button disabled={submitting} type="submit">
            {submitting ? "Abriendo..." : "Abrir mes"}
          </Button>
        </form>

        {message ? <p className="success">{message}</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </Card>

      {activeMonth ? (
        <Card aria-label="Ingresos y saldos del mes" className="stack-md">
          <div>
            <h2>Ingresos del mes</h2>
            <p>El dinero disponible lo calcula la API con ingresos, gastos y depósitos a bolsillos.</p>
          </div>

          <div className="dashboard-kpi-grid">
            <KpiCard label="Ingresos del mes" value={`$${activeMonth.monthlyIncomeTotal.toFixed(2)}`} trend={balanceTrend(activeMonth.monthlyIncomeTotal)} />
            <KpiCard label="Disponible del mes" value={`$${activeMonth.availableMoney.toFixed(2)}`} trend={balanceTrend(activeMonth.availableMoney)} />
            <KpiCard label="Efectivo físico" value={`$${activeMonth.cashBalance.toFixed(2)}`} trend={balanceTrend(activeMonth.cashBalance)} />
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
              <Button disabled={submitting} type="submit">
                {editingIncomeId ? "Actualizar ingreso" : "Registrar ingreso"}
              </Button>
              {editingIncomeId ? (
                <Button variant="secondary" disabled={submitting} onClick={() => resetIncomeForm()} type="button">
                  Cancelar edición
                </Button>
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
                  <StatusPill tone="success">Ingreso ${income.amount.toFixed(2)}</StatusPill>
                  {canMutateActiveMonth ? (
                    <>
                      <Button variant="secondary" disabled={submitting} onClick={() => startEditingIncome(income)} type="button">
                        Editar ingreso
                      </Button>
                      <Button variant="tertiary" disabled={submitting} onClick={() => void handleDeleteIncome(income)} type="button">
                        Eliminar ingreso
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {activeMonth ? (
        <Card aria-label="Operación diaria" className="stack-md">
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
            <Button disabled={submitting || !canMutateActiveMonth} type="submit">
              {editingExpenseId ? "Actualizar gasto" : "Registrar gasto"}
            </Button>
            {editingExpenseId ? (
              <Button variant="secondary" disabled={submitting} onClick={() => resetExpenseForm()} type="button">
                Cancelar edición de gasto
              </Button>
            ) : null}
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
            <Button disabled={submitting || !canMutateActiveMonth} type="submit">
              Retirar efectivo
            </Button>
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
            <Button disabled={submitting} type="submit">
              Depositar en bolsillo
            </Button>
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
                <div className="row gap-sm wrap">
                  <StatusPill tone="danger">Gasto -${expense.amount.toFixed(2)}</StatusPill>
                  {canMutateActiveMonth ? (
                    <>
                      <Button variant="secondary" disabled={submitting} onClick={() => startEditingExpense(expense)} type="button">
                        Editar gasto {expense.description || "sin descripción"}
                      </Button>
                      <Button variant="tertiary" disabled={submitting} onClick={() => void handleDeleteExpense(expense)} type="button">
                        Eliminar gasto {expense.description || "sin descripción"}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        </Card>
      ) : null}

      <Card aria-label="Snapshot del mes activo" className="stack-md">
        <div className="row between wrap">
          <h2>Snapshot del mes activo</h2>
          <Button variant="secondary" onClick={() => void refresh()} type="button">
            Refrescar
          </Button>
        </div>

        {activeMonth ? (
          <>
            <p>
              <strong>
                {activeMonth.year}-{String(activeMonth.month).padStart(2, "0")}
              </strong>{" "}
              · estado {activeMonth.status}
            </p>
            <p>Estos cambios corrigen solo el snapshot del mes activo; no modifican la plantilla global.</p>

            {canMutateActiveMonth ? (
              <div className="stack-md">
                <p>Creá categorías y subcategorías solo en este mes. Marcá la copia a plantilla únicamente si querés que aparezcan en próximos meses.</p>

                <form aria-label="Crear categoría del mes activo" className="row gap-sm wrap" onSubmit={handleCreateCategory}>
                  <label className="field">
                    <span>Nueva categoría</span>
                    <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Copiar categoría a plantilla</span>
                    <input type="checkbox" checked={newCategoryAddToTemplate} onChange={(event) => setNewCategoryAddToTemplate(event.target.checked)} />
                  </label>
                  <Button disabled={submitting} type="submit">
                    Crear categoría
                  </Button>
                </form>

                <form aria-label="Crear subcategoría del mes activo" className="row gap-sm wrap" onSubmit={handleCreateSubcategory}>
                  <label className="field">
                    <span>Categoría padre</span>
                    <select value={newSubcategoryParentId} onChange={(event) => setNewSubcategoryParentId(event.target.value)} required>
                      <option value="">Elegí una categoría</option>
                      {activeMonth.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Nueva subcategoría</span>
                    <input value={newSubcategoryName} onChange={(event) => setNewSubcategoryName(event.target.value)} required />
                  </label>
                  <label className="field small-field">
                    <span>Planificado inicial</span>
                    <input min="0" step="0.01" type="number" value={newSubcategoryPlannedAmount} onChange={(event) => setNewSubcategoryPlannedAmount(event.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Bolsillo predeterminado inicial</span>
                    <select value={newSubcategoryDefaultPocketId} onChange={(event) => setNewSubcategoryDefaultPocketId(event.target.value)}>
                      <option value="">Sin bolsillo predeterminado</option>
                      {activePockets.map((pocket) => (
                        <option key={pocket.id} value={pocket.id}>
                          {pocket.name} — predeterminado (${pocket.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Copiar a plantilla también</span>
                    <input type="checkbox" checked={newSubcategoryAddToTemplate} onChange={(event) => setNewSubcategoryAddToTemplate(event.target.checked)} />
                  </label>
                  <Button disabled={submitting} type="submit">
                    Crear subcategoría
                  </Button>
                </form>
              </div>
            ) : (
              <p className="error">El mes está cerrado: la estructura es de solo lectura y no se pueden crear categorías ni subcategorías.</p>
            )}

            {editingCategoryId ? (
              <form aria-label="Editar categoría del mes activo" className="row gap-sm wrap" onSubmit={handleCategory}>
                <label className="field">
                  <span>Nombre categoría</span>
                  <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required />
                </label>
                <Button disabled={submitting} type="submit">
                  Guardar categoría
                </Button>
                <Button variant="secondary" disabled={submitting} onClick={resetCategoryForm} type="button">
                  Cancelar categoría
                </Button>
              </form>
            ) : null}

            {editingSubcategoryId ? (
              <form aria-label="Editar subcategoría del mes activo" className="row gap-sm wrap" onSubmit={handleSubcategory}>
                <label className="field">
                  <span>Nombre subcategoría</span>
                  <input value={subcategoryName} onChange={(event) => setSubcategoryName(event.target.value)} required />
                </label>
                <label className="field small-field">
                  <span>Planificado</span>
                  <input min="0" step="0.01" type="number" value={subcategoryPlannedAmount} onChange={(event) => setSubcategoryPlannedAmount(event.target.value)} required />
                </label>
                <label className="field">
                  <span>Bolsillo predeterminado</span>
                  <select value={subcategoryDefaultPocketId} onChange={(event) => setSubcategoryDefaultPocketId(event.target.value)}>
                    <option value="">Sin bolsillo predeterminado</option>
                    {activePockets.map((pocket) => (
                      <option key={pocket.id} value={pocket.id}>
                        {pocket.name} (${pocket.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </label>
                <Button disabled={submitting} type="submit">
                  Guardar subcategoría
                </Button>
                <Button variant="secondary" disabled={submitting} onClick={resetSubcategoryForm} type="button">
                  Cancelar subcategoría
                </Button>
              </form>
            ) : null}

            <div className="stack-md">
              {activeMonth.categories.map((category) => (
                <section className="stack-sm" key={category.id}>
                  <div className="row between wrap align-start">
                    <h3>{category.name}</h3>
                    {canMutateActiveMonth ? (
                      <div className="row gap-sm wrap">
                        <Button variant="secondary" disabled={submitting} onClick={() => startEditingCategory(category)} type="button">
                          Editar categoría {category.name}
                        </Button>
                        <Button variant="tertiary" disabled={submitting} onClick={() => void handleDeleteCategory(category)} type="button">
                          Eliminar categoría {category.name}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="stack-sm">
                    {category.subcategories.map((subcategory) => (
                      <div className="budget-line align-start" key={subcategory.id}>
                        <div>
                          <strong>{subcategory.name}</strong>
                          <p>Planificado: ${subcategory.plannedAmount.toFixed(2)}</p>
                        </div>

                        <div className="row gap-sm wrap">
                          <StatusPill tone={subcategory.available < 0 ? "danger" : "success"}>
                            Disponible: ${subcategory.available.toFixed(2)}
                          </StatusPill>
                          {canMutateActiveMonth ? (
                            <>
                              <Button variant="secondary" disabled={submitting} onClick={() => startEditingSubcategory(subcategory)} type="button">
                                Editar subcategoría {subcategory.name}
                              </Button>
                              <Button variant="tertiary" disabled={submitting} onClick={() => void handleDeleteSubcategory(subcategory)} type="button">
                                Eliminar subcategoría {subcategory.name}
                              </Button>
                            </>
                          ) : null}
                        </div>
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
      </Card>
    </section>
  );
};
