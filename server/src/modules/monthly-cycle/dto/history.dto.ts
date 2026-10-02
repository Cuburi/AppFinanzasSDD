import type { MovementType, PaymentMethod } from "../application/monthly-cycle-types.js";

export type ExpenseHistoryItemView = {
  id: string;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  amount: number;
  description: string | null;
  creditCardId: string | null;
  category: { id: string; name: string } | null;
  subcategory: { id: string; name: string } | null;
};

export type ExpenseHistoryView = {
  expenses: ExpenseHistoryItemView[];
};

export type CashSummaryView = {
  monthId: string;
  cashBalance: number;
  events: Array<{
    id: string;
    type: MovementType;
    amount: number;
    occurredAt: string;
    description: string | null;
  }>;
};
