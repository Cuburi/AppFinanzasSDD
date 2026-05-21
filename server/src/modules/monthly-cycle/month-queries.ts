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
