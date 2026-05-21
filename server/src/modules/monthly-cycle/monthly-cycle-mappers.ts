import type { MonthView, TemplateView } from "./dto/index.js";
import { calculateMonthBalances } from "./balance-calculator.js";
import { decimalToNumber } from "./money.js";
import type { MonthRecord, TemplateCategoryRecord } from "./service-types.js";

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
