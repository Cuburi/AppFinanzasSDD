import { MovementType } from "../../../lib/prisma-client.js";

import { calculateMonthBalances } from "../balance-calculator.js";
import type { MonthView, WithdrawCashInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { assertOccurredAtWithinMonth } from "../shared/cash-ledger.js";
import { decimal } from "../shared/money.js";
import { assertMonthIsMutable, readMonthById } from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MonthlyCycleDb } from "../shared/service-types.js";

const assertDateInsideMonth = (occurredAt: Date, month: { year: number; month: number }) => {
  try {
    assertOccurredAtWithinMonth(occurredAt, month);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new DomainError(400, "Cash withdrawal date must be inside the linked month.");
    }

    throw error;
  }
};

export const createCashService = (db: MonthlyCycleDb) => ({
  async withdrawCash(input: WithdrawCashInput): Promise<{ month: MonthView }> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      const occurredAt = new Date(input.occurredAt);
      assertDateInsideMonth(occurredAt, existingMonth);

      const balances = calculateMonthBalances(existingMonth);
      if (balances.availableMoney < input.amount) {
        throw new DomainError(409, "Insufficient available money for this cash withdrawal.");
      }

      await tx.movement.create({
        data: {
          type: MovementType.CASH_WITHDRAWAL,
          amount: decimal(input.amount),
          description: input.description,
          occurredAt,
          monthId: input.monthId,
        },
      });

      return readMonthById(tx, input.monthId);
    });

    return { month: mapMonth(month) };
  },
});
