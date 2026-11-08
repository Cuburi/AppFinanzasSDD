import { readNonEmptyString, toNumber } from "./shared-parsers.js";

const readBoolean = (value: unknown, label: string): boolean => {
  if (value === undefined) {
    throw new Error(`${label}: valor obligatorio.`);
  }

  if (typeof value !== "boolean") {
    throw new Error(`${label} debe ser true o false.`);
  }

  return value;
};

const rejectTemplateIds = (payload: object) => {
  if ("templateCategoryId" in payload || "templateSubcategoryId" in payload) {
    throw new Error("No se pueden proporcionar identificadores de la plantilla al editar el mes.");
  }
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
  updateTemplate?: boolean;
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
  updateTemplate?: boolean;
};

export type DeleteMonthSubcategoryInput = {
  monthId: string;
  subcategoryId: string;
};

export const parseCreateMonthCategoryInput = (monthId: string, payload: unknown): CreateMonthCategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos de la categoría.");
  }

  const rawPayload = payload as { name?: unknown; addToTemplate?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    name: readNonEmptyString(rawPayload.name, "Nombre de la categoría"),
    addToTemplate: readBoolean(rawPayload.addToTemplate, "addToTemplate"),
  };
};

export const parseCreateMonthSubcategoryInput = (
  monthId: string,
  categoryId: string,
  payload: unknown,
): CreateMonthSubcategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos de la subcategoría.");
  }

  const rawPayload = payload as { name?: unknown; plannedAmount?: unknown; defaultPocketId?: unknown; addToTemplate?: unknown };
  const plannedAmount = toNumber(rawPayload.plannedAmount);

  if (plannedAmount < 0) {
    throw new Error("El monto planeado debe ser mayor o igual a cero.");
  }

  const input: CreateMonthSubcategoryInput = {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    categoryId: readNonEmptyString(categoryId, "Identificador de la categoría"),
    name: readNonEmptyString(rawPayload.name, "Nombre de la subcategoría"),
    plannedAmount,
    addToTemplate: readBoolean(rawPayload.addToTemplate, "addToTemplate"),
  };

  if (rawPayload.defaultPocketId !== undefined) {
    input.defaultPocketId = rawPayload.defaultPocketId === null ? null : readNonEmptyString(rawPayload.defaultPocketId, "Bolsillo predeterminado");
  }

  return input;
};

export const parseUpdateMonthCategoryInput = (monthId: string, categoryId: string, payload: unknown): UpdateMonthCategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos de la categoría.");
  }

  const rawPayload = payload as { name?: unknown; updateTemplate?: unknown };
  rejectTemplateIds(payload);

  return {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    categoryId: readNonEmptyString(categoryId, "Identificador de la categoría"),
    name: readNonEmptyString(rawPayload.name, "Nombre de la categoría"),
    updateTemplate: rawPayload.updateTemplate === undefined ? false : readBoolean(rawPayload.updateTemplate, "updateTemplate"),
  };
};

export const parseDeleteMonthCategoryInput = (monthId: string, categoryId: string): DeleteMonthCategoryInput => ({
  monthId: readNonEmptyString(monthId, "Identificador del mes"),
  categoryId: readNonEmptyString(categoryId, "Identificador de la categoría"),
});

export const parseUpdateMonthSubcategoryInput = (
  monthId: string,
  subcategoryId: string,
  payload: unknown,
): UpdateMonthSubcategoryInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos de la subcategoría.");
  }

  const rawPayload = payload as { name?: unknown; plannedAmount?: unknown; defaultPocketId?: unknown; updateTemplate?: unknown };
  rejectTemplateIds(payload);
  const plannedAmount = toNumber(rawPayload.plannedAmount);

  if (plannedAmount < 0) {
    throw new Error("El monto planeado debe ser mayor o igual a cero.");
  }

  const input: UpdateMonthSubcategoryInput = {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    subcategoryId: readNonEmptyString(subcategoryId, "Identificador de la subcategoría"),
    name: readNonEmptyString(rawPayload.name, "Nombre de la subcategoría"),
    plannedAmount,
    updateTemplate: rawPayload.updateTemplate === undefined ? false : readBoolean(rawPayload.updateTemplate, "updateTemplate"),
  };

  if (rawPayload.defaultPocketId !== undefined) {
    input.defaultPocketId = rawPayload.defaultPocketId === null ? null : readNonEmptyString(rawPayload.defaultPocketId, "Bolsillo predeterminado");
  }

  return input;
};

export const parseDeleteMonthSubcategoryInput = (monthId: string, subcategoryId: string): DeleteMonthSubcategoryInput => ({
  monthId: readNonEmptyString(monthId, "Identificador del mes"),
  subcategoryId: readNonEmptyString(subcategoryId, "Identificador de la subcategoría"),
});
