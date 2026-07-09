import type { MovementType, PaymentMethod } from "../application/monthly-cycle-types.js";

export type ExpenseHistoryItemView = {
  id: string;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  amount: number;
  description: string | null;
  category: { id: string; name: string };
  subcategory: { id: string; name: string };
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
