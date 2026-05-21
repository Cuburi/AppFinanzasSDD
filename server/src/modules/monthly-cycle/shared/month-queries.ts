import { MonthStatus } from "../../../lib/prisma-client.js";

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
