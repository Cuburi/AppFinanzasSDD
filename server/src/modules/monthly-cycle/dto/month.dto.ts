import { toNumber } from "./shared-parsers.js";
import type { ClosureAllocationView } from "./closure.dto.js";
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
  openingBalance?: number;
  openingSourceMonthId?: string | null;
  closureAllocation?: ClosureAllocationView | null;
  cashBalance: number;
  categories: MonthCategoryView[];
};

export type OpenMonthInput = {
  year: number;
  month: number;
};

export const parseOpenMonthInput = (payload: unknown): OpenMonthInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos para abrir el mes.");
  }

  const rawPayload = payload as { year?: unknown; month?: unknown };
  const year = toNumber(rawPayload.year);
  const month = toNumber(rawPayload.month);

  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("El año debe ser un número entero válido de 4 dígitos.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("El mes debe ser un número entero entre 1 y 12.");
  }

  return { year, month };
};
