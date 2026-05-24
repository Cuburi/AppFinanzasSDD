export type TemplateSubcategory = {
  id: string;
  name: string;
  plannedAmount: number;
  defaultPocketId: string | null;
  active: boolean;
  sortOrder: number;
};

export type TemplateCategory = {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: TemplateSubcategory[];
};

export type Template = {
  categories: TemplateCategory[];
};

export type EditableTemplateSubcategory = Pick<TemplateSubcategory, "name" | "plannedAmount" | "defaultPocketId">;

export type EditableTemplateCategory = {
  name: string;
  subcategories: EditableTemplateSubcategory[];
};

export type EditableTemplate = {
  categories: EditableTemplateCategory[];
};

export type SavingsPocketMovement = {
  id: string;
  amount: number;
  description: string | null;
  occurredAt: string;
  direction: "in" | "out";
};

export type SavingsPocket = {
  id: string;
  name: string;
  goalAmount: number | null;
  active: boolean;
  balance: number;
  recentMovements?: SavingsPocketMovement[];
};

export type DebtDirection = "I_OWE" | "OWED_TO_ME";

export type DebtStatus = "OPEN" | "PAID";

export type DebtPaymentView = {
  id: string;
  amount: number;
  paidAt: string;
  notes: string | null;
};

export type DebtView = {
  id: string;
  direction: DebtDirection;
  counterpartyName: string;
  description: string | null;
  totalAmount: number;
  currency: string;
  originDate: string;
  remainingBalance: number;
  status: DebtStatus;
  payments: DebtPaymentView[];
};

export type CreateDebtInput = {
  direction: DebtDirection;
  counterpartyName: string;
  totalAmount: number;
  originDate: string;
  description?: string | null;
  currency?: string;
};

export type RegisterDebtPaymentInput = {
  amount: number;
  paidAt: string;
  notes?: string | null;
};

export type PocketListFilter = "active" | "inactive" | "all";

export type CreatePocketInput = {
  name: string;
  goalAmount?: number | null;
};

export type UpdatePocketInput = {
  name?: string;
  goalAmount?: number | null;
  active?: boolean;
};

export type MonthSubcategory = {
  id: string;
  name: string;
  plannedAmount: number;
  available: number;
  defaultPocketId: string | null;
  templateSubcategoryId: string | null;
  sortOrder: number;
};

export type MonthCategory = {
  id: string;
  name: string;
  sortOrder: number;
  templateCategoryId: string | null;
  subcategories: MonthSubcategory[];
};

export type MonthlyIncome = {
  id: string;
  monthId: string;
  sourceName: string;
  amount: number;
  receivedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethod = "NON_CASH" | "CASH";

export type RecordExpenseInput = {
  monthId: string;
  sourceSubcategoryId: string;
  amount: number;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  description?: string;
};

export type ExpenseHistoryFilters = {
  from?: string;
  to?: string;
  paymentMethod?: PaymentMethod;
  subcategoryId?: string;
};

export type ExpenseHistoryItem = {
  id: string;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  amount: number;
  description: string | null;
  category: {
    id: string;
    name: string;
  };
  subcategory: {
    id: string;
    name: string;
  };
};

export type WithdrawCashInput = {
  monthId: string;
  amount: number;
  occurredAt: string;
  description?: string;
};

export type CashSummaryEvent = {
  id: string;
  type: "CASH_WITHDRAWAL" | "CASH_CARRYOVER_IN" | "EXPENSE";
  amount: number;
  occurredAt: string;
  description: string | null;
};

export type CashSummary = {
  monthId: string;
  cashBalance: number;
  events: CashSummaryEvent[];
};

export type CreateMonthlyIncomeInput = {
  monthId: string;
  sourceName: string;
  amount: number;
  receivedAt: string;
  notes?: string | null;
};

export type UpdateMonthlyIncomeInput = {
  monthId: string;
  incomeId: string;
  sourceName?: string;
  amount?: number;
  receivedAt?: string;
  notes?: string | null;
};

export type Month = {
  id: string;
  year: number;
  month: number;
  status: "ACTIVE" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  incomes: MonthlyIncome[];
  monthlyIncomeTotal: number;
  availableMoney: number;
  cashBalance: number;
  categories: MonthCategory[];
};

export type ClosurePendingSurplus = {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
  defaultPocketId: string | null;
  requiresPocketSelection: boolean;
};

export type ClosurePendingDeficit = {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
};

export type ClosureReview = {
  monthId: string;
  status: "ACTIVE" | "CLOSED";
  pendingSurpluses: ClosurePendingSurplus[];
  pendingDeficits: ClosurePendingDeficit[];
  availableMoney: number;
  availableMoneyBlocker: "SURPLUS" | "DEFICIT" | null;
  canClose: boolean;
};

export type ClosureActionInput = {
  monthId: string;
  type: "SURPLUS_TO_POCKET_ON_CLOSE" | "DEFICIT_COVER_FROM_SUBCATEGORY" | "DEFICIT_COVER_FROM_POCKET";
  sourceSubcategoryId?: string;
  targetSubcategoryId?: string;
  sourcePocketId?: string;
  targetPocketId?: string;
  amount?: number;
  description?: string;
};
