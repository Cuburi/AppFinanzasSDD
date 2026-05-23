import type { DebtView } from "../shared/types.js";

export type DebtPaymentApiView = {
  id: string;
  amount: number;
  paidAt: string;
  notes: string | null;
};

export type DebtApiView = {
  id: string;
  direction: DebtView["direction"];
  counterpartyName: string;
  description: string | null;
  totalAmount: number;
  currency: string;
  originDate: string;
  remainingBalance: number;
  status: DebtView["status"];
  payments: DebtPaymentApiView[];
};

export const toDebtApiView = (debt: DebtView): DebtApiView => ({
  id: debt.id,
  direction: debt.direction,
  counterpartyName: debt.counterpartyName,
  description: debt.description,
  totalAmount: debt.totalAmount,
  currency: debt.currency,
  originDate: debt.originDate,
  remainingBalance: debt.remainingBalance,
  status: debt.status,
  payments: debt.payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    paidAt: payment.paidAt,
    notes: payment.notes,
  })),
});

export const toDebtListApiResponse = (debts: DebtView[]) => ({ debts: debts.map(toDebtApiView) });
