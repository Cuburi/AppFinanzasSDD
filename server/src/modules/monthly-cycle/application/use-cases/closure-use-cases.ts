import { parseCloseMonthInput, type CloseMonthInput } from "../../dto/closure.dto.js";
import type { ClosureReviewView, MonthView } from "../../dto/index.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import { listMonthSubcategories, lockMutableMonthForMutation } from "../../shared/month-queries.js";
import { decimalToNumber, isZero } from "../../shared/money.js";
import { DomainError } from "../../shared/service-errors.js";
import type { MonthRecord } from "../../shared/service-types.js";
import { MonthStatus, type MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const CLOSURE_USE_CASE_NAMES = ["getClosureReview", "closeMonth", "getMonth", "getLatestClosedMonth"] as const;
export type ClosureUseCases = {
  getClosureReview(monthId: string): Promise<ClosureReviewView>;
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
    if (isZero(available)) continue;
    const amount = Number(Math.abs(available).toFixed(2));
    budgetVariances.push({ subcategoryId: subcategory.id, subcategoryName: subcategory.name, amount, kind: available > 0 ? "SURPLUS" as const : "DEFICIT" as const, informational: true as const });
    if (available > 0) pendingSurpluses.push({ subcategoryId: subcategory.id, subcategoryName: subcategory.name, amount, defaultPocketId: subcategory.defaultPocketId, requiresPocketSelection: !subcategory.defaultPocketId });
    else pendingDeficits.push({ subcategoryId: subcategory.id, subcategoryName: subcategory.name, amount });
  }
  const requiresAcknowledgement = pendingDeficits.length > 0 || balances.availableMoney < 0;
  return {
    monthId: month.id, status: month.status, pendingSurpluses, pendingDeficits, budgetVariances,
    availableMoney: balances.availableMoney,
    availableMoneyBlocker: isZero(balances.availableMoney) ? null : balances.availableMoney > 0 ? "SURPLUS" : "DEFICIT",
    requiresDisposition: balances.availableMoney > 0 && !isZero(balances.availableMoney),
    requiresAcknowledgement,
    warningsKey: requiresAcknowledgement ? [...pendingDeficits.map(item => `${item.subcategoryId}:${toCents(item.amount)}`).sort(), `shortfall:${toCents(Math.max(0, -balances.availableMoney))}`].join("|") : null,
    shortfallAmount: balances.availableMoney < 0 ? Number((-balances.availableMoney).toFixed(2)) : 0,
    closureAllocation: mapMonth(month).closureAllocation ?? null,
    canClose: month.status === MonthStatus.ACTIVE && !requiresAcknowledgement && isZero(balances.availableMoney),
  };
};
const toCents = (amount: number) => Math.round(amount * 100);

/**
 * The confirmed allocation must describe the availability recomputed under the month lock:
 * carry + excluded - shortfall = available (integer cents avoid 0.1 + 0.2 mismatches).
 * Negative availability is only closable as a shortfall covered outside the app (carry = excluded = 0);
 * non-negative availability never records a shortfall.
 */
const matchesCurrentAvailability = (allocation: CloseMonthInput, review: ClosureReviewView) => {
  const shortfall = allocation.shortfallAmount ?? 0;
  const sumMatches = toCents(allocation.carryAmount) + toCents(allocation.excludedAmount) - toCents(shortfall) === toCents(review.availableMoney);
  const shapeMatches = review.availableMoney < 0
    ? allocation.carryAmount === 0 && allocation.excludedAmount === 0 && shortfall === review.shortfallAmount
    : shortfall === 0;
  return sumMatches && shapeMatches;
};

export const createClosureUseCases = (ports: MonthlyCyclePorts): ClosureUseCases => ({
  async getMonth(monthId) { return mapMonth(await ports.months.findById(monthId)); },
  async getLatestClosedMonth() { const month = await ports.months.findLatestClosed(); return month ? mapMonth(month) : null; },
  async getClosureReview(monthId) { return buildClosureReview(await ports.months.findById(monthId)); },
  async closeMonth(monthId, requestedAllocation) {
    const allocation = parseCloseMonthInput(requestedAllocation);
    const month = await ports.transactionRunner.run(async (txPorts) => {
      const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId, true);
      const review = buildClosureReview(existingMonth);
      if (existingMonth.status === MonthStatus.CLOSED) {
        const stored = mapMonth(existingMonth).closureAllocation;
        if ((allocation && stored && allocation.carryAmount === stored.carryAmount && allocation.excludedAmount === stored.excludedAmount && (allocation.shortfallAmount ?? 0) === (stored.shortfallAmount ?? 0)) ||
            (!allocation && (!stored || stored.availableMoney === 0))) return existingMonth;
        throw new DomainError(409, "El mes ya se cerró con una distribución diferente.");
      }
      if (review.requiresAcknowledgement && !allocation?.acknowledgedWarningsKey) {
        throw new DomainError(409, "Debe confirmar que entiende los avisos antes de cerrar el mes.");
      }
      // A supplied key must match the current warnings, including "no warnings" (null): warnings that cleared
      // after the user confirmed still mean the review they saw is stale.
      const acknowledgedKey = allocation?.acknowledgedWarningsKey;
      if ((review.requiresAcknowledgement || acknowledgedKey !== undefined) && acknowledgedKey !== review.warningsKey) {
        throw new DomainError(409, "Los avisos del cierre cambiaron. Actualice la revisión del cierre.");
      }
      if (!allocation && !review.canClose) {
        throw new DomainError(409, "No se puede cerrar el mes mientras haya saldos pendientes de subcategorías o dinero disponible sin resolver.");
      }
      const shortfall = allocation?.shortfallAmount ?? 0;
      if (allocation && !matchesCurrentAvailability(allocation, review)) {
        throw new DomainError(409, "La distribución del cierre debe ser igual al dinero disponible actual. Actualice la revisión del cierre.");
      }
      return txPorts.months.close(monthId, { carryAmount: allocation?.carryAmount ?? 0, excludedAmount: allocation?.excludedAmount ?? 0, shortfallAmount: shortfall });
    });
    return mapMonth(month);
  },
});
