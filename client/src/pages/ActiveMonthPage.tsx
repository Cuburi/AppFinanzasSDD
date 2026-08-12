import { useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import { Button, Card, StatusPill } from "../components/ui";
import { ActiveMonthDashboard } from "../features/monthly-cycle/active-month-dashboard/components/ActiveMonthDashboard";
import { RegistrationSlip } from "../features/monthly-cycle/active-month-dashboard/components/RegistrationSlip";
import { MonthlyLedger } from "../features/monthly-cycle/active-month-dashboard/components/MonthlyLedger";
import { useActiveMonthDashboard } from "../features/monthly-cycle/active-month-dashboard/controllers/useActiveMonthDashboard";
import { useActiveMonthLedger } from "../features/monthly-cycle/active-month-dashboard/controllers/useActiveMonthLedger";
import { buildMonthlyLedgerViewModel } from "../features/monthly-cycle/active-month-dashboard/model/monthlyLedger";
import type { CreditCardView, ExpenseHistoryItem, Month, MonthCategory, MonthlyIncome, MonthSubcategory, PaymentMethod, SavingsPocket } from "../types";

const now = new Date();

const formatMonthDate = (month: Month) => `${month.year}-${String(month.month).padStart(2, "0")}-01`;
const formatDisplayDate = (value: string) => new Date(value).toLocaleDateString("es-CO", { timeZone: "UTC" });
const formatPaymentMethod = (paymentMethod: PaymentMethod) => (paymentMethod === "CASH" ? "Efectivo" : "No efectivo");
const balanceTrend = (amount: number) => (amount < 0 ? "negative" : amount > 0 ? "positive" : "neutral");
const formatCreditCardLabel = (card: CreditCardView) => `${card.issuer} ${card.name}`;
export const formatCop = (amount: number) => `$${amount < 0 ? "-" : ""}${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Math.abs(amount))} COP`;

type MonthlyExpenseHistoryStatus = "idle" | "loading" | "ready" | "error";

export const ActiveMonthPage = () => {
  const dashboard = useActiveMonthDashboard();
  const activeMonth = dashboard.viewModel.month ?? null;
  const historyMonthId = useRef<string | null>(null);
  const historyRequestId = useRef(0);
  const monthlyHistoryRequestId = useRef(0);
  const expenseAmountInputRef = useRef<HTMLInputElement>(null);
  const expenseSlipRef = useRef<HTMLElement>(null);
  const incomeSourceInputRef = useRef<HTMLInputElement>(null);
  const incomeSlipRef = useRef<HTMLElement>(null);
  const [openMonthInput, setOpenMonthInput] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [submitting, setSubmitting] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [incomeSubmitting, setIncomeSubmitting] = useState(false);
  const [activePockets, setActivePockets] = useState<SavingsPocket[]>([]);
  const [activeCreditCards, setActiveCreditCards] = useState<CreditCardView[]>([]);
  const [creditCardLoadError, setCreditCardLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expenseFeedback, setExpenseFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [incomeFeedback, setIncomeFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [expenseSubcategoryId, setExpenseSubcategoryId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseOccurredAt, setExpenseOccurredAt] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>("NON_CASH");
  const [expenseCreditCardId, setExpenseCreditCardId] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseHistory, setExpenseHistory] = useState<ExpenseHistoryItem[]>([]);
  const [expenseHistoryMonthId, setExpenseHistoryMonthId] = useState<string | null>(null);
  const [monthlyExpenseHistory, setMonthlyExpenseHistory] = useState<ExpenseHistoryItem[]>([]);
  const [monthlyExpenseHistoryStatus, setMonthlyExpenseHistoryStatus] = useState<MonthlyExpenseHistoryStatus>("idle");
  const [monthlyExpenseHistoryMonthId, setMonthlyExpenseHistoryMonthId] = useState<string | null>(null);
  const [historyCreditCardId, setHistoryCreditCardId] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalOccurredAt, setWithdrawalOccurredAt] = useState("");
  const [withdrawalDescription, setWithdrawalDescription] = useState("");
  const [depositSourceKind, setDepositSourceKind] = useState<"SUBCATEGORY" | "MONTH_AVAILABLE">("SUBCATEGORY");
  const [depositSourceSubcategoryId, setDepositSourceSubcategoryId] = useState("");
  const [depositPocketId, setDepositPocketId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositOccurredAt, setDepositOccurredAt] = useState("");
  const [pocketsLoadStatus, setPocketsLoadStatus] = useState<"loading" | "ready" | "error">("loading");
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
  const [structureOpen, setStructureOpen] = useState(false);
  const [secondaryForm, setSecondaryForm] = useState<"income" | "withdrawal" | "deposit" | null>(null);

  const refreshExpenseHistory = async (monthId: string, creditCardId = historyCreditCardId) => {
    const currentRequest = ++historyRequestId.current;
    const expenses = creditCardId ? await api.getExpenseHistory(monthId, { creditCardId }) : await api.getExpenseHistory(monthId);
    if (currentRequest === historyRequestId.current) {
      setExpenseHistory(expenses);
      setExpenseHistoryMonthId(monthId);
    }
  };

  const refreshMonthlyExpenseHistory = async (monthId: string, updateVisibleHistory = false) => {
    const currentRequest = ++monthlyHistoryRequestId.current;
    const visibleRequest = updateVisibleHistory ? ++historyRequestId.current : null;
    setMonthlyExpenseHistoryMonthId(monthId);
    setMonthlyExpenseHistoryStatus("loading");

    try {
      const expenses = await api.getExpenseHistory(monthId);
      if (currentRequest === monthlyHistoryRequestId.current) {
        setMonthlyExpenseHistory(expenses);
        setMonthlyExpenseHistoryStatus("ready");
      }
      if (visibleRequest === historyRequestId.current) {
        setExpenseHistory(expenses);
        setExpenseHistoryMonthId(monthId);
      }
    } catch (loadError) {
      if (currentRequest === monthlyHistoryRequestId.current) setMonthlyExpenseHistoryStatus("error");
      throw loadError;
    }
  };

  const refreshExpenseHistoryBestEffort = async (monthId: string) => {
    try {
      if (historyCreditCardId) await Promise.all([refreshExpenseHistory(monthId), refreshMonthlyExpenseHistory(monthId)]);
      else await refreshMonthlyExpenseHistory(monthId, true);
    } catch {
      // A failed history refresh must not turn an already-persisted mutation into a user-facing mutation failure.
    }
  };

  const ledger = useActiveMonthLedger(activeMonth?.id ?? null);

  const refresh = async () => {
    historyMonthId.current = null;
    await dashboard.refresh();
    resetCorrectionForms();
  };

  const loadActivePockets = async () => {
    setPocketsLoadStatus("loading");
    setError(null);
    try {
      const pockets = await api.getPockets("active");
      setActivePockets(pockets);
      setPocketsLoadStatus("ready");
    } catch (loadError) {
      setPocketsLoadStatus("error");
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los bolsillos activos.");
    }
  };

  useEffect(() => {
    void loadActivePockets();
    void api
      .getCreditCards("active")
      .then((cards) => {
        setCreditCardLoadError(null);
        setActiveCreditCards(cards);
      })
      .catch(() => {
        setCreditCardLoadError("No se pudieron cargar las tarjetas activas. Puedes registrar gastos sin tarjeta.");
        setActiveCreditCards([]);
      });
  }, []);

  useEffect(() => {
    if (dashboard.viewModel.lifecycle === "unopened") {
      ++historyRequestId.current;
      ++monthlyHistoryRequestId.current;
      setExpenseHistory([]);
      setExpenseHistoryMonthId(null);
      setMonthlyExpenseHistory([]);
      setMonthlyExpenseHistoryMonthId(null);
      setMonthlyExpenseHistoryStatus("idle");
      historyMonthId.current = null;
      return;
    }
    if (!activeMonth || historyMonthId.current === activeMonth.id) return;
    historyMonthId.current = activeMonth.id;
    setExpenseHistory([]);
    setExpenseHistoryMonthId(null);
    setExpenseOccurredAt(formatMonthDate(activeMonth));
    setWithdrawalOccurredAt(formatMonthDate(activeMonth));
    setDepositOccurredAt(formatMonthDate(activeMonth));
    void refreshExpenseHistoryBestEffort(activeMonth.id);
  }, [activeMonth?.id, dashboard.viewModel.lifecycle]);

  useEffect(() => {
    if (!editingExpenseId) return;
    if (typeof expenseSlipRef.current?.scrollIntoView === "function") expenseSlipRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
    expenseAmountInputRef.current?.focus();
  }, [editingExpenseId]);

  useEffect(() => {
    if (!editingIncomeId) return;
    if (typeof incomeSlipRef.current?.scrollIntoView === "function") incomeSlipRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
    incomeSourceInputRef.current?.focus();
  }, [editingIncomeId]);

  const handleOpenMonth = async (input: { year: number; month: number }) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const createdMonth = await dashboard.openMonth(input);
    if (createdMonth) {
      setMessage(`Mes ${createdMonth.year}-${String(createdMonth.month).padStart(2, "0")} abierto con la estructura de la plantilla vigente.`);
    }
    setSubmitting(false);
  };

  const subcategories = activeMonth?.categories.flatMap((category) => category.subcategories) ?? [];
  const canMutateActiveMonth = activeMonth?.status === "ACTIVE" && !activeMonth.closedAt;
  const plannedBudget = subcategories.reduce((total, subcategory) => total + subcategory.plannedAmount, 0);
  const spentBudget = subcategories.reduce((total, subcategory) => total + Math.max(0, subcategory.plannedAmount - subcategory.available), 0);
  const actualSpent = monthlyExpenseHistory.reduce((total, expense) => total + expense.amount, 0);
  const hasCurrentMonthlyExpenseHistory = monthlyExpenseHistoryStatus === "ready" && monthlyExpenseHistoryMonthId === activeMonth?.id;
  const budgetPercent = plannedBudget === 0 ? 0 : Math.min(100, Math.round((spentBudget / plannedBudget) * 100));

  const resetIncomeForm = (monthData = activeMonth) => {
    setIncomeSourceName("");
    setIncomeAmount("");
    setIncomeReceivedAt(monthData ? formatMonthDate(monthData) : "");
    setIncomeNotes("");
    setEditingIncomeId(null);
    setSecondaryForm(null);
  };

  const openSecondaryForm = (form: "income" | "withdrawal" | "deposit") => {
    resetIncomeForm();
    setSecondaryForm(form);
  };

  const resetExpenseForm = (monthData = activeMonth) => {
    setExpenseSubcategoryId("");
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseOccurredAt(monthData ? formatMonthDate(monthData) : "");
    setExpensePaymentMethod("NON_CASH");
    setExpenseCreditCardId("");
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

  const applyActiveMonthCorrection = async (mutation: () => Promise<Month>, successMessage: string, fallbackError: string, afterSuccess?: (monthData: Month) => void, setLocalFeedback?: (feedback: { kind: "error" | "success"; text: string } | null) => void, revealStructureOnError = false) => {
    setSubmitting(true);
    setLocalFeedback?.(null);
    if (!setLocalFeedback) {
      setError(null);
      setMessage(null);
    }

    try {
      const updatedMonth = await mutation();
      dashboard.replaceMonth(updatedMonth);
      await refreshExpenseHistoryBestEffort(updatedMonth.id);
      await ledger.retry();
      afterSuccess?.(updatedMonth);
      if (setLocalFeedback) setLocalFeedback({ kind: "success", text: successMessage });
      else setMessage(successMessage);
    } catch (submitError) {
      const text = submitError instanceof Error ? submitError.message : fallbackError;
      if (revealStructureOnError) setStructureOpen(true);
      if (setLocalFeedback) setLocalFeedback({ kind: "error", text });
      else setError(text);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingIncome = (income: MonthlyIncome) => {
    setIncomeFeedback(null);
    setIncomeSourceName(income.sourceName);
    setIncomeAmount(String(income.amount));
    setIncomeReceivedAt(income.receivedAt.slice(0, 10));
    setIncomeNotes(income.notes ?? "");
    setSecondaryForm("income");
    setEditingIncomeId(income.id);
  };

  const startEditingExpense = (expense: ExpenseHistoryItem) => {
    setExpenseFeedback(null);
    setExpenseSubcategoryId(expense.subcategory.id);
    setExpenseAmount(String(expense.amount));
    setExpenseDescription(expense.description ?? "");
    setExpenseOccurredAt(expense.occurredAt.slice(0, 10));
    setExpensePaymentMethod(expense.paymentMethod);
    setExpenseCreditCardId(expense.paymentMethod === "CASH" ? "" : expense.creditCardId ?? "");
    setEditingExpenseId(expense.id);
  };

  const getCreditCardLabel = (creditCardId: string | null) => {
    if (!creditCardId) return null;
    const card = activeCreditCards.find((item) => item.id === creditCardId);
    return card ? formatCreditCardLabel(card) : "Tarjeta no disponible";
  };

  const handleExpensePaymentMethodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const paymentMethod = event.target.value as PaymentMethod;
    setExpensePaymentMethod(paymentMethod);
    if (paymentMethod === "CASH") setExpenseCreditCardId("");
  };

  const handleExpenseCreditCardChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const creditCardId = event.target.value;
    setExpenseCreditCardId(creditCardId);
    if (creditCardId) setExpensePaymentMethod("NON_CASH");
  };

  const handleHistoryCreditCardChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const creditCardId = event.target.value;
    setHistoryCreditCardId(creditCardId);
    if (activeMonth) void refreshExpenseHistory(activeMonth.id, creditCardId);
  };

  const startEditingCategory = (category: MonthCategory) => {
    setStructureOpen(true);
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
  };

  const startEditingSubcategory = (subcategory: MonthSubcategory) => {
    setStructureOpen(true);
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
      paymentMethod: expenseCreditCardId ? "NON_CASH" : expensePaymentMethod,
      creditCardId: expensePaymentMethod === "CASH" ? null : expenseCreditCardId || null,
    };

    setExpenseSubmitting(true);
    try {
      await applyActiveMonthCorrection(
        () => (editingExpenseId ? api.updateExpense({ ...input, expenseId: editingExpenseId }) : api.recordExpense(input)),
        editingExpenseId ? "Gasto actualizado en el mes activo y saldos recalculados." : "Gasto registrado y saldos recalculados.",
        editingExpenseId ? "No se pudo actualizar el gasto." : "No se pudo registrar el gasto.",
        resetExpenseForm,
        setExpenseFeedback,
      );
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expense: ExpenseHistoryItem) => {
    if (!activeMonth || !canMutateActiveMonth) return;
    setExpenseSubmitting(true);
    try {
      await applyActiveMonthCorrection(
        () => api.deleteExpense(activeMonth.id, expense.id),
        "Gasto eliminado del mes activo y saldos recalculados.",
        "No se pudo eliminar el gasto.",
        (updatedMonth) => {
          if (editingExpenseId === expense.id) resetExpenseForm(updatedMonth);
        },
        setExpenseFeedback,
      );
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth || !editingCategoryId) return;
    await applyActiveMonthCorrection(
      () => api.updateMonthCategory({ monthId: activeMonth.id, categoryId: editingCategoryId, name: categoryName }),
      "Categoría del mes activo actualizada sin modificar la plantilla global.",
      "No se pudo actualizar la categoría del mes activo.",
      () => resetCategoryForm(),
      undefined,
      true,
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
        : "Categoría creada solo en la estructura de este mes; la plantilla global no cambió.",
      "No se pudo crear la categoría del mes activo.",
      () => resetCreateCategoryForm(),
      undefined,
      true,
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
      undefined,
      true,
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
        : "Subcategoría creada solo en la estructura de este mes; la plantilla global no cambió.",
      "No se pudo crear la subcategoría del mes activo.",
      () => resetCreateSubcategoryForm(),
      undefined,
      true,
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
      undefined,
      true,
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
      undefined,
      true,
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
      dashboard.replaceMonth(updatedMonth);
      await ledger.retry();
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
    setIncomeSubmitting(true);
    setIncomeFeedback(null);

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

      dashboard.replaceMonth(updatedMonth);
      await ledger.retry();
      resetIncomeForm(updatedMonth);
      setIncomeFeedback({ kind: "success", text: editingIncomeId ? "Ingreso actualizado y totales recalculados." : "Ingreso registrado y totales recalculados." });
    } catch (submitError) {
      setIncomeFeedback({ kind: "error", text: submitError instanceof Error ? submitError.message : "No se pudo guardar el ingreso." });
    } finally {
      setSubmitting(false);
      setIncomeSubmitting(false);
    }
  };

  const handleDeleteIncome = async (income: MonthlyIncome) => {
    if (!activeMonth || !canMutateActiveMonth) return;
    setSubmitting(true);
    setIncomeSubmitting(true);
    setIncomeFeedback(null);

    try {
      const updatedMonth = await api.deleteMonthlyIncome(activeMonth.id, income.id);
      dashboard.replaceMonth(updatedMonth);
      await ledger.retry();
      if (editingIncomeId === income.id) {
        resetIncomeForm(updatedMonth);
      }
      setIncomeFeedback({ kind: "success", text: `Ingreso de ${income.sourceName} eliminado y totales recalculados.` });
    } catch (submitError) {
      setIncomeFeedback({ kind: "error", text: submitError instanceof Error ? submitError.message : "No se pudo eliminar el ingreso." });
    } finally {
      setSubmitting(false);
      setIncomeSubmitting(false);
    }
  };

  const handleDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth || !canMutateActiveMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const input = {
        monthId: activeMonth.id,
        targetPocketId: depositPocketId,
        amount: Number(depositAmount),
        occurredAt: depositOccurredAt || formatMonthDate(activeMonth),
      };
      const updatedMonth = await api.depositToPocket(
        depositSourceKind === "SUBCATEGORY"
          ? { ...input, sourceKind: "SUBCATEGORY", sourceSubcategoryId: depositSourceSubcategoryId }
          : { ...input, sourceKind: "MONTH_AVAILABLE" },
      );
      dashboard.replaceMonth(updatedMonth);
      await ledger.retry();
      await loadActivePockets();
      setDepositAmount("");
      setMessage("Depósito a bolsillo registrado.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el depósito.");
    } finally {
      setSubmitting(false);
    }
  };

  const financialSummary = activeMonth ? (
    <Card aria-label="Resumen financiero del mes" className="financial-summary stack-md">
      <div aria-label="Disponible del mes" className="financial-primary" role="region">
        <p className="eyebrow">Disponible del mes</p>
        <p className="financial-primary-value">{formatCop(activeMonth.availableMoney)}</p>
        <p className="sr-only">{activeMonth.availableMoney < 0 ? "Tendencia negativa" : "Tendencia positiva"}</p>
      </div>
      <div className="financial-secondary-metrics">
        <p><span>Ingresos</span><strong>{formatCop(activeMonth.monthlyIncomeTotal)}</strong></p>
        <p>
          <span>Gastado</span>
          <strong>{hasCurrentMonthlyExpenseHistory ? formatCop(actualSpent) : "No disponible"}</strong>
          {monthlyExpenseHistoryStatus === "error" && monthlyExpenseHistoryMonthId === activeMonth?.id ? (
            <span role="alert">
              No se pudo cargar el gasto del mes. <Button onClick={() => void refreshMonthlyExpenseHistory(activeMonth.id, !historyCreditCardId).catch(() => undefined)} type="button" variant="tertiary">Reintentar Gastado</Button>
            </span>
          ) : monthlyExpenseHistoryStatus === "loading" && monthlyExpenseHistoryMonthId === activeMonth?.id ? (
            <span className="sr-only" role="status">Cargando gasto del mes.</span>
          ) : null}
        </p>
        <p aria-label="Efectivo físico" role="region"><span>Efectivo disponible</span><strong>{formatCop(activeMonth.cashBalance)}</strong><span className="sr-only">{activeMonth.cashBalance < 0 ? "Tendencia negativa" : "Tendencia positiva"}</span></p>
      </div>
      <div className="financial-budget">
        <div className="row between wrap"><span>Presupuesto utilizado</span><strong>{budgetPercent}%</strong></div>
        <progress aria-label="Presupuesto utilizado" aria-valuemax={100} aria-valuemin={0} aria-valuenow={budgetPercent} max="100" value={budgetPercent}>{budgetPercent}%</progress>
        <p>{formatCop(spentBudget)} de {formatCop(plannedBudget)}</p>
      </div>
    </Card>
  ) : null;

  const expenseCapture = activeMonth ? (
    <RegistrationSlip
      actions={<><Button disabled={submitting || !canMutateActiveMonth} type="submit">{expenseSubmitting ? editingExpenseId ? "Actualizando gasto..." : "Guardando gasto..." : editingExpenseId ? "Actualizar gasto" : "Registrar gasto"}</Button>{editingExpenseId ? <Button variant="secondary" disabled={submitting} onClick={() => resetExpenseForm()} type="button">Cancelar edición de gasto</Button> : null}</>}
      feedback={<>{expenseFeedback ? <p className={expenseFeedback.kind} role={expenseFeedback.kind === "error" ? "alert" : "status"}>{expenseFeedback.text}</p> : null}{!canMutateActiveMonth ? <p className="error">El mes está cerrado: los gastos son de solo lectura.</p> : null}</>}
      formClassName="expense-capture-form"
      formId="expense-form"
      mode={editingExpenseId ? "edit" : "create"}
      onSubmit={handleExpense}
      primaryFields={<><label className="field expense-amount-field"><span>Monto</span><input min="0.01" ref={expenseAmountInputRef} step="0.01" type="number" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required /></label><label className="field expense-subcategory-field"><span>Subcategoría del gasto</span><select value={expenseSubcategoryId} onChange={(event) => setExpenseSubcategoryId(event.target.value)} required><option value="">Selecciona una subcategoría</option>{subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name} ({formatCop(subcategory.available)})</option>)}</select></label></>}
      purpose="Movimiento del mes"
      slipRef={expenseSlipRef}
      supportingFields={<><label className="field"><span>Fecha del gasto</span><input type="date" value={expenseOccurredAt || formatMonthDate(activeMonth)} onChange={(event) => setExpenseOccurredAt(event.target.value)} required /></label><label className="field"><span>Método de pago</span><select value={expensePaymentMethod} onChange={handleExpensePaymentMethodChange} required><option value="NON_CASH">No efectivo</option><option value="CASH">Efectivo</option></select></label><label className="field"><span>Tarjeta de crédito (opcional)</span><select value={expenseCreditCardId} onChange={handleExpenseCreditCardChange}><option value="">Sin tarjeta / efectivo</option>{activeCreditCards.map((card) => <option key={card.id} value={card.id}>{formatCreditCardLabel(card)}</option>)}</select></label><label className="field expense-description-field"><span>Descripción (opcional)</span><input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} /></label></>}
      title={editingExpenseId ? "Editar gasto" : "Registrar gasto"}
      variant="primary"
    />
  ) : null;

  return (
    <ActiveMonthDashboard expenseContent={expenseCapture} financialContent={financialSummary} input={openMonthInput} onInputChange={setOpenMonthInput} onOpenMonth={(input) => void handleOpenMonth(input)} onRefresh={() => void refresh()} onRetry={() => void dashboard.refresh()} onRetryOpenMonth={(input) => void handleOpenMonth(input)} onRetrySupport={(source) => void dashboard.retrySupport(source)} pending={submitting} viewModel={dashboard.viewModel}>
    <section className="page stack-lg">
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}

      {activeMonth ? (
        <>
          <MonthlyLedger
            days={ledger.monthId === activeMonth.id ? buildMonthlyLedgerViewModel({ monthId: activeMonth.id, status: activeMonth.status, entries: ledger.entries }).days : []}
            actionLabel={(entry) => { const income = activeMonth.incomes.find((item) => item.id === entry.entryKey); return income ? `ingreso ${income.sourceName}` : `gasto ${entry.metadata.description ?? "sin descripción"}`; }}
            identityLabel={(entry) => { const income = activeMonth.incomes.find((item) => item.id === entry.entryKey); return income ? `Fuente: ${income.sourceName}` : undefined; }}
            isActionable={(entry) => entry.eventType === "MONTHLY_INCOME"
              ? activeMonth.incomes.some((item) => item.id === entry.entryKey)
              : hasCurrentMonthlyExpenseHistory && monthlyExpenseHistory.some((item) => item.id === entry.entryKey)}
            onDelete={canMutateActiveMonth && !submitting ? (entry) => {
              const expense = monthlyExpenseHistory.find((item) => item.id === entry.entryKey);
              const income = activeMonth.incomes.find((item) => item.id === entry.entryKey);
              if (expense) void handleDeleteExpense(expense);
              if (income) void handleDeleteIncome(income);
            } : undefined}
            onEdit={canMutateActiveMonth && !submitting ? (entry) => {
              const expense = monthlyExpenseHistory.find((item) => item.id === entry.entryKey);
              const income = activeMonth.incomes.find((item) => item.id === entry.entryKey);
              if (expense) startEditingExpense(expense);
              if (income) startEditingIncome(income);
            } : undefined}
            onRetry={() => void ledger.retry()}
            status={ledger.status}
            unavailableActionReason={(entry) => entry.eventType !== "MONTHLY_INCOME" && !hasCurrentMonthlyExpenseHistory
              ? "No se puede editar ni eliminar este gasto hasta que se actualice el historial de gastos del mes."
              : undefined}
          />
          {creditCardLoadError ? <p className="error" role="alert">{creditCardLoadError}</p> : null}
          <section aria-label="Acciones secundarias" className="secondary-action-strip">
            <Button disabled={!canMutateActiveMonth || submitting} onClick={() => openSecondaryForm("income")} type="button" variant="secondary">Registrar ingreso</Button>
            <Button disabled={!canMutateActiveMonth || submitting} onClick={() => openSecondaryForm("withdrawal")} type="button" variant="secondary">Retirar efectivo</Button>
            <Button disabled={!canMutateActiveMonth || submitting} onClick={() => openSecondaryForm("deposit")} type="button" variant="secondary">Depositar en bolsillo</Button>
          </section>
          {incomeFeedback && secondaryForm !== "income" ? <p className={incomeFeedback.kind} role={incomeFeedback.kind === "error" ? "alert" : "status"}>{incomeFeedback.text}</p> : null}
          {!canMutateActiveMonth ? <p className="error">El mes está cerrado: los movimientos son de solo lectura.</p> : null}
          {secondaryForm === "income" && canMutateActiveMonth ? <RegistrationSlip
            actions={<><Button disabled={submitting} type="submit">{incomeSubmitting ? editingIncomeId ? "Actualizando ingreso..." : "Guardando ingreso..." : editingIncomeId ? "Actualizar ingreso" : "Registrar ingreso"}</Button><Button variant="secondary" disabled={submitting} onClick={() => resetIncomeForm()} type="button">{editingIncomeId ? "Cancelar edición de ingreso" : "Cancelar ingreso"}</Button></>}
            feedback={incomeFeedback ? <p className={incomeFeedback.kind} role={incomeFeedback.kind === "error" ? "alert" : "status"}>{incomeFeedback.text}</p> : null}
            formClassName="income-capture-form" mode={editingIncomeId ? "edit" : "create"} onSubmit={handleIncome}
            primaryFields={<><label className="field income-source-field"><span>Fuente del ingreso</span><input ref={incomeSourceInputRef} value={incomeSourceName} onChange={(event) => setIncomeSourceName(event.target.value)} required /></label><label className="field income-amount-field"><span>Monto</span><input min="0.01" step="0.01" type="number" value={incomeAmount} onChange={(event) => setIncomeAmount(event.target.value)} required /></label></>}
            purpose="Entrada del mes" slipRef={incomeSlipRef}
            supportingFields={<><label className="field"><span>Fecha</span><input type="date" value={incomeReceivedAt || formatMonthDate(activeMonth)} onChange={(event) => setIncomeReceivedAt(event.target.value)} required /></label><label className="field income-notes-field"><span>Notas</span><input value={incomeNotes} onChange={(event) => setIncomeNotes(event.target.value)} /></label></>}
            title={editingIncomeId ? "Editar ingreso" : "Registrar ingreso"} variant="secondary"
          /> : null}
          {secondaryForm === "withdrawal" ? <RegistrationSlip actions={<><Button disabled={submitting || !canMutateActiveMonth} type="submit">Retirar efectivo</Button><Button variant="secondary" disabled={submitting} onClick={() => setSecondaryForm(null)} type="button">Cancelar retiro</Button></>} formClassName="secondary-movement-form" mode="create" onSubmit={handleCashWithdrawal} primaryFields={<><label className="field small-field"><span>Monto a retirar</span><input min="0.01" step="0.01" type="number" value={withdrawalAmount} onChange={(event) => setWithdrawalAmount(event.target.value)} required /></label><label className="field"><span>Fecha del retiro</span><input type="date" value={withdrawalOccurredAt || formatMonthDate(activeMonth)} onChange={(event) => setWithdrawalOccurredAt(event.target.value)} required /></label></>} purpose="Salida a efectivo" supportingFields={<label className="field"><span>Descripción del retiro (opcional)</span><input value={withdrawalDescription} onChange={(event) => setWithdrawalDescription(event.target.value)} /></label>} title="Retirar efectivo" variant="secondary" /> : null}
          {secondaryForm === "deposit" ? <RegistrationSlip actions={<><Button disabled={submitting || !canMutateActiveMonth || pocketsLoadStatus !== "ready"} type="submit">Depositar en bolsillo</Button><Button variant="secondary" disabled={submitting} onClick={() => setSecondaryForm(null)} type="button">Cancelar depósito</Button></>} formClassName="secondary-movement-form" mode="create" onSubmit={handleDeposit} primaryFields={<><label className="field"><span>Bolsillo destino</span><select disabled={pocketsLoadStatus !== "ready"} value={depositPocketId} onChange={(event) => setDepositPocketId(event.target.value)} required><option value="">Selecciona un bolsillo activo</option>{activePockets.map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name} ({formatCop(pocket.balance)})</option>)}</select></label><label className="field small-field"><span>Monto</span><input min="0.01" step="0.01" type="number" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} required /></label></>} purpose="Reserva en bolsillo" supportingFields={<><label className="field"><span>Origen de los fondos</span><select value={depositSourceKind} onChange={(event) => setDepositSourceKind(event.target.value as "SUBCATEGORY" | "MONTH_AVAILABLE")} required><option value="SUBCATEGORY">Subcategoría</option><option value="MONTH_AVAILABLE">Disponible del mes</option></select></label>{depositSourceKind === "SUBCATEGORY" ? <label className="field"><span>Subcategoría de origen</span><select value={depositSourceSubcategoryId} onChange={(event) => setDepositSourceSubcategoryId(event.target.value)} required><option value="">Selecciona una subcategoría</option>{subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name} ({formatCop(subcategory.available)})</option>)}</select></label> : null}<label className="field"><span>Fecha del depósito</span><input type="date" value={depositOccurredAt || formatMonthDate(activeMonth)} onChange={(event) => setDepositOccurredAt(event.target.value)} required /></label>{pocketsLoadStatus === "loading" ? <p role="status">Cargando bolsillos activos.</p> : null}{pocketsLoadStatus === "error" ? <p role="alert">No se pudieron cargar los bolsillos activos.</p> : null}</>} title="Depositar en bolsillo" variant="secondary" /> : null}
          {secondaryForm === "deposit" && pocketsLoadStatus === "error" ? <Button onClick={() => void loadActivePockets()} type="button" variant="tertiary">Reintentar bolsillos activos</Button> : null}
        </>
      ) : null}

      <Card aria-label="Estructura del mes" className="month-structure-card">
        <details className="month-structure-disclosure" onToggle={(event) => setStructureOpen(event.currentTarget.open)} open={structureOpen}>
          <summary>
            <span>
              <strong>Estructura del mes</strong>
              <span>Corrige categorías y subcategorías de este mes sin perder de vista la plantilla global.</span>
            </span>
          </summary>
          <div className="month-structure-content stack-md">
            <div className="row between wrap">
              <h2>Estructura del mes</h2>
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
            <p>Estos cambios corrigen solo la estructura de este mes; no modifican la plantilla global.</p>

            {canMutateActiveMonth ? (
              <div className="stack-md">
                <p>Crea categorías y subcategorías solo en este mes. Antes de promoverlas, marca la copia a plantilla únicamente si quieres que aparezcan en próximos meses.</p>

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
                      <option value="">Selecciona una categoría</option>
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
                          {pocket.name} — predeterminado ({formatCop(pocket.balance)})
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
                        {pocket.name} ({formatCop(pocket.balance)})
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
                          <p>Planificado: {formatCop(subcategory.plannedAmount)}</p>
                        </div>

                        <div className="row gap-sm wrap">
                          <StatusPill aria-label={`Disponible: ${formatCop(subcategory.available)}`} tone={subcategory.available < 0 ? "danger" : "success"}>
                            Disponible: {formatCop(subcategory.available)}
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
          </div>
        </details>
      </Card>
    </section>
    </ActiveMonthDashboard>
  );
};
