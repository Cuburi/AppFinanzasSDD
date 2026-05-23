import { toNumber } from "./shared-parsers.js";
import type { MonthlyIncomeView } from "./incomes.dto.js";

export type MonthSubcategoryView = {
  id: string;
  name: string;
  plannedAmount: number;
  available: number;
  defaultPocketId: string | null;
  templateSubcategoryId: string | null;
  sortOrder: number;
};

export type MonthCategoryView = {
  id: string;
  name: string;
  sortOrder: number;
  templateCategoryId: string | null;
  subcategories: MonthSubcategoryView[];
};

export type MonthView = {
  id: string;
  year: number;
  month: number;
  status: "ACTIVE" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  incomes: MonthlyIncomeView[];
  monthlyIncomeTotal: number;
  availableMoney: number;
  cashBalance: number;
  categories: MonthCategoryView[];
};

export type OpenMonthInput = {
  year: number;
  month: number;
};

export const parseOpenMonthInput = (payload: unknown): OpenMonthInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Open month payload is required.");
  }

  const rawPayload = payload as { year?: unknown; month?: unknown };
  const year = toNumber(rawPayload.year);
  const month = toNumber(rawPayload.month);

  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("Year must be a valid 4-digit integer.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be an integer between 1 and 12.");
  }

  return { year, month };
};
