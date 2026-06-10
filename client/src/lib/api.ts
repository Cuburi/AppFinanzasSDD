import type {
  ClosureActionInput,
  ClosureReview,
  BasicMonthlyReport,
  CashSummary,
  CreateDebtInput,
  CreateMonthCategoryInput,
  CreateMonthSubcategoryInput,
  CreateMonthlyIncomeInput,
  CreatePocketInput,
  DebtView,
  EditableTemplate,
  ExpenseHistoryFilters,
  ExpenseHistoryItem,
  Month,
  PocketListFilter,
  RegisterDebtPaymentInput,
  RecordExpenseInput,
  SavingsPocket,
  UpdateExpenseInput,
  UpdateMonthCategoryInput,
  UpdateMonthlyIncomeInput,
  UpdateMonthSubcategoryInput,
  Template,
  UpdatePocketInput,
  WithdrawCashInput,
} from "../types";

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}.`;

    try {
      const errorBody = (await response.json()) as { message?: string };
      throw new Error(errorBody.message ?? fallback);
    } catch (error) {
      if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
        throw error;
      }

      throw new Error(fallback);
    }
  }

  return (await response.json()) as T;
};

export const api = {
  async getDebts(): Promise<DebtView[]> {
    const response = await fetch("/api/debts");
    const payload = await readJson<{ debts: DebtView[] }>(response);

    return payload.debts;
  },
  async createDebt(input: CreateDebtInput): Promise<DebtView> {
    const response = await fetch("/api/debts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<DebtView>(response);
  },
  async registerDebtPayment(id: string, input: RegisterDebtPaymentInput): Promise<DebtView> {
    const response = await fetch(`/api/debts/${id}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<DebtView>(response);
  },
  async getPockets(filter: PocketListFilter = "active"): Promise<SavingsPocket[]> {
    const activeQuery = filter === "all" ? "all" : String(filter === "active");
    const response = await fetch(`/api/pockets?active=${activeQuery}`);
    const payload = await readJson<{ pockets: SavingsPocket[] }>(response);

    return payload.pockets;
  },
  async getPocket(id: string): Promise<SavingsPocket> {
    const response = await fetch(`/api/pockets/${id}`);
    return readJson<SavingsPocket>(response);
  },
  async createPocket(input: CreatePocketInput): Promise<SavingsPocket> {
    const response = await fetch("/api/pockets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<SavingsPocket>(response);
  },
  async updatePocket(id: string, input: UpdatePocketInput): Promise<SavingsPocket> {
    const response = await fetch(`/api/pockets/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<SavingsPocket>(response);
  },
  async deactivatePocket(id: string): Promise<SavingsPocket> {
    const response = await fetch(`/api/pockets/${id}`, {
      method: "DELETE",
    });

    return readJson<SavingsPocket>(response);
  },
  async getTemplate(): Promise<Template> {
    const response = await fetch("/api/template");
    return readJson<Template>(response);
  },
  async updateTemplate(template: EditableTemplate): Promise<Template> {
    const response = await fetch("/api/template", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(template),
    });

    return readJson<Template>(response);
  },
  async openMonth(input: { year: number; month: number }): Promise<Month> {
    const response = await fetch("/api/months/open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<Month>(response);
  },
  async getActiveMonth(): Promise<Month | null> {
    const response = await fetch("/api/months/active");
    const payload = await readJson<{ month: Month | null }>(response);
    return payload.month;
  },
  async recordExpense(input: RecordExpenseInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceSubcategoryId: input.sourceSubcategoryId,
        amount: input.amount,
        description: input.description,
        occurredAt: input.occurredAt,
        paymentMethod: input.paymentMethod,
      }),
    });

    return readJson<Month>(response);
  },
  async updateExpense(input: UpdateExpenseInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/expenses/${input.expenseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceSubcategoryId: input.sourceSubcategoryId,
        amount: input.amount,
        description: input.description,
        occurredAt: input.occurredAt,
        paymentMethod: input.paymentMethod,
      }),
    });

    return readJson<Month>(response);
  },
  async deleteExpense(monthId: string, expenseId: string): Promise<Month> {
    const response = await fetch(`/api/months/${monthId}/expenses/${expenseId}`, {
      method: "DELETE",
    });

    return readJson<Month>(response);
  },
  async getExpenseHistory(monthId: string, filters: ExpenseHistoryFilters = {}): Promise<ExpenseHistoryItem[]> {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    if (filters.subcategoryId) params.set("subcategoryId", filters.subcategoryId);

    const query = params.toString();
    const response = await fetch(`/api/months/${monthId}/expenses${query ? `?${query}` : ""}`);
    const payload = await readJson<{ expenses: ExpenseHistoryItem[] }>(response);

    return payload.expenses;
  },
  async updateMonthCategory(input: UpdateMonthCategoryInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/categories/${input.categoryId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: input.name }),
    });

    return readJson<Month>(response);
  },
  async createMonthCategory(input: CreateMonthCategoryInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        addToTemplate: input.addToTemplate,
      }),
    });

    return readJson<Month>(response);
  },
  async deleteMonthCategory(monthId: string, categoryId: string): Promise<Month> {
    const response = await fetch(`/api/months/${monthId}/categories/${categoryId}`, {
      method: "DELETE",
    });

    return readJson<Month>(response);
  },
  async updateMonthSubcategory(input: UpdateMonthSubcategoryInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/subcategories/${input.subcategoryId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        plannedAmount: input.plannedAmount,
        defaultPocketId: input.defaultPocketId,
      }),
    });

    return readJson<Month>(response);
  },
  async createMonthSubcategory(input: CreateMonthSubcategoryInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/categories/${input.categoryId}/subcategories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        plannedAmount: input.plannedAmount,
        defaultPocketId: input.defaultPocketId,
        addToTemplate: input.addToTemplate,
      }),
    });

    return readJson<Month>(response);
  },
  async deleteMonthSubcategory(monthId: string, subcategoryId: string): Promise<Month> {
    const response = await fetch(`/api/months/${monthId}/subcategories/${subcategoryId}`, {
      method: "DELETE",
    });

    return readJson<Month>(response);
  },
  async withdrawCash(input: WithdrawCashInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/cash-withdrawals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount,
        occurredAt: input.occurredAt,
        description: input.description,
      }),
    });
    const payload = await readJson<{ month: Month }>(response);

    return payload.month;
  },
  async getCashSummary(monthId: string): Promise<CashSummary> {
    const response = await fetch(`/api/months/${monthId}/cash`);
    return readJson<CashSummary>(response);
  },
  async getBasicReport(monthId: string): Promise<BasicMonthlyReport> {
    const response = await fetch(`/api/months/${monthId}/reports/basic`);
    return readJson<BasicMonthlyReport>(response);
  },
  async createMonthlyIncome(input: CreateMonthlyIncomeInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/incomes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceName: input.sourceName,
        amount: input.amount,
        receivedAt: input.receivedAt,
        notes: input.notes,
      }),
    });

    return readJson<Month>(response);
  },
  async updateMonthlyIncome(input: UpdateMonthlyIncomeInput): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/incomes/${input.incomeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceName: input.sourceName,
        amount: input.amount,
        receivedAt: input.receivedAt,
        notes: input.notes,
      }),
    });

    return readJson<Month>(response);
  },
  async deleteMonthlyIncome(monthId: string, incomeId: string): Promise<Month> {
    const response = await fetch(`/api/months/${monthId}/incomes/${incomeId}`, {
      method: "DELETE",
    });

    return readJson<Month>(response);
  },
  async depositToPocket(input: {
    monthId?: string;
    sourceSubcategoryId?: string;
    targetPocketId: string;
    amount: number;
    description?: string;
    externalSourceLabel?: string;
  }): Promise<Month | null> {
    const response = await fetch("/api/pockets/deposits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const payload = await readJson<{ month: Month | null }>(response);

    return payload.month;
  },
  async getClosureReview(monthId: string): Promise<ClosureReview> {
    const response = await fetch(`/api/months/${monthId}/closure-review`);
    return readJson<ClosureReview>(response);
  },
  async applyClosureAction(input: ClosureActionInput): Promise<ClosureReview> {
    const response = await fetch(`/api/months/${input.monthId}/closure-actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: input.type,
        sourceSubcategoryId: input.sourceSubcategoryId,
        targetSubcategoryId: input.targetSubcategoryId,
        sourcePocketId: input.sourcePocketId,
        targetPocketId: input.targetPocketId,
        amount: input.amount,
        description: input.description,
      }),
    });

    return readJson<ClosureReview>(response);
  },
  async closeMonth(monthId: string): Promise<Month> {
    const response = await fetch(`/api/months/${monthId}/close`, {
      method: "POST",
    });

    return readJson<Month>(response);
  },
};
