import type { MonthView } from "./month.dto.js";
import { readNonEmptyString } from "./shared-parsers.js";

export type BasicReportInput = {
  monthId: string;
};

export type BasicReportSubcategoryView = {
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  amount: number;
};

export type BasicMonthlyReportView = {
  summary: {
    monthId: string;
    year: number;
    month: number;
    status: MonthView["status"];
    monthlyIncomeTotal: number;
    availableMoney: number;
    cashBalance: number;
    totalPlanned: number;
    totalSpentCash: number;
    totalSpentNonCash: number;
  };
  topSpendingSubcategories: BasicReportSubcategoryView[];
  surplusSubcategories: BasicReportSubcategoryView[];
  deficitSubcategories: BasicReportSubcategoryView[];
};

export const parseBasicReportInput = (monthId: unknown): BasicReportInput => ({
  monthId: readNonEmptyString(monthId, "Month id"),
});
