import type { CreateDebtInput, DebtView, RegisterDebtPaymentInput } from "../../shared/types.js";
import type { Debt, NewDebt } from "../../domain/debt.js";
import type { NewDebtPayment } from "../../domain/debt-payment.js";

export type { Debt, NewDebt } from "../../domain/debt.js";
export type { NewDebtPayment } from "../../domain/debt-payment.js";
export type { CreateDebtInput, DebtView, RegisterDebtPaymentInput } from "../../shared/types.js";

export interface DebtRepository {
  findAll(): Promise<Debt[]>;
  findById(id: string): Promise<Debt | null>;
  create(input: NewDebt): Promise<Debt>;
  addPayment(debtId: string, payment: NewDebtPayment): Promise<void>;
}
