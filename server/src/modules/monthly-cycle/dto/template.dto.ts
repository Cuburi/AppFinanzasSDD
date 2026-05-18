import { readNonEmptyString, readOptionalString, toNumber } from "./shared-parsers.js";

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

const readOptionalDefaultPocketId = (value: unknown): string | null => readOptionalString(value);

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
          defaultPocketId: readOptionalDefaultPocketId(rawSubcategory.defaultPocketId),
        };
      }),
    };
  });

  return { categories };
};
