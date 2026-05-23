import { MovementType, PaymentMethod } from "../../../lib/prisma-client.js";

import type { DepositToPocketInput, MonthView, RecordExpenseInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { assertOccurredAtWithinMonth, calculateCashBalance } from "../shared/cash-ledger.js";
import { decimal } from "../shared/money.js";
import { assertMonthIsMutable, assertPocketIsActive, findMonthSubcategory, readMonthById } from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MonthlyCycleDb } from "../shared/service-types.js";

export const createMovementService = (db: MonthlyCycleDb) => ({
  async recordExpense(input: RecordExpenseInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);

      if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
        throw new DomainError(404, "Subcategory was not found in this month.");
      }

      const occurredAt = new Date(input.occurredAt);
      try {
        assertOccurredAtWithinMonth(occurredAt, existingMonth);
      } catch (error) {
        if (error instanceof RangeError) {
          throw new DomainError(400, "Expense date must be inside the linked month.");
        }

        throw error;
      }

      if (input.paymentMethod === PaymentMethod.CASH && calculateCashBalance(existingMonth.movements) < input.amount) {
        throw new DomainError(409, "Insufficient cash for this expense.");
      }

      await tx.movement.create({
        data: {
          type: MovementType.EXPENSE,
          amount: decimal(input.amount),
          description: input.description,
          occurredAt,
          paymentMethod: input.paymentMethod,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
        },
      });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async depositToPocket(input: DepositToPocketInput): Promise<MonthView | null> {
    const month = await db.$transaction(async (tx) => {
      await assertPocketIsActive(tx, input.targetPocketId, "Target pocket");

      const existingMonth = input.monthId ? await readMonthById(tx, input.monthId) : null;

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

      await tx.movement.create({
        data: {
          type: input.sourceSubcategoryId ? MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY : MovementType.POCKET_DEPOSIT_EXTERNAL,
          amount: decimal(input.amount),
          description: input.description,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
          targetPocketId: input.targetPocketId,
          externalSourceLabel: input.sourceSubcategoryId ? null : input.externalSourceLabel,
        },
      });

      return input.monthId ? readMonthById(tx, input.monthId) : null;
    });

    return month ? mapMonth(month) : null;
  },
});
