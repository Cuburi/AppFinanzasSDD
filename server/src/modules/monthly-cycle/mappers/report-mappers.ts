import { MovementType, PaymentMethod } from "../application/monthly-cycle-types.js";

import type { BasicMonthlyReportView, BasicReportSubcategoryView } from "../dto/index.js";
import { calculateMonthBalances } from "../balance-calculator.js";
import { calculateCashBalance } from "../shared/cash-ledger.js";
import { decimalToNumber, roundMoney } from "../shared/money.js";
import type { MonthRecord } from "../shared/service-types.js";

type SubcategoryContext = {
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
};

const listSubcategoryContexts = (month: MonthRecord): SubcategoryContext[] =>
  month.categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      subcategoryId: subcategory.id,
      subcategoryName: subcategory.name,
      categoryId: category.id,
      categoryName: category.name,
    })),
  );

const compareReportAmountsDescending = (left: BasicReportSubcategoryView, right: BasicReportSubcategoryView) => right.amount - left.amount;

const compareReportAmountsAscending = (left: BasicReportSubcategoryView, right: BasicReportSubcategoryView) => left.amount - right.amount;

const buildSpendingBySubcategory = (month: MonthRecord, contexts: Map<string, SubcategoryContext>) => {
  const totals = new Map<string, number>();
  let totalSpentCash = 0;
  let totalSpentNonCash = 0;

  for (const movement of month.movements) {
    if (movement.type !== MovementType.EXPENSE || !movement.sourceSubcategoryId) continue;

    const amount = decimalToNumber(movement.amount);
    totals.set(movement.sourceSubcategoryId, roundMoney((totals.get(movement.sourceSubcategoryId) ?? 0) + amount));

    if (movement.paymentMethod === PaymentMethod.CASH) {
      totalSpentCash = roundMoney(totalSpentCash + amount);
    } else {
      totalSpentNonCash = roundMoney(totalSpentNonCash + amount);
    }
  }

  const topSpendingSubcategories = [...totals.entries()]
    .map(([subcategoryId, amount]) => {
      const context = contexts.get(subcategoryId);
      if (!context) return null;

      return { ...context, amount: roundMoney(amount) };
    })
    .filter((item): item is BasicReportSubcategoryView => Boolean(item))
    .sort(compareReportAmountsDescending);

  return { totalSpentCash, totalSpentNonCash, topSpendingSubcategories };
};

export const mapBasicReport = (month: MonthRecord): BasicMonthlyReportView => {
  const balances = calculateMonthBalances(month);
  const contexts = listSubcategoryContexts(month);
  const contextsById = new Map(contexts.map((context) => [context.subcategoryId, context]));
  const spending = buildSpendingBySubcategory(month, contextsById);
  const totalPlanned = roundMoney(
    month.categories.reduce(
      (categoryTotal, category) =>
        categoryTotal + category.subcategories.reduce((subcategoryTotal, subcategory) => subcategoryTotal + decimalToNumber(subcategory.plannedAmount), 0),
      0,
    ),
  );
  const balanceItems = contexts
    .map((context) => ({ ...context, amount: roundMoney(balances.subcategoryBalances.get(context.subcategoryId) ?? 0) }))
    .filter((item) => item.amount !== 0);

  return {
    summary: {
      monthId: month.id,
      year: month.year,
      month: month.month,
      status: month.status,
      monthlyIncomeTotal: balances.monthlyIncomeTotal,
      availableMoney: balances.availableMoney,
      cashBalance: calculateCashBalance(month.movements),
      totalPlanned,
      totalSpentCash: spending.totalSpentCash,
      totalSpentNonCash: spending.totalSpentNonCash,
    },
    topSpendingSubcategories: spending.topSpendingSubcategories,
    surplusSubcategories: balanceItems.filter((item) => item.amount > 0).sort(compareReportAmountsDescending),
    deficitSubcategories: balanceItems.filter((item) => item.amount < 0).sort(compareReportAmountsAscending),
  };
};
