import type { CreateDebtInput, DebtDirection, DebtStatus, DebtView } from "../shared/types.js";

import { DomainError } from "./debt-errors.js";
import type { DebtPayment, NewDebtPayment } from "./debt-payment.js";

const COP_CURRENCY = "COP";

export type Debt = {
  id: string;
  direction: DebtDirection;
  counterpartyName: string;
  description: string | null;
  totalAmount: number;
  currency: string;
  originDate: Date;
  createdAt: Date;
  updatedAt: Date;
  payments: DebtPayment[];
};

export type NewDebt = {
  direction: DebtDirection;
  counterpartyName: string;
  description: string | null;
  totalAmount: number;
  currency: string;
  originDate: Date;
};

const assertPositiveAmount = (amount: number, message: string) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError(400, message);
  }
};

const normalizeCurrency = (currency?: string) => {
  const normalizedCurrency = currency ?? COP_CURRENCY;
  if (normalizedCurrency !== COP_CURRENCY) {
    throw new DomainError(400, "Debt currency must be COP.");
  }

  return normalizedCurrency;
};

const sortPayments = (payments: DebtPayment[]) =>
  [...payments].sort((left, right) => left.paidAt.getTime() - right.paidAt.getTime());

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const calculatePaidAmount = (debt: Debt) => roundMoney(sortPayments(debt.payments).reduce((sum, payment) => sum + payment.amount, 0));

export const calculateRemainingBalance = (debt: Debt, { clampOverpayment = false }: { clampOverpayment?: boolean } = {}) => {
  const remainingBalance = roundMoney(debt.totalAmount - calculatePaidAmount(debt));
  if (remainingBalance < 0) {
    if (clampOverpayment) {
      return 0;
    }

    throw new DomainError(409, "Debt payments exceed total debt amount.");
  }

  return remainingBalance;
};

export const getDebtStatus = (debt: Debt, options?: { clampOverpayment?: boolean }): DebtStatus =>
  calculateRemainingBalance(debt, options) === 0 ? "PAID" : "OPEN";

export const createDebt = (input: CreateDebtInput): NewDebt => {
  assertPositiveAmount(input.totalAmount, "Debt amount must be positive.");

  return {
    direction: input.direction,
    counterpartyName: input.counterpartyName,
    description: input.description ?? null,
    totalAmount: input.totalAmount,
    currency: normalizeCurrency(input.currency),
    originDate: input.originDate,
  };
};

export const rehydrateDebt = (debt: Debt): Debt => ({
  ...debt,
  currency: normalizeCurrency(debt.currency),
  payments: sortPayments(debt.payments).map((payment) => ({ ...payment, notes: payment.notes ?? null })),
});

export const assertPaymentCanBeRegistered = (debt: Debt, amount: number) => {
  assertPositiveAmount(amount, "Payment amount must be positive.");

  const remainingBalance = calculateRemainingBalance(debt);
  if (remainingBalance === 0) {
    throw new DomainError(409, "Debt is already paid.");
  }
  if (amount > remainingBalance) {
    throw new DomainError(409, "Payment exceeds remaining debt balance.");
  }
};

export const createDebtPayment = (payment: NewDebtPayment & { id: string }) => {
  assertPositiveAmount(payment.amount, "Payment amount must be positive.");

  return {
    id: payment.id,
    amount: payment.amount,
    paidAt: payment.paidAt,
    notes: payment.notes ?? null,
  };
};

export const toDebtView = (debt: Debt, options?: { clampOverpayment?: boolean }): DebtView => ({
  id: debt.id,
  direction: debt.direction,
  counterpartyName: debt.counterpartyName,
  description: debt.description,
  totalAmount: debt.totalAmount,
  currency: debt.currency,
  originDate: debt.originDate.toISOString(),
  remainingBalance: calculateRemainingBalance(debt, options),
  status: getDebtStatus(debt, options),
  payments: sortPayments(debt.payments).map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    paidAt: payment.paidAt.toISOString(),
    notes: payment.notes,
  })),
});

export const sortDebtsForList = (debts: Debt[]) =>
  [...debts].sort((left, right) => {
    const originDateDiff = right.originDate.getTime() - left.originDate.getTime();
    if (originDateDiff !== 0) {
      return originDateDiff;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
