import type { CreateMonthlyIncomeInput, MonthView, UpdateMonthlyIncomeInput } from "../../dto/index.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { lockMutableMonthForMutation } from "../../shared/month-queries.js";
import { decimal } from "../../shared/money.js";
import { DomainError } from "../../shared/service-errors.js";
import type { MonthRecord, MonthlyIncomeRecord } from "../../shared/service-types.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

import { businessDateFromPrisma, businessDateToPrisma, isBusinessDateInMonth, parseBusinessDate } from "../../../../shared/business-date.js";

export const INCOME_USE_CASE_NAMES = ["createMonthlyIncome", "updateMonthlyIncome", "deleteMonthlyIncome"] as const;

export type IncomeUseCases = {
  createMonthlyIncome(input: CreateMonthlyIncomeInput): Promise<MonthView>;
  updateMonthlyIncome(input: UpdateMonthlyIncomeInput): Promise<MonthView>;
  deleteMonthlyIncome(monthId: string, incomeId: string): Promise<MonthView>;
};

const parseReceivedAt = (receivedAt: string) => {
  try {
    return businessDateToPrisma(parseBusinessDate(receivedAt, "La fecha de recepción del ingreso"));
  } catch (error) {
    throw new DomainError(400, (error as Error).message);
  }
};

const assertReceivedAtBelongsToMonth = (month: MonthRecord, receivedAt: Date) => {
  if (!isBusinessDateInMonth(businessDateFromPrisma(receivedAt), month)) {
    throw new DomainError(400, "La fecha de recepción del ingreso debe estar dentro del período del mes vinculado.");
  }
};

const assertIncomeBelongsToMonth = (income: MonthlyIncomeRecord | null, monthId: string): MonthlyIncomeRecord => {
  if (!income || income.monthId !== monthId) {
    throw new DomainError(404, "No se encontró el ingreso mensual en este mes.");
  }

  return income;
};

export const createIncomeUseCases = (ports: MonthlyCyclePorts): IncomeUseCases => ({
  async createMonthlyIncome(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);
      const receivedAt = parseReceivedAt(input.receivedAt);
      assertReceivedAtBelongsToMonth(existingMonth, receivedAt);

      await txPorts.incomes.create({
        monthId: input.monthId,
        sourceName: input.sourceName,
        amount: decimal(input.amount),
        receivedAt,
        notes: input.notes ?? null,
      });

      return txPorts.months.findById(input.monthId);
    });

    return mapMonth(month);
  },

  async updateMonthlyIncome(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);
      assertIncomeBelongsToMonth(await txPorts.incomes.findById(input.incomeId), input.monthId);

      const updateInput: Parameters<typeof txPorts.incomes.update>[0] = { incomeId: input.incomeId };

      if (input.sourceName !== undefined) updateInput.sourceName = input.sourceName;
      if (input.amount !== undefined) updateInput.amount = decimal(input.amount);
      if (input.receivedAt !== undefined) {
        const receivedAt = parseReceivedAt(input.receivedAt);
        assertReceivedAtBelongsToMonth(existingMonth, receivedAt);
        updateInput.receivedAt = receivedAt;
      }
      if (input.notes !== undefined) updateInput.notes = input.notes;

      await txPorts.incomes.update(updateInput);

      return txPorts.months.findById(input.monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthlyIncome(monthId, incomeId) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId);
      assertIncomeBelongsToMonth(await txPorts.incomes.findById(incomeId), monthId);

      await txPorts.incomes.delete(incomeId);

      return txPorts.months.findById(monthId);
    });

    return mapMonth(month);
  },
});
