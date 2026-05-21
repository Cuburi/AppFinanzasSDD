import type { CreateMonthlyIncomeInput, MonthView, UpdateMonthlyIncomeInput } from "./dto/index.js";
import { decimal } from "./money.js";
import { assertMonthIsMutable, readMonthById } from "./month-queries.js";
import { mapMonth } from "./monthly-cycle-mappers.js";
import { DomainError } from "./service-errors.js";
import type { MonthRecord, MonthlyCycleDb, MonthlyIncomeRecord } from "./service-types.js";

const parseReceivedAt = (receivedAt: string) => {
  const date = new Date(receivedAt);

  if (Number.isNaN(date.getTime())) {
    throw new DomainError(400, "Income received date must be a valid ISO date.");
  }

  return date;
};

const assertReceivedAtBelongsToMonth = (month: MonthRecord, receivedAt: Date) => {
  const monthStart = new Date(Date.UTC(month.year, month.month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(month.year, month.month, 1));

  if (receivedAt < monthStart || receivedAt >= nextMonthStart) {
    throw new DomainError(400, "Income received date must be inside the linked month period.");
  }
};

const assertIncomeBelongsToMonth = (income: MonthlyIncomeRecord | null, monthId: string): MonthlyIncomeRecord => {
  if (!income || income.monthId !== monthId) {
    throw new DomainError(404, "Monthly income was not found for this month.");
  }

  return income;
};

export const createIncomeService = (db: MonthlyCycleDb) => ({
  async createMonthlyIncome(input: CreateMonthlyIncomeInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      const receivedAt = parseReceivedAt(input.receivedAt);
      assertReceivedAtBelongsToMonth(existingMonth, receivedAt);

      await tx.monthlyIncome.create({
        data: {
          monthId: input.monthId,
          sourceName: input.sourceName,
          amount: decimal(input.amount),
          receivedAt,
          notes: input.notes ?? null,
        },
      });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async updateMonthlyIncome(input: UpdateMonthlyIncomeInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      assertIncomeBelongsToMonth(await tx.monthlyIncome.findUnique({ where: { id: input.incomeId } }), input.monthId);

      const data: Parameters<MonthlyCycleDb["monthlyIncome"]["update"]>[0]["data"] = {};

      if (input.sourceName !== undefined) data.sourceName = input.sourceName;
      if (input.amount !== undefined) data.amount = decimal(input.amount);
      if (input.receivedAt !== undefined) {
        const receivedAt = parseReceivedAt(input.receivedAt);
        assertReceivedAtBelongsToMonth(existingMonth, receivedAt);
        data.receivedAt = receivedAt;
      }
      if (input.notes !== undefined) data.notes = input.notes;

      await tx.monthlyIncome.update({ where: { id: input.incomeId }, data });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthlyIncome(monthId: string, incomeId: string): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, monthId);
      assertMonthIsMutable(existingMonth);
      assertIncomeBelongsToMonth(await tx.monthlyIncome.findUnique({ where: { id: incomeId } }), monthId);

      await tx.monthlyIncome.delete({ where: { id: incomeId } });

      return readMonthById(tx, monthId);
    });

    return mapMonth(month);
  },
});
