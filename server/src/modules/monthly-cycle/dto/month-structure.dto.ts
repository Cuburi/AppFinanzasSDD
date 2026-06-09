import { readNonEmptyString, toNumber } from "./shared-parsers.js";

export type UpdateMonthCategoryInput = {
  monthId: string;
  categoryId: string;
  name: string;
};

export type DeleteMonthCategoryInput = {
  monthId: string;
  categoryId: string;
};

export type UpdateMonthSubcategoryInput = {
  monthId: string;
  subcategoryId: string;
  name: string;
  plannedAmount: number;
  defaultPocketId?: string | null;
};

export type DeleteMonthSubcategoryInput = {
  monthId: string;
  subcategoryId: string;
};

export const parseUpdateMonthCategoryInput = (monthId: string, categoryId: string, payload: unknown): UpdateMonthCategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Category payload is required.");
  }

  const rawPayload = payload as { name?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    categoryId: readNonEmptyString(categoryId, "Category id"),
    name: readNonEmptyString(rawPayload.name, "Category name"),
  };
};

export const parseDeleteMonthCategoryInput = (monthId: string, categoryId: string): DeleteMonthCategoryInput => ({
  monthId: readNonEmptyString(monthId, "Month id"),
  categoryId: readNonEmptyString(categoryId, "Category id"),
});

export const parseUpdateMonthSubcategoryInput = (
  monthId: string,
  subcategoryId: string,
  payload: unknown,
): UpdateMonthSubcategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Subcategory payload is required.");
  }

  const rawPayload = payload as { name?: unknown; plannedAmount?: unknown; defaultPocketId?: unknown };
  const plannedAmount = toNumber(rawPayload.plannedAmount);

  if (plannedAmount < 0) {
    throw new Error("Planned amount must be zero or greater.");
  }

  const input: UpdateMonthSubcategoryInput = {
    monthId: readNonEmptyString(monthId, "Month id"),
    subcategoryId: readNonEmptyString(subcategoryId, "Subcategory id"),
    name: readNonEmptyString(rawPayload.name, "Subcategory name"),
    plannedAmount,
  };

  if (rawPayload.defaultPocketId !== undefined) {
    input.defaultPocketId = rawPayload.defaultPocketId === null ? null : readNonEmptyString(rawPayload.defaultPocketId, "Default pocket");
  }

  return input;
};

export const parseDeleteMonthSubcategoryInput = (monthId: string, subcategoryId: string): DeleteMonthSubcategoryInput => ({
  monthId: readNonEmptyString(monthId, "Month id"),
  subcategoryId: readNonEmptyString(subcategoryId, "Subcategory id"),
});
