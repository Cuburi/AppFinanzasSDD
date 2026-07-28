import type { ExpenseHistoryItem, MonthlyIncome } from "../../../../types";

export type ActivityRow = {
  amount: number;
  concept: string;
  date: string;
  id: string;
  metadata: string;
  record: ExpenseHistoryItem | MonthlyIncome;
  type: "expense" | "income";
};

export function buildActivityRows(expenses: ExpenseHistoryItem[], incomes: MonthlyIncome[]): ActivityRow[] {
  return [
    ...expenses.map((expense) => ({
      amount: -expense.amount,
      concept: expense.description || "Gasto sin descripción",
      date: expense.occurredAt,
      id: expense.id,
      metadata: `${expense.subcategory.name} · ${expense.category.name} · ${expense.paymentMethod === "CASH" ? "Efectivo" : "No efectivo"}`,
      record: expense,
      type: "expense" as const,
    })),
    ...incomes.map((income) => ({
      amount: income.amount,
      concept: income.sourceName,
      date: income.receivedAt,
      id: income.id,
      metadata: income.notes || "Sin notas",
      record: income,
      type: "income" as const,
    })),
  ].sort((left, right) => Date.parse(right.date) - Date.parse(left.date) || left.id.localeCompare(right.id));
}
