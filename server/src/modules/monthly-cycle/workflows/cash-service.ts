<<<<<<< HEAD
import { MovementType, PaymentMethod } from "../../../lib/prisma-client.js";

import { calculateMonthBalances } from "../balance-calculator.js";
import type { CashSummaryView, MonthView, WithdrawCashInput } from "../dto/index.js";
import { mapCashSummary, mapMonth } from "../mappers/monthly-cycle-mappers.js";
=======
import { MovementType } from "../../../lib/prisma-client.js";

import { calculateMonthBalances } from "../balance-calculator.js";
import type { MonthView, WithdrawCashInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
>>>>>>> master
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
<<<<<<< HEAD

  async getCashSummary(monthId: string): Promise<CashSummaryView> {
    const month = await readMonthById(db, monthId);
    const events = await db.movement.findMany({
      where: { monthId, type: { in: [MovementType.CASH_WITHDRAWAL, MovementType.CASH_CARRYOVER_IN, MovementType.EXPENSE] } },
      orderBy: { occurredAt: "asc" },
    });

    const cashEvents = events.filter(
      (movement) =>
        movement.type === MovementType.CASH_WITHDRAWAL || movement.type === MovementType.CASH_CARRYOVER_IN || movement.paymentMethod === PaymentMethod.CASH,
    );

    return mapCashSummary(month, cashEvents);
  },
=======
>>>>>>> master
});
