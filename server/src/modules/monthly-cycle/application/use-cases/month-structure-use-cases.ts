import type { CreateMonthCategoryInput, CreateMonthSubcategoryInput, MonthView, UpdateMonthCategoryInput, UpdateMonthSubcategoryInput } from "../../dto/index.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { assertMonthCategory, assertMonthIsMutable, assertMonthSubcategory, hasAssociatedMonthMovements } from "../../shared/month-queries.js";
import { decimal } from "../../shared/money.js";
import { DomainError } from "../../shared/service-errors.js";
import { assertUniqueStructureName, nextSortOrder, normalizeStructureName } from "../../shared/structure-normalization.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const MONTH_STRUCTURE_USE_CASE_NAMES = ["createMonthCategory", "updateMonthCategory", "deleteMonthCategory", "createMonthSubcategory", "updateMonthSubcategory", "deleteMonthSubcategory"] as const;

export type MonthStructureUseCases = {
  createMonthCategory(input: CreateMonthCategoryInput): Promise<MonthView>;
  updateMonthCategory(input: UpdateMonthCategoryInput): Promise<MonthView>;
  deleteMonthCategory(monthId: string, categoryId: string): Promise<MonthView>;
  createMonthSubcategory(input: CreateMonthSubcategoryInput): Promise<MonthView>;
  updateMonthSubcategory(input: UpdateMonthSubcategoryInput): Promise<MonthView>;
  deleteMonthSubcategory(monthId: string, subcategoryId: string): Promise<MonthView>;
};

export const createMonthStructureUseCases = (ports: MonthlyCyclePorts): MonthStructureUseCases => ({
  async createMonthCategory(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await txPorts.months.findById(input.monthId);
      assertMonthIsMutable(existingMonth);

      const name = input.name.trim();
      assertUniqueStructureName(existingMonth.categories, name, "Category already exists in this month.");

      const templateCategories = input.addToTemplate ? await txPorts.templates.readCategories() : [];
      if (input.addToTemplate) assertUniqueStructureName(templateCategories, name, "Category already exists in the template.");

      const monthCategory = await txPorts.structure.createMonthCategory({ monthId: input.monthId, name, sortOrder: nextSortOrder(existingMonth.categories), templateCategoryId: null });

      if (input.addToTemplate) {
        const templateCategory = await txPorts.structure.createTemplateCategory({ name, sortOrder: nextSortOrder(templateCategories) });
        await txPorts.structure.linkMonthCategory(monthCategory.id, templateCategory.id);
      }

      return txPorts.months.findById(input.monthId);
    });

    return mapMonth(month);
  },

  async updateMonthCategory(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await txPorts.months.findById(input.monthId);
      assertMonthIsMutable(existingMonth);
      assertMonthCategory(existingMonth, input.categoryId);

      await txPorts.structure.updateMonthCategory({ categoryId: input.categoryId, name: input.name });

      return txPorts.months.findById(input.monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthCategory(monthId, categoryId) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await txPorts.months.findById(monthId);
      assertMonthIsMutable(existingMonth);
      const category = assertMonthCategory(existingMonth, categoryId);

      if (category.subcategories.length > 0) throw new DomainError(409, "Delete subcategories first before deleting this category.");

      await txPorts.structure.deleteMonthCategory(categoryId);

      return txPorts.months.findById(monthId);
    });

    return mapMonth(month);
  },

  async createMonthSubcategory(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await txPorts.months.findById(input.monthId);
      assertMonthIsMutable(existingMonth);
      const parentCategory = assertMonthCategory(existingMonth, input.categoryId);

      const name = input.name.trim();
      assertUniqueStructureName(parentCategory.subcategories, name, "Subcategory already exists in this month category.");

      if (input.defaultPocketId) await txPorts.pockets.ensurePocketIsActive(input.defaultPocketId, "Default pocket");

      const templateCategories = input.addToTemplate ? await txPorts.templates.readCategories() : [];
      const linkedTemplateCategory = parentCategory.templateCategoryId ? templateCategories.find((category) => category.id === parentCategory.templateCategoryId) : undefined;
      const matchingTemplateCategory = linkedTemplateCategory ? undefined : templateCategories.find((category) => normalizeStructureName(category.name) === normalizeStructureName(parentCategory.name));
      const resolvedTemplateCategory = linkedTemplateCategory ?? matchingTemplateCategory;

      if (input.addToTemplate && resolvedTemplateCategory) assertUniqueStructureName(resolvedTemplateCategory.subcategories, name, "Subcategory already exists in the template category.");

      const monthSubcategory = await txPorts.structure.createMonthSubcategory({
        categoryId: input.categoryId,
        name,
        plannedAmount: decimal(input.plannedAmount),
        defaultPocketId: input.defaultPocketId ?? null,
        templateSubcategoryId: null,
        sortOrder: nextSortOrder(parentCategory.subcategories),
      });

      if (input.addToTemplate) {
        const templateSubcategorySortOrder = resolvedTemplateCategory ? nextSortOrder(resolvedTemplateCategory.subcategories) : 0;
        const templateCategory = resolvedTemplateCategory ?? (await txPorts.structure.createTemplateCategory({ name: parentCategory.name, sortOrder: nextSortOrder(templateCategories) }));

        if (parentCategory.templateCategoryId !== templateCategory.id) await txPorts.structure.linkMonthCategory(parentCategory.id, templateCategory.id);

        const templateSubcategory = await txPorts.structure.createTemplateSubcategory({
          categoryId: templateCategory.id,
          name,
          plannedAmount: decimal(input.plannedAmount),
          defaultPocketId: input.defaultPocketId ?? null,
          sortOrder: templateSubcategorySortOrder,
        });

        await txPorts.structure.linkMonthSubcategory(monthSubcategory.id, templateSubcategory.id);
      }

      return txPorts.months.findById(input.monthId);
    });

    return mapMonth(month);
  },

  async updateMonthSubcategory(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await txPorts.months.findById(input.monthId);
      assertMonthIsMutable(existingMonth);
      assertMonthSubcategory(existingMonth, input.subcategoryId);

      if (input.defaultPocketId) await txPorts.pockets.ensurePocketIsActive(input.defaultPocketId, "Default pocket");

      await txPorts.structure.updateMonthSubcategory({
        subcategoryId: input.subcategoryId,
        name: input.name,
        plannedAmount: decimal(input.plannedAmount),
        ...(input.defaultPocketId !== undefined ? { defaultPocketId: input.defaultPocketId } : {}),
      });

      return txPorts.months.findById(input.monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthSubcategory(monthId, subcategoryId) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await txPorts.months.findById(monthId);
      assertMonthIsMutable(existingMonth);
      assertMonthSubcategory(existingMonth, subcategoryId);

      if (hasAssociatedMonthMovements(existingMonth, subcategoryId)) throw new DomainError(409, "Cannot delete subcategory with associated movements.");

      await txPorts.structure.deleteMonthSubcategory(subcategoryId);

      return txPorts.months.findById(monthId);
    });

    return mapMonth(month);
  },
});
