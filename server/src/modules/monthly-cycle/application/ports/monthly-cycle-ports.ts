import type { ExpenseHistoryQueryInput, TemplateInput } from "../../dto/index.js";
import type { MonthRecord, MonthlyIncomeRecord, TemplateCategoryRecord } from "../../shared/service-types.js";
import type { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";

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
  findActiveSummary(status: MonthStatus): Promise<ActiveMonthSummary | null>;
  findById(monthId: string): Promise<MonthRecord>;
  findByYearMonth(year: number, month: number): Promise<{ id: string } | null>;
  findPriorClosedBefore(year: number, month: number): Promise<MonthRecord | null>;
  createFromTemplate(input: {
    year: number;
    month: number;
    status: MonthStatus;
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
    type: MovementType;
    amount: Prisma.Decimal;
    description?: string | null;
    occurredAt?: Date;
    paymentMethod?: PaymentMethod | null;
    monthId?: string | null;
    sourceSubcategoryId?: string | null;
    targetSubcategoryId?: string | null;
    sourcePocketId?: string | null;
    targetPocketId?: string | null;
    externalSourceLabel?: string | null;
  }): Promise<void>;
  updateExpense(input: {
    expenseId: string;
    amount: Prisma.Decimal;
    description?: string | null;
    occurredAt: Date;
    paymentMethod: PaymentMethod;
    sourceSubcategoryId: string;
  }): Promise<void>;
  delete(movementId: string): Promise<void>;
  findExpenseHistory(input: ExpenseHistoryQueryInput): Promise<MovementRecord[]>;
  findCashLedgerEvents(monthId: string): Promise<MovementRecord[]>;
}

export interface IncomeRepositoryPort {
  findById(incomeId: string): Promise<MonthlyIncomeRecord | null>;
  create(input: { monthId: string; sourceName: string; amount: Prisma.Decimal; receivedAt: Date; notes: string | null }): Promise<void>;
  update(input: { incomeId: string; sourceName?: string; amount?: Prisma.Decimal; receivedAt?: Date; notes?: string | null }): Promise<void>;
  delete(incomeId: string): Promise<void>;
}

export interface MonthStructureRepositoryPort {}

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
