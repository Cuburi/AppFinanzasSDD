import { readNonEmptyString, readOptionalString, toNumber } from "./shared-parsers.js";

export type TemplateSubcategoryInput = {
  id?: string;
  name: string;
  plannedAmount: number;
  defaultPocketId?: string | null;
};

export type TemplateCategoryInput = {
  id?: string;
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
    throw new Error("Los datos de la plantilla deben incluir categorías.");
  }

  const categories = (payload as { categories: unknown[] }).categories.map((category, categoryIndex) => {
    if (!category || typeof category !== "object" || !Array.isArray((category as { subcategories?: unknown }).subcategories)) {
      throw new Error(`La categoría ${categoryIndex + 1} debe incluir subcategorías.`);
    }

    const rawCategory = category as { id?: unknown; name?: unknown; subcategories: unknown[] };

    return {
      ...(rawCategory.id !== undefined ? { id: readNonEmptyString(rawCategory.id, `Identificador de la categoría ${categoryIndex + 1}`) } : {}),
      name: readNonEmptyString(rawCategory.name, `Nombre de la categoría ${categoryIndex + 1}`),
      subcategories: rawCategory.subcategories.map((subcategory, subcategoryIndex) => {
        if (!subcategory || typeof subcategory !== "object") {
          throw new Error(`La subcategoría ${categoryIndex + 1}.${subcategoryIndex + 1} no es válida.`);
        }

        const rawSubcategory = subcategory as {
          id?: unknown;
          name?: unknown;
          plannedAmount?: unknown;
          defaultPocketId?: unknown;
        };

        const plannedAmount = toNumber(rawSubcategory.plannedAmount);

        if (plannedAmount < 0) {
          throw new Error(`El campo plannedAmount de la subcategoría ${categoryIndex + 1}.${subcategoryIndex + 1} debe ser mayor o igual a cero.`);
        }

        return {
          ...(rawSubcategory.id !== undefined ? { id: readNonEmptyString(rawSubcategory.id, `Identificador de la subcategoría ${categoryIndex + 1}.${subcategoryIndex + 1}`) } : {}),
          name: readNonEmptyString(rawSubcategory.name, `Nombre de la subcategoría ${categoryIndex + 1}.${subcategoryIndex + 1}`),
          plannedAmount,
          defaultPocketId: readOptionalDefaultPocketId(rawSubcategory.defaultPocketId),
        };
      }),
    };
  });

  return { categories };
};
