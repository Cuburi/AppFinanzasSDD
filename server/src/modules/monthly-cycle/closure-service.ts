import { MonthStatus, MovementType } from "../../lib/prisma-client.js";

import type { ClosureActionInput, ClosureReviewView } from "./dto/index.js";
import { calculateMonthBalances } from "./balance-calculator.js";
import { decimal, decimalToNumber, isZero } from "./money.js";
import { assertMonthIsMutable, assertPocketIsActive, findMonthSubcategory, listMonthSubcategories, readMonthById } from "./month-queries.js";
import { DomainError } from "./service-errors.js";
import type { MonthRecord, MonthlyCycleDb } from "./service-types.js";

export const buildClosureReview = (month: MonthRecord): ClosureReviewView => {
  const balances = calculateMonthBalances(month);
  const pendingSurpluses = [];
  const pendingDeficits = [];

  for (const subcategory of listMonthSubcategories(month)) {
    const available = balances.subcategoryBalances.get(subcategory.id) ?? decimalToNumber(subcategory.plannedAmount);

    if (available > 0 && !isZero(available)) {
      pendingSurpluses.push({
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        amount: Number(available.toFixed(2)),
        defaultPocketId: subcategory.defaultPocketId,
        requiresPocketSelection: !subcategory.defaultPocketId,
      });
    }

    if (available < 0 && !isZero(available)) {
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
    availableMoney: balances.availableMoney,
    availableMoneyBlocker:
      balances.availableMoney > 0 && !isZero(balances.availableMoney)
        ? "SURPLUS"
        : balances.availableMoney < 0 && !isZero(balances.availableMoney)
          ? "DEFICIT"
          : null,
    canClose:
      month.status === MonthStatus.ACTIVE &&
      pendingSurpluses.length === 0 &&
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

export const createClosureService = (db: MonthlyCycleDb) => ({
  async getClosureReview(monthId: string): Promise<ClosureReviewView> {
    const month = await readMonthById(db, monthId);
    return buildClosureReview(month);
  },

  async applyClosureAction(input: ClosureActionInput): Promise<ClosureReviewView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);

      const balances = calculateMonthBalances(existingMonth);

      if (input.type === MovementType.SURPLUS_TO_POCKET_ON_CLOSE) {
        const sourceSubcategoryId = input.sourceSubcategoryId;

        if (!sourceSubcategoryId) {
          throw new DomainError(400, "Source subcategory is required for surplus transfer.");
        }

        const sourceSubcategory = findMonthSubcategory(existingMonth, sourceSubcategoryId);

        if (!sourceSubcategory) {
          throw new DomainError(400, "Source subcategory does not belong to this month.");
        }

        const pendingSurplus = balances.subcategoryBalances.get(sourceSubcategory.id) ?? decimalToNumber(sourceSubcategory.plannedAmount);

        if (pendingSurplus <= 0 || isZero(pendingSurplus)) {
          throw new DomainError(400, "Source subcategory does not have pending surplus.");
        }

        const targetPocketId = input.targetPocketId ?? sourceSubcategory.defaultPocketId;

        if (!targetPocketId) {
          throw new DomainError(400, "Target pocket is required because this subcategory has no default pocket.");
        }

        await assertPocketIsActive(tx, targetPocketId, "Target pocket");
        await tx.movement.create({
          data: {
            type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE,
            amount: decimal(readActionAmount(input.amount, pendingSurplus)),
            description: input.description,
            monthId: input.monthId,
            sourceSubcategoryId: sourceSubcategory.id,
            targetPocketId,
          },
        });
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

        await tx.movement.create({
          data: {
            type: MovementType.DEFICIT_COVER_FROM_SUBCATEGORY,
            amount: decimal(amount),
            description: input.description,
            monthId: input.monthId,
            sourceSubcategoryId: sourceSubcategory.id,
            targetSubcategoryId: targetSubcategory.id,
          },
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

        await assertPocketIsActive(tx, sourcePocketId, "Source pocket");
        await tx.movement.create({
          data: {
            type: MovementType.DEFICIT_COVER_FROM_POCKET,
            amount: decimal(readActionAmount(input.amount, Math.abs(targetAvailable))),
            description: input.description,
            monthId: input.monthId,
            sourcePocketId,
            targetSubcategoryId: targetSubcategory.id,
          },
        });
      }

      return readMonthById(tx, input.monthId);
    });

    return buildClosureReview(month);
  },
});
