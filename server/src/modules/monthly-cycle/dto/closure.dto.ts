import { DomainError } from "../shared/service-errors.js";

export type ClosurePendingSurplusView = {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
  defaultPocketId: string | null;
  requiresPocketSelection: boolean;
};

export type ClosurePendingDeficitView = {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
};

export type ClosureCategoryVarianceView = {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
  kind: "SURPLUS" | "DEFICIT";
  informational: true;
};

export type CloseMonthInput = { carryAmount: number; excludedAmount: number; shortfallAmount?: number; acknowledgedWarningsKey?: string };
export type ClosureAllocationView = CloseMonthInput & { availableMoney: number };

/** Strict cents, not coercion or rounding: validate direct use-case callers too. */
export const parseCloseMonthInput = (payload: unknown): CloseMonthInput | undefined => {
  if (payload === undefined) return undefined;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new DomainError(400, "La distribución del cierre debe incluir carryAmount y excludedAmount.");
  }
  const { carryAmount, excludedAmount, shortfallAmount, acknowledgedWarningsKey } = payload as CloseMonthInput;
  if (acknowledgedWarningsKey !== undefined && (typeof acknowledgedWarningsKey !== "string" || !acknowledgedWarningsKey.trim())) {
    throw new DomainError(400, "La confirmación de los avisos debe ser una clave no vacía.");
  }
  for (const value of [carryAmount, excludedAmount, ...(shortfallAmount === undefined ? [] : [shortfallAmount])]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 9_999_999_999.99 ||
        !/^(?:\d+)(?:\.\d{1,2})?$/.test(String(value))) {
      throw new DomainError(400, "Los montos del cierre deben ser números finitos no negativos con máximo dos decimales.");
    }
  }
  return { carryAmount, excludedAmount, ...(shortfallAmount === undefined ? {} : { shortfallAmount }), ...(acknowledgedWarningsKey === undefined ? {} : { acknowledgedWarningsKey }) };
};

export type ClosureReviewView = {
  monthId: string;
  status: "ACTIVE" | "CLOSED";
  pendingSurpluses: ClosurePendingSurplusView[];
  pendingDeficits: ClosurePendingDeficitView[];
  budgetVariances: ClosureCategoryVarianceView[];
  availableMoney: number;
  availableMoneyBlocker: "SURPLUS" | "DEFICIT" | null;
  canClose: boolean;
  requiresAcknowledgement: boolean;
  warningsKey: string | null;
  shortfallAmount: number;
  requiresDisposition?: boolean;
  closureAllocation?: ClosureAllocationView | null;
};
