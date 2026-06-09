import type { MonthView, UpdateMonthCategoryInput, UpdateMonthSubcategoryInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { decimal } from "../shared/money.js";
import {
  assertMonthCategory,
  assertMonthIsMutable,
  assertMonthSubcategory,
  assertPocketIsActive,
  hasAssociatedMonthMovements,
  readMonthById,
} from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MonthlyCycleDb } from "../shared/service-types.js";

export const createMonthStructureService = (db: MonthlyCycleDb) => ({
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
