export type TemplateSubcategoryInput = {
  name: string;
  plannedAmount: number;
  defaultPocketId?: string | null;
};

export type TemplateCategoryInput = {
  name: string;
  subcategories: TemplateSubcategoryInput[];
};

export type TemplateInput = {
  categories: TemplateCategoryInput[];
};

export type TemplateSubcategoryView = {
  id: string;
  name: string;
  plannedAmount: number;
  defaultPocketId: string | null;
  active: boolean;
  sortOrder: number;
};

export type TemplateCategoryView = {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: TemplateSubcategoryView[];
};

export type TemplateView = {
  categories: TemplateCategoryView[];
};

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
  categories: MonthCategoryView[];
};

export type OpenMonthInput = {
  year: number;
  month: number;
};

export type RecordExpenseInput = {
  monthId: string;
  sourceSubcategoryId: string;
  amount: number;
  description?: string | null;
};

export type DepositToPocketInput = {
  monthId?: string | null;
  sourceSubcategoryId?: string | null;
  targetPocketId: string;
  amount: number;
  description?: string | null;
  externalSourceLabel?: string | null;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  throw new Error("Expected a valid number.");
};

const readNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
};

const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
};

const readPositiveAmount = (value: unknown, label: string): number => {
  const amount = toNumber(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return amount;
};

export const parseTemplateInput = (payload: unknown): TemplateInput => {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { categories?: unknown }).categories)) {
    throw new Error("Template payload must include categories.");
  }

  const categories = (payload as { categories: unknown[] }).categories.map((category, categoryIndex) => {
    if (!category || typeof category !== "object" || !Array.isArray((category as { subcategories?: unknown }).subcategories)) {
      throw new Error(`Category ${categoryIndex + 1} must include subcategories.`);
    }

    const rawCategory = category as { name?: unknown; subcategories: unknown[] };

    return {
      name: readNonEmptyString(rawCategory.name, `Category ${categoryIndex + 1} name`),
      subcategories: rawCategory.subcategories.map((subcategory, subcategoryIndex) => {
        if (!subcategory || typeof subcategory !== "object") {
          throw new Error(`Subcategory ${categoryIndex + 1}.${subcategoryIndex + 1} is invalid.`);
        }

        const rawSubcategory = subcategory as {
          name?: unknown;
          plannedAmount?: unknown;
          defaultPocketId?: unknown;
        };

        const plannedAmount = toNumber(rawSubcategory.plannedAmount);

        if (plannedAmount < 0) {
          throw new Error(`Subcategory ${categoryIndex + 1}.${subcategoryIndex + 1} plannedAmount must be zero or greater.`);
        }

        return {
          name: readNonEmptyString(rawSubcategory.name, `Subcategory ${categoryIndex + 1}.${subcategoryIndex + 1} name`),
          plannedAmount,
          defaultPocketId:
            typeof rawSubcategory.defaultPocketId === "string" && rawSubcategory.defaultPocketId.trim() !== ""
              ? rawSubcategory.defaultPocketId.trim()
              : null,
        };
      }),
    };
  });

  return { categories };
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

export const parseRecordExpenseInput = (monthId: string, payload: unknown): RecordExpenseInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expense payload is required.");
  }

  const rawPayload = payload as { sourceSubcategoryId?: unknown; amount?: unknown; description?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    sourceSubcategoryId: readNonEmptyString(rawPayload.sourceSubcategoryId, "Source subcategory"),
    amount: readPositiveAmount(rawPayload.amount, "Expense amount"),
    description: readOptionalString(rawPayload.description),
  };
};

export const parseDepositToPocketInput = (payload: unknown): DepositToPocketInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Pocket deposit payload is required.");
  }

  const rawPayload = payload as {
    monthId?: unknown;
    sourceSubcategoryId?: unknown;
    targetPocketId?: unknown;
    amount?: unknown;
    description?: unknown;
    externalSourceLabel?: unknown;
  };
  const sourceSubcategoryId = readOptionalString(rawPayload.sourceSubcategoryId);
  const monthId = readOptionalString(rawPayload.monthId);
  const externalSourceLabel = readOptionalString(rawPayload.externalSourceLabel);

  if (sourceSubcategoryId && !monthId) {
    throw new Error("Month id is required when depositing from a subcategory.");
  }

  if (!sourceSubcategoryId && !externalSourceLabel) {
    throw new Error("External source label is required for external pocket deposits.");
  }

  return {
    monthId,
    sourceSubcategoryId,
    targetPocketId: readNonEmptyString(rawPayload.targetPocketId, "Target pocket"),
    amount: readPositiveAmount(rawPayload.amount, "Deposit amount"),
    description: readOptionalString(rawPayload.description),
    externalSourceLabel,
  };
};
