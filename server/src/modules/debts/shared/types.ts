export type DebtDirection = "I_OWE" | "OWED_TO_ME";
export type DebtStatus = "OPEN" | "PAID";

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
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    notes: string | null;
  }>;
};

export type CreateDebtInput = {
  direction: DebtDirection;
  counterpartyName: string;
  description?: string | null;
  totalAmount: number;
  currency?: string;
  originDate: Date;
};

export type RegisterDebtPaymentInput = {
  amount: number;
  paidAt: Date;
  notes?: string | null;
};
