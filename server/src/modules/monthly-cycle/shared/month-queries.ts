import { MonthStatus } from "../application/monthly-cycle-types.js";

import type { TemplateInput } from "../dto/index.js";
import { DomainError } from "./service-errors.js";
import { monthInclude, templateInclude, type MonthRecord, type MonthlyCycleDb } from "./service-types.js";

export const readMonthById = async (db: MonthlyCycleDb, monthId: string): Promise<MonthRecord> => {
  const month = await db.month.findUnique({
    where: { id: monthId },
    include: monthInclude,
  });

  if (!month) {
    throw new DomainError(404, "Month was not found.");
  }

  return month as MonthRecord;
};

export const readTemplateCategories = async (db: MonthlyCycleDb) =>
  db.templateCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: templateInclude,
  });

export const assertMonthIsMutable = (month: MonthRecord) => {
  if (month.status === MonthStatus.CLOSED) {
    throw new DomainError(409, "Closed months are immutable.");
  }
};

export const findMonthSubcategory = (month: MonthRecord, subcategoryId: string) =>
  month.categories.flatMap((category) => category.subcategories).find((subcategory) => subcategory.id === subcategoryId);

export const listMonthSubcategories = (month: MonthRecord) => month.categories.flatMap((category) => category.subcategories);

export const findMonthCategory = (month: MonthRecord, categoryId: string) =>
  month.categories.find((category) => category.id === categoryId);

export const assertMonthCategory = (month: MonthRecord, categoryId: string) => {
  const category = findMonthCategory(month, categoryId);

  if (!category) {
    throw new DomainError(404, "Category was not found in this month.");
  }

  return category;
};

export const assertMonthSubcategory = (month: MonthRecord, subcategoryId: string) => {
  const subcategory = findMonthSubcategory(month, subcategoryId);

  if (!subcategory) {
    throw new DomainError(404, "Subcategory was not found in this month.");
  }

  return subcategory;
};

export const hasAssociatedMonthMovements = (month: MonthRecord, subcategoryId: string) =>
  month.movements.some((movement) => movement.sourceSubcategoryId === subcategoryId || movement.targetSubcategoryId === subcategoryId);

export const assertPocketIsActive = async (db: MonthlyCycleDb, pocketId: string, label: string) => {
  const pocket = await db.savingsPocket.findUnique({
    where: { id: pocketId },
    select: { id: true, active: true },
  });

  if (!pocket || !pocket.active) {
    throw new DomainError(400, `${label} must exist and be active.`);
  }
};

export const assertTemplateDefaultPocketsAreActive = async (db: MonthlyCycleDb, input: TemplateInput) => {
  const defaultPocketIds = new Set(
    input.categories
      .flatMap((category) => category.subcategories)
      .map((subcategory) => subcategory.defaultPocketId)
      .filter((defaultPocketId): defaultPocketId is string => Boolean(defaultPocketId)),
  );

  for (const defaultPocketId of defaultPocketIds) {
    await assertPocketIsActive(db, defaultPocketId, "Default pocket");
  }
};
