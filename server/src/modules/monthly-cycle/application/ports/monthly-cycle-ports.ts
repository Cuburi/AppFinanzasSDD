import type { ExpenseHistoryQueryInput, TemplateInput } from "../../dto/index.js";
import type { MonthRecord, MonthlyIncomeRecord, TemplateCategoryRecord } from "../../shared/service-types.js";
import type { MonthStatus as MonthlyCycleMonthStatus, MovementType as MonthlyCycleMovementType, PaymentMethod as MonthlyCyclePaymentMethod } from "../monthly-cycle-types.js";

export * from "../monthly-cycle-types.js";

export type MonthlyCycleMoney = { toString(): string };

export const MONTHLY_CYCLE_PORT_NAMES = [
  "months",
  "templates",
  "movements",
  "incomes",
  "structure",
  "pockets",
  "transactionRunner",
] as const;

export type MonthlyCyclePortName = (typeof MONTHLY_CYCLE_PORT_NAMES)[number];

export type ActiveMonthSummary = { id: string; year: number; month: number };

export interface MonthRepositoryPort {
  findActive(): Promise<MonthRecord | null>;
  findActiveSummary(status: MonthlyCycleMonthStatus): Promise<ActiveMonthSummary | null>;
  findById(monthId: string): Promise<MonthRecord>;
  findByYearMonth(year: number, month: number): Promise<{ id: string } | null>;
  findPriorClosedBefore(year: number, month: number): Promise<MonthRecord | null>;
  createFromTemplate(input: {
    year: number;
    month: number;
    status: MonthlyCycleMonthStatus;
    template: TemplateCategoryRecord[];
  }): Promise<MonthRecord>;
  close(monthId: string): Promise<MonthRecord>;
}

export interface TemplateRepositoryPort {
  readCategories(): Promise<TemplateCategoryRecord[]>;
  replaceCategories(input: TemplateInput): Promise<void>;
}

export type MovementRecord = MonthRecord["movements"][number];

export interface MovementRepositoryPort {
  findById(movementId: string): Promise<MovementRecord | null>;
  create(args: {
    type: MonthlyCycleMovementType;
    amount: MonthlyCycleMoney;
    description?: string | null;
    occurredAt?: Date;
    paymentMethod?: MonthlyCyclePaymentMethod | null;
    monthId?: string | null;
    sourceSubcategoryId?: string | null;
    targetSubcategoryId?: string | null;
    sourcePocketId?: string | null;
    targetPocketId?: string | null;
    externalSourceLabel?: string | null;
  }): Promise<void>;
  updateExpense(input: {
    expenseId: string;
    amount: MonthlyCycleMoney;
    description?: string | null;
    occurredAt: Date;
    paymentMethod: MonthlyCyclePaymentMethod;
    sourceSubcategoryId: string;
  }): Promise<void>;
  delete(movementId: string): Promise<void>;
  findExpenseHistory(input: ExpenseHistoryQueryInput): Promise<MovementRecord[]>;
  findCashLedgerEvents(monthId: string): Promise<MovementRecord[]>;
}

export interface IncomeRepositoryPort {
  findById(incomeId: string): Promise<MonthlyIncomeRecord | null>;
  create(input: { monthId: string; sourceName: string; amount: MonthlyCycleMoney; receivedAt: Date; notes: string | null }): Promise<void>;
  update(input: { incomeId: string; sourceName?: string; amount?: MonthlyCycleMoney; receivedAt?: Date; notes?: string | null }): Promise<void>;
  delete(incomeId: string): Promise<void>;
}

export interface MonthStructureRepositoryPort {
  createMonthCategory(input: { monthId: string; name: string; sortOrder: number; templateCategoryId: string | null }): Promise<{ id: string }>;
  updateMonthCategory(input: { categoryId: string; name: string }): Promise<void>;
  linkMonthCategory(categoryId: string, templateCategoryId: string): Promise<void>;
  deleteMonthCategory(categoryId: string): Promise<void>;
  createMonthSubcategory(input: {
    categoryId: string;
    name: string;
    plannedAmount: MonthlyCycleMoney;
    defaultPocketId: string | null;
    templateSubcategoryId: string | null;
    sortOrder: number;
  }): Promise<{ id: string }>;
  updateMonthSubcategory(input: { subcategoryId: string; name: string; plannedAmount: MonthlyCycleMoney; defaultPocketId?: string | null }): Promise<void>;
  linkMonthSubcategory(subcategoryId: string, templateSubcategoryId: string): Promise<void>;
  deleteMonthSubcategory(subcategoryId: string): Promise<void>;
  createTemplateCategory(input: { name: string; sortOrder: number }): Promise<{ id: string }>;
  createTemplateSubcategory(input: { categoryId: string; name: string; plannedAmount: MonthlyCycleMoney; defaultPocketId: string | null; sortOrder: number }): Promise<{ id: string }>;
}

export interface PocketValidationPort {
  ensurePocketIsActive(pocketId: string, label: string): Promise<void>;
  ensureTemplateDefaultPocketsAreActive(input: TemplateInput): Promise<void>;
}

export type MonthlyCyclePorts = {
  months: MonthRepositoryPort;
  templates: TemplateRepositoryPort;
  movements: MovementRepositoryPort;
  incomes: IncomeRepositoryPort;
  structure: MonthStructureRepositoryPort;
  pockets: PocketValidationPort;
  transactionRunner: MonthlyCycleTransactionRunner;
};

export interface MonthlyCycleTransactionRunner {
  run<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>): Promise<T>;
}
