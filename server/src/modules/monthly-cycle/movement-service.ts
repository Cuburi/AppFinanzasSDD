import { MovementType } from "../../lib/prisma-client.js";

import type { DepositToPocketInput, MonthView, RecordExpenseInput } from "./dto/index.js";
import { decimal } from "./money.js";
import { assertMonthIsMutable, assertPocketIsActive, findMonthSubcategory, readMonthById } from "./month-queries.js";
import { mapMonth } from "./monthly-cycle-mappers.js";
import { DomainError } from "./service-errors.js";
import type { MonthlyCycleDb } from "./service-types.js";

export const createMovementService = (db: MonthlyCycleDb) => ({
  async recordExpense(input: RecordExpenseInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);

      if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
        throw new DomainError(400, "Source subcategory does not belong to this month.");
      }

      await tx.movement.create({
        data: {
          type: MovementType.EXPENSE,
          amount: decimal(input.amount),
          description: input.description,
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
