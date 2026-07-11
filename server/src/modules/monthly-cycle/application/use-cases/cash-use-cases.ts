import type { CashSummaryView, MonthView, WithdrawCashInput } from "../../dto/index.js";
import { mapCashSummary, mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { assertOccurredAtWithinMonth } from "../../shared/cash-ledger.js";
import { assertMonthIsMutable } from "../../shared/month-queries.js";
import { decimal } from "../../shared/money.js";
import { DomainError } from "../../shared/service-errors.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import type { MonthRecord } from "../../shared/service-types.js";
import { MovementType, type MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const CASH_USE_CASE_NAMES = ["withdrawCash", "getCashSummary"] as const;

export type CashUseCases = {
  withdrawCash(input: WithdrawCashInput): Promise<{ month: MonthView }>;
  getCashSummary(monthId: string): Promise<CashSummaryView>;
};

const assertDateInsideMonth = (occurredAt: Date, month: Pick<MonthRecord, "year" | "month">) => {
  try {
    assertOccurredAtWithinMonth(occurredAt, month);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new DomainError(400, "Cash withdrawal date must be inside the linked month.");
    }

    throw error;
  }
};

export const createCashUseCases = (ports: MonthlyCyclePorts): CashUseCases => ({
  async withdrawCash(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await txPorts.months.findById(input.monthId);
      assertMonthIsMutable(existingMonth);
      const occurredAt = new Date(input.occurredAt);
      assertDateInsideMonth(occurredAt, existingMonth);

      const balances = calculateMonthBalances(existingMonth);
      if (balances.availableMoney < input.amount) {
        throw new DomainError(409, "Insufficient available money for this cash withdrawal.");
      }

      await txPorts.movements.create({
        type: MovementType.CASH_WITHDRAWAL,
        amount: decimal(input.amount),
        description: input.description,
        occurredAt,
        monthId: input.monthId,
      });

      return txPorts.months.findById(input.monthId);
    });

    return { month: mapMonth(month) };
  },

  async getCashSummary(monthId) {
    const month = await ports.months.findById(monthId);
    const events = await ports.movements.findCashLedgerEvents(monthId);

    return mapCashSummary(month, events);
  },
});
