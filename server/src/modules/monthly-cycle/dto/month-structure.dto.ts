import { readNonEmptyString, toNumber } from "./shared-parsers.js";

const readBoolean = (value: unknown, label: string): boolean => {
  if (value === undefined) {
    throw new Error(`${label} is required.`);
  }

  if (typeof value !== "boolean") {
    throw new Error(`${label} must be true or false.`);
  }

  return value;
};

export type CreateMonthCategoryInput = {
  monthId: string;
  name: string;
  addToTemplate: boolean;
};

export type CreateMonthSubcategoryInput = {
  monthId: string;
  categoryId: string;
  name: string;
  plannedAmount: number;
  defaultPocketId?: string | null;
  addToTemplate: boolean;
};

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

export const parseCreateMonthCategoryInput = (monthId: string, payload: unknown): CreateMonthCategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Category payload is required.");
  }

  const rawPayload = payload as { name?: unknown; addToTemplate?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    name: readNonEmptyString(rawPayload.name, "Category name"),
    addToTemplate: readBoolean(rawPayload.addToTemplate, "addToTemplate"),
  };
};

export const parseCreateMonthSubcategoryInput = (
  monthId: string,
  categoryId: string,
  payload: unknown,
): CreateMonthSubcategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Subcategory payload is required.");
  }

  const rawPayload = payload as { name?: unknown; plannedAmount?: unknown; defaultPocketId?: unknown; addToTemplate?: unknown };
  const plannedAmount = toNumber(rawPayload.plannedAmount);

  if (plannedAmount < 0) {
    throw new Error("Planned amount must be zero or greater.");
  }

  const input: CreateMonthSubcategoryInput = {
    monthId: readNonEmptyString(monthId, "Month id"),
    categoryId: readNonEmptyString(categoryId, "Category id"),
    name: readNonEmptyString(rawPayload.name, "Subcategory name"),
    plannedAmount,
    addToTemplate: readBoolean(rawPayload.addToTemplate, "addToTemplate"),
  };

  if (rawPayload.defaultPocketId !== undefined) {
    input.defaultPocketId = rawPayload.defaultPocketId === null ? null : readNonEmptyString(rawPayload.defaultPocketId, "Default pocket");
  }

  return input;
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
