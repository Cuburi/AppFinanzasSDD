import { parseCloseMonthInput, type CloseMonthInput } from "../../dto/closure.dto.js";
import type { ClosureActionInput, ClosureReviewView, MonthView } from "../../dto/index.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import { findMonthSubcategory, listMonthSubcategories, lockMutableMonthForMutation } from "../../shared/month-queries.js";
import { decimal, decimalToNumber, isZero } from "../../shared/money.js";
import { DomainError } from "../../shared/service-errors.js";
import type { MonthRecord } from "../../shared/service-types.js";
import { MonthStatus, MovementType, type MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

import { businessDateToPrisma, todayInBogota } from "../../../../shared/business-date.js";

export const CLOSURE_USE_CASE_NAMES = ["getClosureReview", "applyClosureAction", "closeMonth", "getMonth", "getLatestClosedMonth"] as const;

export type ClosureUseCases = {
  getClosureReview(monthId: string): Promise<ClosureReviewView>;
  applyClosureAction(input: ClosureActionInput): Promise<ClosureReviewView>;
  closeMonth(monthId: string, allocation?: CloseMonthInput): Promise<MonthView>;
  getMonth(monthId: string): Promise<MonthView>;
  getLatestClosedMonth(): Promise<MonthView | null>;
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
    requiresDisposition: balances.availableMoney > 0 && !isZero(balances.availableMoney),
    closureAllocation: mapMonth(month).closureAllocation ?? null,
    canClose:
      month.status === MonthStatus.ACTIVE &&
       pendingDeficits.length === 0 &&
      isZero(balances.availableMoney),
  };
};

const readActionAmount = (requestedAmount: number | null | undefined, pendingAmount: number) => {
  const amount = requestedAmount ?? pendingAmount;

  if (amount <= 0) {
    throw new DomainError(400, "Monto de la acción de cierre debe ser mayor que cero.");
  }

  if (amount - pendingAmount > 0.005) {
    throw new DomainError(400, "El monto de la acción de cierre no puede superar el monto pendiente.");
  }

  return amount;
};

export const createClosureUseCases = (ports: MonthlyCyclePorts, today: () => string = todayInBogota): ClosureUseCases => ({
  async getMonth(monthId) {
    return mapMonth(await ports.months.findById(monthId));
  },
  async getLatestClosedMonth() {
    const month = await ports.months.findLatestClosed();
    return month ? mapMonth(month) : null;
  },
  async getClosureReview(monthId) {
    const month = await ports.months.findById(monthId);
    return buildClosureReview(month);
  },

  async applyClosureAction(input) {
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);
      const balances = calculateMonthBalances(existingMonth);

      if (input.type === MovementType.SURPLUS_TO_POCKET_ON_CLOSE) {
        throw new DomainError(409, "La variación del presupuesto es informativa y no se puede transferir.");
      }

      if (input.type === MovementType.DEFICIT_COVER_FROM_SUBCATEGORY) {
        const sourceSubcategoryId = input.sourceSubcategoryId;
        const targetSubcategoryId = input.targetSubcategoryId;

        if (!sourceSubcategoryId || !targetSubcategoryId) {
          throw new DomainError(400, "Se requieren las subcategorías de origen y destino para cubrir el déficit.");
        }

        if (sourceSubcategoryId === targetSubcategoryId) {
          throw new DomainError(400, "Las subcategorías de origen y destino deben ser diferentes.");
        }

        const sourceSubcategory = findMonthSubcategory(existingMonth, sourceSubcategoryId);
        const targetSubcategory = findMonthSubcategory(existingMonth, targetSubcategoryId);

        if (!sourceSubcategory || !targetSubcategory) {
          throw new DomainError(400, "Las subcategorías de origen y destino deben pertenecer a este mes.");
        }

        const sourceAvailable = balances.subcategoryBalances.get(sourceSubcategory.id) ?? decimalToNumber(sourceSubcategory.plannedAmount);
        const targetAvailable = balances.subcategoryBalances.get(targetSubcategory.id) ?? decimalToNumber(targetSubcategory.plannedAmount);

        if (targetAvailable >= 0 || isZero(targetAvailable)) {
          throw new DomainError(400, "La subcategoría de destino no tiene un déficit pendiente.");
        }

        const amount = readActionAmount(input.amount, Math.abs(targetAvailable));

        if (sourceAvailable - amount < -0.005) {
          throw new DomainError(400, "La subcategoría de origen no tiene suficiente saldo disponible.");
        }

        await txPorts.movements.create({
          type: MovementType.DEFICIT_COVER_FROM_SUBCATEGORY,
          occurredAt: businessDateToPrisma(today()),
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
          throw new DomainError(400, "Se requieren el bolsillo de origen y la subcategoría de destino para cubrir el déficit.");
        }

        const targetSubcategory = findMonthSubcategory(existingMonth, targetSubcategoryId);

        if (!targetSubcategory) {
          throw new DomainError(400, "La subcategoría de destino debe pertenecer a este mes.");
        }

        const targetAvailable = balances.subcategoryBalances.get(targetSubcategory.id) ?? decimalToNumber(targetSubcategory.plannedAmount);

        if (targetAvailable >= 0 || isZero(targetAvailable)) {
          throw new DomainError(400, "La subcategoría de destino no tiene un déficit pendiente.");
        }

        await txPorts.pockets.ensurePocketIsActive(sourcePocketId, "Bolsillo de origen");
        await txPorts.movements.create({
          type: MovementType.DEFICIT_COVER_FROM_POCKET,
          occurredAt: businessDateToPrisma(today()),
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

  async closeMonth(monthId, requestedAllocation) {
    const allocation = parseCloseMonthInput(requestedAllocation);
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId, true);
      const review = buildClosureReview(existingMonth);
      if (existingMonth.status === MonthStatus.CLOSED) {
        const stored = mapMonth(existingMonth).closureAllocation;
        if ((allocation && stored && allocation.carryAmount === stored.carryAmount && allocation.excludedAmount === stored.excludedAmount) ||
            (!allocation && (!stored || stored.availableMoney === 0))) return existingMonth;
        throw new DomainError(409, "El mes ya se cerró con una distribución diferente.");
      }
      if (review.pendingDeficits.length > 0 || review.availableMoney < 0 || (!allocation && !review.canClose)) {
        throw new DomainError(409, "No se puede cerrar el mes mientras haya saldos pendientes de subcategorías o dinero disponible sin resolver.");
      }
      // Integer cents prevent 0.1 + 0.2 floating-point mismatch. Recompute only under the owner lock.
      if (allocation && Math.round(allocation.carryAmount * 100) + Math.round(allocation.excludedAmount * 100) !== Math.round(review.availableMoney * 100)) {
        throw new DomainError(409, "La distribución del cierre debe ser igual al dinero disponible actual. Actualice la revisión del cierre.");
      }
      return txPorts.months.close(monthId, allocation ?? { carryAmount: 0, excludedAmount: 0 });
    });

    return mapMonth(month);
  },
});
