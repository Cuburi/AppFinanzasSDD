import { PaymentMethod } from "../../../lib/prisma-client.js";

import type { CashSummaryView, ExpenseHistoryView, MonthView, TemplateView } from "../dto/index.js";
import { calculateMonthBalances } from "../balance-calculator.js";
import { calculateCashBalance } from "../shared/cash-ledger.js";
import { decimalToNumber } from "../shared/money.js";
import type { MonthRecord, TemplateCategoryRecord } from "../shared/service-types.js";

export const mapTemplate = (categories: TemplateCategoryRecord[]): TemplateView => ({
  categories: categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    subcategories: category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      plannedAmount: decimalToNumber(subcategory.plannedAmount),
      defaultPocketId: subcategory.defaultPocketId,
      active: subcategory.active,
      sortOrder: subcategory.sortOrder,
    })),
  })),
});

export const mapMonth = (month: MonthRecord): MonthView => {
  const balances = calculateMonthBalances(month);
  const incomes = month.incomes ?? [];

  return {
    id: month.id,
    year: month.year,
    month: month.month,
    status: month.status,
    openedAt: month.openedAt.toISOString(),
    closedAt: month.closedAt ? month.closedAt.toISOString() : null,
    incomes: incomes.map((income) => ({
      id: income.id,
      monthId: income.monthId,
      sourceName: income.sourceName,
      amount: decimalToNumber(income.amount),
      receivedAt: income.receivedAt.toISOString(),
      notes: income.notes,
      createdAt: income.createdAt.toISOString(),
      updatedAt: income.updatedAt.toISOString(),
    })),
    monthlyIncomeTotal: balances.monthlyIncomeTotal,
    availableMoney: balances.availableMoney,
    cashBalance: calculateCashBalance(month.movements),
    categories: month.categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      templateCategoryId: category.templateCategoryId,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        plannedAmount: decimalToNumber(subcategory.plannedAmount),
        available: balances.subcategoryBalances.get(subcategory.id) ?? decimalToNumber(subcategory.plannedAmount),
        defaultPocketId: subcategory.defaultPocketId,
        templateSubcategoryId: subcategory.templateSubcategoryId,
        sortOrder: subcategory.sortOrder,
      })),
    })),
  };
};

type MovementHistoryRecord = MonthRecord["movements"][number];

const findSubcategoryContext = (month: MonthRecord, subcategoryId: string) => {
  for (const category of month.categories) {
    const subcategory = category.subcategories.find((candidate) => candidate.id === subcategoryId);
    if (subcategory) {
      return {
        category: { id: category.id, name: category.name },
        subcategory: { id: subcategory.id, name: subcategory.name },
      };
    }
  }

  return null;
};

export const mapExpenseHistory = (month: MonthRecord, movements: MovementHistoryRecord[]): ExpenseHistoryView => ({
  expenses: movements.map((movement) => {
    const sourceSubcategoryId = movement.sourceSubcategoryId ?? "";
    const context = findSubcategoryContext(month, sourceSubcategoryId);

    if (!context) {
      throw new Error("Expense source subcategory was not found in the month snapshot.");
    }

    return {
      id: movement.id ?? "",
      occurredAt: (movement.occurredAt ?? month.openedAt).toISOString(),
      paymentMethod: movement.paymentMethod ?? PaymentMethod.NON_CASH,
      amount: decimalToNumber(movement.amount),
      description: movement.description ?? null,
      category: context.category,
      subcategory: context.subcategory,
    };
  }),
});

export const mapCashSummary = (month: MonthRecord, movements: MovementHistoryRecord[]): CashSummaryView => ({
  monthId: month.id,
  cashBalance: calculateCashBalance(month.movements),
  events: movements.map((movement) => ({
    id: movement.id ?? "",
    type: movement.type,
    amount: decimalToNumber(movement.amount),
    occurredAt: (movement.occurredAt ?? month.openedAt).toISOString(),
    description: movement.description ?? null,
  })),
});
