import type { MonthView, TemplateView } from "../../dto/index.js";

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

export interface MonthRepositoryPort {
  findActive(): Promise<MonthView | null>;
  findById(monthId: string): Promise<MonthView | null>;
}

export interface TemplateRepositoryPort {
  findTemplate(): Promise<TemplateView>;
}

export interface MovementRepositoryPort {}

export interface IncomeRepositoryPort {}

export interface MonthStructureRepositoryPort {}

export interface PocketValidationPort {
  ensurePocketCanReceiveMovement(pocketId: string): Promise<void>;
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
