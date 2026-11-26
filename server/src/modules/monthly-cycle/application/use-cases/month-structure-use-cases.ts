import type { CreateMonthCategoryInput, CreateMonthSubcategoryInput, MonthView, UpdateMonthCategoryInput, UpdateMonthSubcategoryInput } from "../../dto/index.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { assertMonthCategory, assertMonthSubcategory, hasAssociatedMonthMovements, lockMutableMonthForMutation } from "../../shared/month-queries.js";
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
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);

      const name = input.name.trim();
      assertUniqueStructureName(existingMonth.categories, name, "La categoría ya existe en este mes.");

      const templateCategories = input.addToTemplate ? await txPorts.templates.readCategories() : [];
      if (input.addToTemplate) assertUniqueStructureName(templateCategories, name, "La categoría ya existe en la plantilla.");

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
    const run = input.updateTemplate ? ports.transactionRunner.runSerializable.bind(ports.transactionRunner) : ports.transactionRunner.run.bind(ports.transactionRunner);
    const month = await run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);
      const category = assertMonthCategory(existingMonth, input.categoryId);

      if (input.updateTemplate) {
        const template = await txPorts.templates.readCategories();
        const target = template.find((item) => item.id === category.templateCategoryId);
        if (!target) throw new DomainError(409, "La categoría vinculada de la plantilla no está disponible.");
        assertUniqueStructureName(template.filter((item) => item.id !== target.id), input.name, "La categoría ya existe en la plantilla.");
        await txPorts.structure.updateTemplateCategory({ categoryId: target.id, name: input.name });
      }

      await txPorts.structure.updateMonthCategory({ categoryId: input.categoryId, name: input.name });

      return txPorts.months.findById(input.monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthCategory(monthId, categoryId) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId);
      const category = assertMonthCategory(existingMonth, categoryId);

      if (category.subcategories.length > 0) throw new DomainError(409, "Elimine primero las subcategorías antes de eliminar esta categoría.");

      await txPorts.structure.deleteMonthCategory(categoryId);

      return txPorts.months.findById(monthId);
    });

    return mapMonth(month);
  },

  async createMonthSubcategory(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);
      const parentCategory = assertMonthCategory(existingMonth, input.categoryId);

      const name = input.name.trim();
      assertUniqueStructureName(parentCategory.subcategories, name, "La subcategoría ya existe en esta categoría del mes.");

      if (input.defaultPocketId) await txPorts.pockets.ensurePocketIsActive(input.defaultPocketId, "Bolsillo predeterminado");

      const templateCategories = input.addToTemplate ? await txPorts.templates.readCategories() : [];
      const linkedTemplateCategory = parentCategory.templateCategoryId ? templateCategories.find((category) => category.id === parentCategory.templateCategoryId) : undefined;
      const matchingTemplateCategory = linkedTemplateCategory ? undefined : templateCategories.find((category) => normalizeStructureName(category.name) === normalizeStructureName(parentCategory.name));
      const resolvedTemplateCategory = linkedTemplateCategory ?? matchingTemplateCategory;

      if (input.addToTemplate && resolvedTemplateCategory) assertUniqueStructureName(resolvedTemplateCategory.subcategories, name, "La subcategoría ya existe en la categoría de la plantilla.");

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
    const run = input.updateTemplate ? ports.transactionRunner.runSerializable.bind(ports.transactionRunner) : ports.transactionRunner.run.bind(ports.transactionRunner);
    const month = await run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);
      const subcategory = assertMonthSubcategory(existingMonth, input.subcategoryId);
      const defaultPocketId = input.defaultPocketId !== undefined ? input.defaultPocketId : subcategory.defaultPocketId;

      if (input.defaultPocketId) await txPorts.pockets.ensurePocketIsActive(input.defaultPocketId, "Bolsillo predeterminado");

      if (input.updateTemplate) {
        const parent = existingMonth.categories.find((category) => category.subcategories.some((item) => item.id === subcategory.id))!;
        const template = await txPorts.templates.readCategories();
        const targetParent = template.find((category) => category.id === parent.templateCategoryId);
        const target = targetParent?.subcategories.find((item) => item.id === subcategory.templateSubcategoryId);
        if (!target || !target.active) throw new DomainError(409, "La subcategoría vinculada de la plantilla no está disponible o pertenece a otra categoría.");
        assertUniqueStructureName(targetParent!.subcategories.filter((item) => item.id !== target.id), input.name, "La subcategoría ya existe en la categoría de la plantilla.");
        if (defaultPocketId && input.defaultPocketId === undefined) await txPorts.pockets.ensurePocketIsActive(defaultPocketId, "Bolsillo predeterminado");
        await txPorts.structure.updateTemplateSubcategory({
          subcategoryId: target.id,
          name: input.name,
          plannedAmount: decimal(input.plannedAmount),
          defaultPocketId,
        });
      }

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
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId);
      assertMonthSubcategory(existingMonth, subcategoryId);

      if (hasAssociatedMonthMovements(existingMonth, subcategoryId)) throw new DomainError(409, "No se puede eliminar una subcategoría con movimientos asociados.");

      await txPorts.structure.deleteMonthSubcategory(subcategoryId);

      return txPorts.months.findById(monthId);
    });

    return mapMonth(month);
  },
});
