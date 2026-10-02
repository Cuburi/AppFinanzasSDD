import type { ClosureActionInput, ClosureReviewView, MonthView } from "../../dto/index.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import { findMonthSubcategory, listMonthSubcategories, lockMutableMonthForMutation } from "../../shared/month-queries.js";
import { decimal, decimalToNumber, isZero } from "../../shared/money.js";
import { DomainError } from "../../shared/service-errors.js";
import type { MonthRecord } from "../../shared/service-types.js";
import { MonthStatus, MovementType, type MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const CLOSURE_USE_CASE_NAMES = ["getClosureReview", "applyClosureAction", "closeMonth"] as const;

export type ClosureUseCases = {
  getClosureReview(monthId: string): Promise<ClosureReviewView>;
  applyClosureAction(input: ClosureActionInput): Promise<ClosureReviewView>;
  closeMonth(monthId: string): Promise<MonthView>;
};

export const buildClosureReview = (month: MonthRecord): ClosureReviewView => {
  const balances = calculateMonthBalances(month);
  const pendingSurpluses = [];
  const pendingDeficits = [];
  const budgetVariances = [];

  for (const subcategory of listMonthSubcategories(month)) {
    const available = balances.subcategoryBalances.get(subcategory.id) ?? decimalToNumber(subcategory.plannedAmount);

    if (available > 0 && !isZero(available)) {
      budgetVariances.push({
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        amount: Number(available.toFixed(2)),
        kind: "SURPLUS" as const,
        informational: true as const,
      });
      pendingSurpluses.push({
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        amount: Number(available.toFixed(2)),
        defaultPocketId: subcategory.defaultPocketId,
        requiresPocketSelection: !subcategory.defaultPocketId,
      });
    }

    if (available < 0 && !isZero(available)) {
      budgetVariances.push({
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        amount: Number(Math.abs(available).toFixed(2)),
        kind: "DEFICIT" as const,
        informational: true as const,
      });
      pendingDeficits.push({
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        amount: Number(Math.abs(available).toFixed(2)),
      });
    }
  }

  return {
    monthId: month.id,
    status: month.status,
    pendingSurpluses,
    pendingDeficits,
    budgetVariances,
    availableMoney: balances.availableMoney,
    availableMoneyBlocker:
      balances.availableMoney > 0 && !isZero(balances.availableMoney)
        ? "SURPLUS"
        : balances.availableMoney < 0 && !isZero(balances.availableMoney)
          ? "DEFICIT"
          : null,
    canClose:
      month.status === MonthStatus.ACTIVE &&
       pendingDeficits.length === 0 &&
      isZero(balances.availableMoney),
  };
};

const readActionAmount = (requestedAmount: number | null | undefined, pendingAmount: number) => {
  const amount = requestedAmount ?? pendingAmount;

  if (amount <= 0) {
    throw new DomainError(400, "Closure action amount must be greater than zero.");
  }

  if (amount - pendingAmount > 0.005) {
    throw new DomainError(400, "Closure action amount cannot exceed the pending amount.");
  }

  return amount;
};

export const createClosureUseCases = (ports: MonthlyCyclePorts): ClosureUseCases => ({
  async getClosureReview(monthId) {
    const month = await ports.months.findById(monthId);
    return buildClosureReview(month);
  },

  async applyClosureAction(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);
      const balances = calculateMonthBalances(existingMonth);

      if (input.type === MovementType.SURPLUS_TO_POCKET_ON_CLOSE) {
        throw new DomainError(409, "Budget variance is informational and cannot be transferred.");
      }

      if (input.type === MovementType.DEFICIT_COVER_FROM_SUBCATEGORY) {
        const sourceSubcategoryId = input.sourceSubcategoryId;
        const targetSubcategoryId = input.targetSubcategoryId;

        if (!sourceSubcategoryId || !targetSubcategoryId) {
          throw new DomainError(400, "Source and target subcategories are required for deficit coverage.");
        }

        if (sourceSubcategoryId === targetSubcategoryId) {
          throw new DomainError(400, "Source and target subcategories must be different.");
        }

        const sourceSubcategory = findMonthSubcategory(existingMonth, sourceSubcategoryId);
        const targetSubcategory = findMonthSubcategory(existingMonth, targetSubcategoryId);

        if (!sourceSubcategory || !targetSubcategory) {
          throw new DomainError(400, "Source and target subcategories must belong to this month.");
        }

        const sourceAvailable = balances.subcategoryBalances.get(sourceSubcategory.id) ?? decimalToNumber(sourceSubcategory.plannedAmount);
        const targetAvailable = balances.subcategoryBalances.get(targetSubcategory.id) ?? decimalToNumber(targetSubcategory.plannedAmount);

        if (targetAvailable >= 0 || isZero(targetAvailable)) {
          throw new DomainError(400, "Target subcategory does not have a pending deficit.");
        }

        const amount = readActionAmount(input.amount, Math.abs(targetAvailable));

        if (sourceAvailable - amount < -0.005) {
          throw new DomainError(400, "Source subcategory does not have enough available balance.");
        }

        await txPorts.movements.create({
          type: MovementType.DEFICIT_COVER_FROM_SUBCATEGORY,
          amount: decimal(amount),
          description: input.description,
          monthId: input.monthId,
          sourceSubcategoryId: sourceSubcategory.id,
          targetSubcategoryId: targetSubcategory.id,
        });
      }

      if (input.type === MovementType.DEFICIT_COVER_FROM_POCKET) {
        const sourcePocketId = input.sourcePocketId;
        const targetSubcategoryId = input.targetSubcategoryId;

        if (!sourcePocketId || !targetSubcategoryId) {
          throw new DomainError(400, "Source pocket and target subcategory are required for deficit coverage.");
        }

        const targetSubcategory = findMonthSubcategory(existingMonth, targetSubcategoryId);

        if (!targetSubcategory) {
          throw new DomainError(400, "Target subcategory must belong to this month.");
        }

        const targetAvailable = balances.subcategoryBalances.get(targetSubcategory.id) ?? decimalToNumber(targetSubcategory.plannedAmount);

        if (targetAvailable >= 0 || isZero(targetAvailable)) {
          throw new DomainError(400, "Target subcategory does not have a pending deficit.");
        }

        await txPorts.pockets.ensurePocketIsActive(sourcePocketId, "Source pocket");
        await txPorts.movements.create({
          type: MovementType.DEFICIT_COVER_FROM_POCKET,
          amount: decimal(readActionAmount(input.amount, Math.abs(targetAvailable))),
          description: input.description,
          monthId: input.monthId,
          sourcePocketId,
          targetSubcategoryId: targetSubcategory.id,
        });
      }

      return txPorts.months.findById(input.monthId);
    });

    return buildClosureReview(month);
  },

  async closeMonth(monthId) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId);
      const review = buildClosureReview(existingMonth);

      if (!review.canClose) {
        throw new DomainError(409, "Month cannot be closed while pending subcategory balances or available money remain unresolved.");
      }

      return txPorts.months.close(monthId);
    });

    return mapMonth(month);
  },
});
