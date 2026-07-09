import { MovementType, PaymentMethod } from "../application/monthly-cycle-types.js";

import type { DepositToPocketInput, MonthView, RecordExpenseInput, UpdateExpenseInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { assertOccurredAtWithinMonth, calculateCashBalance } from "../shared/cash-ledger.js";
import { decimal } from "../shared/money.js";
import { assertMonthIsMutable, findMonthSubcategory } from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MovementRecord } from "../application/ports/monthly-cycle-ports.js";
import { resolveMonthlyCyclePorts, type MonthlyCycleWorkflowDependencies } from "./workflow-dependencies.js";

const assertExpenseDateWithinMonth = (occurredAt: Date, month: Parameters<typeof assertOccurredAtWithinMonth>[1]) => {
  try {
    assertOccurredAtWithinMonth(occurredAt, month);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new DomainError(400, "Expense date must be inside the linked month.");
    }

    throw error;
  }
};

const assertExpenseBelongsToMonth = (
  movement: MovementRecord | null,
  monthId: string,
) => {
  if (!movement || movement.type !== MovementType.EXPENSE || movement.monthId !== monthId) {
    throw new DomainError(404, "Expense was not found in this month.");
  }

  return movement;
};

export const createMovementService = (dependencies: MonthlyCycleWorkflowDependencies) => {
  const ports = resolveMonthlyCyclePorts(dependencies);

  return {
    async recordExpense(input: RecordExpenseInput): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const existingMonth = await txPorts.months.findById(input.monthId);
        assertMonthIsMutable(existingMonth);

        if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
          throw new DomainError(404, "Subcategory was not found in this month.");
        }

        const occurredAt = new Date(input.occurredAt);
        assertExpenseDateWithinMonth(occurredAt, existingMonth);

        if (input.paymentMethod === PaymentMethod.CASH && calculateCashBalance(existingMonth.movements) < input.amount) {
          throw new DomainError(409, "Insufficient cash for this expense.");
        }

        await txPorts.movements.create({
          type: MovementType.EXPENSE,
          amount: decimal(input.amount),
          description: input.description,
          occurredAt,
          paymentMethod: input.paymentMethod,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
        });

        return txPorts.months.findById(input.monthId);
      });

      return mapMonth(month);
    },

    async updateExpense(input: UpdateExpenseInput): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const existingMonth = await txPorts.months.findById(input.monthId);
        assertMonthIsMutable(existingMonth);

        const existingExpense = assertExpenseBelongsToMonth(await txPorts.movements.findById(input.expenseId), input.monthId);

        if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
          throw new DomainError(404, "Subcategory was not found in this month.");
        }

        const occurredAt = new Date(input.occurredAt);
        assertExpenseDateWithinMonth(occurredAt, existingMonth);

        const movementsWithoutCurrentExpense = existingMonth.movements.filter((movement) => movement.id !== existingExpense.id);
        if (input.paymentMethod === PaymentMethod.CASH && calculateCashBalance(movementsWithoutCurrentExpense) < input.amount) {
          throw new DomainError(409, "Insufficient cash for this expense.");
        }

        await txPorts.movements.updateExpense({
          expenseId: input.expenseId,
          amount: decimal(input.amount),
          description: input.description,
          occurredAt,
          paymentMethod: input.paymentMethod,
          sourceSubcategoryId: input.sourceSubcategoryId,
        });

        return txPorts.months.findById(input.monthId);
      });

      return mapMonth(month);
    },

    async deleteExpense(monthId: string, expenseId: string): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const existingMonth = await txPorts.months.findById(monthId);
        assertMonthIsMutable(existingMonth);

        assertExpenseBelongsToMonth(await txPorts.movements.findById(expenseId), monthId);

        await txPorts.movements.delete(expenseId);

        return txPorts.months.findById(monthId);
      });

      return mapMonth(month);
    },

    async depositToPocket(input: DepositToPocketInput): Promise<MonthView | null> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        await txPorts.pockets.ensurePocketIsActive(input.targetPocketId, "Target pocket");

        const existingMonth = input.monthId ? await txPorts.months.findById(input.monthId) : null;

        if (existingMonth) {
          assertMonthIsMutable(existingMonth);
        }

        if (input.sourceSubcategoryId) {
          if (!existingMonth) {
            throw new DomainError(400, "Month id is required when depositing from a subcategory.");
          }

          if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
            throw new DomainError(400, "Source subcategory does not belong to this month.");
          }
        }

        await txPorts.movements.create({
          type: input.sourceSubcategoryId ? MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY : MovementType.POCKET_DEPOSIT_EXTERNAL,
          amount: decimal(input.amount),
          description: input.description,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
          targetPocketId: input.targetPocketId,
          externalSourceLabel: input.sourceSubcategoryId ? null : input.externalSourceLabel,
        });

        return input.monthId ? txPorts.months.findById(input.monthId) : null;
      });

      return month ? mapMonth(month) : null;
    },
  };
};
