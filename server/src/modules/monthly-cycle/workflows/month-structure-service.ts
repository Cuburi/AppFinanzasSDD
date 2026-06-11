import type { CreateMonthCategoryInput, CreateMonthSubcategoryInput, MonthView, UpdateMonthCategoryInput, UpdateMonthSubcategoryInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { decimal } from "../shared/money.js";
import {
  assertMonthCategory,
  assertMonthIsMutable,
  assertMonthSubcategory,
  assertPocketIsActive,
  hasAssociatedMonthMovements,
  readMonthById,
  readTemplateCategories,
} from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MonthlyCycleDb } from "../shared/service-types.js";
import { assertUniqueStructureName, nextSortOrder, normalizeStructureName } from "../shared/structure-normalization.js";

export const createMonthStructureService = (db: MonthlyCycleDb) => ({
  async createMonthCategory(input: CreateMonthCategoryInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);

      const name = input.name.trim();
      assertUniqueStructureName(existingMonth.categories, name, "Category already exists in this month.");

      const templateCategories = input.addToTemplate ? await readTemplateCategories(tx) : [];
      if (input.addToTemplate) {
        assertUniqueStructureName(templateCategories, name, "Category already exists in the template.");
      }

      const monthCategory = await tx.monthCategory.create({
        data: {
          monthId: input.monthId,
          name,
          sortOrder: nextSortOrder(existingMonth.categories),
          templateCategoryId: null,
        },
      });

      if (input.addToTemplate) {
        const templateCategory = await tx.templateCategory.create({
          data: {
            name,
            sortOrder: nextSortOrder(templateCategories),
            subcategories: { create: [] },
          },
        });
        await tx.monthCategory.update({
          where: { id: monthCategory.id },
          data: { templateCategoryId: templateCategory.id },
        });
      }

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async createMonthSubcategory(input: CreateMonthSubcategoryInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      const parentCategory = assertMonthCategory(existingMonth, input.categoryId);

      const name = input.name.trim();
      assertUniqueStructureName(parentCategory.subcategories, name, "Subcategory already exists in this month category.");

      if (input.defaultPocketId) {
        await assertPocketIsActive(tx, input.defaultPocketId, "Default pocket");
      }

      const templateCategories = input.addToTemplate ? await readTemplateCategories(tx) : [];
      const linkedTemplateCategory = parentCategory.templateCategoryId
        ? templateCategories.find((category) => category.id === parentCategory.templateCategoryId)
        : undefined;
      const matchingTemplateCategory = linkedTemplateCategory
        ? undefined
        : templateCategories.find((category) => normalizeStructureName(category.name) === normalizeStructureName(parentCategory.name));
      const resolvedTemplateCategory = linkedTemplateCategory ?? matchingTemplateCategory;

      if (input.addToTemplate && resolvedTemplateCategory) {
        assertUniqueStructureName(resolvedTemplateCategory.subcategories, name, "Subcategory already exists in the template category.");
      }

      const monthSubcategory = await tx.monthSubcategory.create({
        data: {
          monthCategoryId: input.categoryId,
          name,
          plannedAmount: decimal(input.plannedAmount),
          defaultPocketId: input.defaultPocketId ?? null,
          templateSubcategoryId: null,
          sortOrder: nextSortOrder(parentCategory.subcategories),
        },
      });

      if (input.addToTemplate) {
        const templateSubcategorySortOrder = resolvedTemplateCategory ? nextSortOrder(resolvedTemplateCategory.subcategories) : 0;
        const templateCategory =
          resolvedTemplateCategory ??
          (await tx.templateCategory.create({
            data: {
              name: parentCategory.name,
              sortOrder: nextSortOrder(templateCategories),
              subcategories: { create: [] },
            },
          }));

        if (parentCategory.templateCategoryId !== templateCategory.id) {
          await tx.monthCategory.update({
            where: { id: parentCategory.id },
            data: { templateCategoryId: templateCategory.id },
          });
        }

        const templateSubcategory = await tx.templateSubcategory.create({
          data: {
            categoryId: templateCategory.id,
            name,
            plannedAmount: decimal(input.plannedAmount),
            defaultPocketId: input.defaultPocketId ?? null,
            sortOrder: templateSubcategorySortOrder,
          },
        });

        await tx.monthSubcategory.update({
          where: { id: monthSubcategory.id },
          data: { templateSubcategoryId: templateSubcategory.id },
        });
      }

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async updateMonthCategory(input: UpdateMonthCategoryInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      assertMonthCategory(existingMonth, input.categoryId);

      await tx.monthCategory.update({
        where: { id: input.categoryId },
        data: { name: input.name },
      });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async updateMonthSubcategory(input: UpdateMonthSubcategoryInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      assertMonthSubcategory(existingMonth, input.subcategoryId);

      if (input.defaultPocketId) {
        await assertPocketIsActive(tx, input.defaultPocketId, "Default pocket");
      }

      await tx.monthSubcategory.update({
        where: { id: input.subcategoryId },
        data: {
          name: input.name,
          plannedAmount: decimal(input.plannedAmount),
          ...(input.defaultPocketId !== undefined ? { defaultPocketId: input.defaultPocketId } : {}),
        },
      });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthSubcategory(monthId: string, subcategoryId: string): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, monthId);
      assertMonthIsMutable(existingMonth);
      assertMonthSubcategory(existingMonth, subcategoryId);

      if (hasAssociatedMonthMovements(existingMonth, subcategoryId)) {
        throw new DomainError(409, "Cannot delete subcategory with associated movements.");
      }

      await tx.monthSubcategory.delete({ where: { id: subcategoryId } });

      return readMonthById(tx, monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthCategory(monthId: string, categoryId: string): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, monthId);
      assertMonthIsMutable(existingMonth);
      const category = assertMonthCategory(existingMonth, categoryId);

      if (category.subcategories.length > 0) {
        throw new DomainError(409, "Delete subcategories first before deleting this category.");
      }

      await tx.monthCategory.delete({ where: { id: categoryId } });

      return readMonthById(tx, monthId);
    });

    return mapMonth(month);
  },
});
