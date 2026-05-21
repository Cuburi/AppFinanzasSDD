import { MonthStatus } from "../../../lib/prisma-client.js";

import type { ClosureReviewView, MonthView, OpenMonthInput, TemplateInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { decimalToNumber } from "../shared/money.js";
import { assertMonthIsMutable, assertTemplateDefaultPocketsAreActive, readMonthById, readTemplateCategories } from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import { monthInclude, type MonthRecord, type MonthlyCycleDb } from "../shared/service-types.js";

const assertTemplateHasSubcategories = (input: TemplateInput) => {
  const count = input.categories.reduce((total, category) => total + category.subcategories.length, 0);

  if (count === 0) {
    throw new DomainError(400, "Template must contain at least one subcategory before opening a month.");
  }
};

export const createMonthLifecycleService = (db: MonthlyCycleDb) => ({
  async openMonth(input: OpenMonthInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const activeMonth = await tx.month.findFirst({
        where: { status: MonthStatus.ACTIVE },
        select: { id: true, year: true, month: true },
      });

      if (activeMonth) {
        throw new DomainError(409, `There is already an active month (${activeMonth.year}-${String(activeMonth.month).padStart(2, "0")}).`);
      }

      const existingTargetMonth = await tx.month.findUnique({
        where: {
          year_month: {
            year: input.year,
            month: input.month,
          },
        },
        select: { id: true },
      });

      if (existingTargetMonth) {
        throw new DomainError(409, "That month already exists.");
      }

      const template = await readTemplateCategories(tx);
      const templateInput = {
        categories: template.map((category) => ({
          name: category.name,
          subcategories: category.subcategories.map((subcategory) => ({
            name: subcategory.name,
            plannedAmount: decimalToNumber(subcategory.plannedAmount),
            defaultPocketId: subcategory.defaultPocketId,
          })),
        })),
      };
      assertTemplateHasSubcategories(templateInput);
      await assertTemplateDefaultPocketsAreActive(tx, templateInput);

      return tx.month.create({
        data: {
          year: input.year,
          month: input.month,
          status: MonthStatus.ACTIVE,
          categories: {
            create: template.map((category, categoryIndex) => ({
              name: category.name,
              sortOrder: categoryIndex,
              templateCategoryId: category.id,
              subcategories: {
                create: category.subcategories.map((subcategory, subcategoryIndex) => ({
                  name: subcategory.name,
                  plannedAmount: subcategory.plannedAmount,
                  defaultPocketId: subcategory.defaultPocketId,
                  templateSubcategoryId: subcategory.id,
                  sortOrder: subcategoryIndex,
                })),
              },
            })),
          },
        },
        include: monthInclude,
      });
    });

    return mapMonth(month);
  },

  async getActiveMonth(): Promise<MonthView | null> {
    const month = await db.month.findFirst({
      where: { status: MonthStatus.ACTIVE },
      orderBy: { openedAt: "desc" },
      include: monthInclude,
    });

    if (!month) {
      return null;
    }

    return mapMonth(month as MonthRecord);
  },

  async closeMonth(monthId: string, buildClosureReview: (month: MonthRecord) => ClosureReviewView): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, monthId);
      assertMonthIsMutable(existingMonth);

      const review = buildClosureReview(existingMonth);

      if (!review.canClose) {
        throw new DomainError(409, "Month cannot be closed while pending subcategory balances or available money remain unresolved.");
      }

      return tx.month.update({
        where: { id: monthId },
        data: { status: MonthStatus.CLOSED, closedAt: new Date() },
        include: monthInclude,
      });
    });

    return mapMonth(month);
  },
});
