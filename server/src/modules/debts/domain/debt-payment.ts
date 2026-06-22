export type DebtPayment = {
  id: string;
  amount: number;
  paidAt: Date;
  notes: string | null;
  createdAt?: Date;
};

export type NewDebtPayment = {
  amount: number;
  paidAt: Date;
  notes?: string | null;
};

export const createDebtPayment = ({ id, amount, paidAt, notes }: NewDebtPayment & { id: string }): DebtPayment => ({
  id,
  amount,
  paidAt,
  notes: notes ?? null,
});
