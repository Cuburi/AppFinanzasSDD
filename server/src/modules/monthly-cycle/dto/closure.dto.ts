import { DomainError } from "../shared/service-errors.js";
import { readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

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

export type CloseMonthInput = { carryAmount: number; excludedAmount: number };
export type ClosureAllocationView = CloseMonthInput & { availableMoney: number };

/** Strict cents, not coercion or rounding: validate direct use-case callers too. */
export const parseCloseMonthInput = (payload: unknown): CloseMonthInput | undefined => {
  if (payload === undefined) return undefined;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new DomainError(400, "Closure allocation must contain carryAmount and excludedAmount.");
  }
  const { carryAmount, excludedAmount } = payload as CloseMonthInput;
  for (const value of [carryAmount, excludedAmount]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 9_999_999_999.99 ||
        !/^(?:\d+)(?:\.\d{1,2})?$/.test(String(value))) {
      throw new DomainError(400, "Closure amounts must be finite nonnegative numbers with at most two decimals.");
    }
  }
  return { carryAmount, excludedAmount };
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
  requiresDisposition?: boolean;
  closureAllocation?: ClosureAllocationView | null;
};

export type ClosureActionInput = {
  monthId: string;
  type: "SURPLUS_TO_POCKET_ON_CLOSE" | "DEFICIT_COVER_FROM_SUBCATEGORY" | "DEFICIT_COVER_FROM_POCKET";
  sourceSubcategoryId?: string | null;
  targetSubcategoryId?: string | null;
  sourcePocketId?: string | null;
  targetPocketId?: string | null;
  amount?: number | null;
  description?: string | null;
};

const readOptionalPositiveAmount = (value: unknown, label: string): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return readPositiveAmount(value, label);
};

export const parseClosureActionInput = (monthId: string, payload: unknown): ClosureActionInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Closure action payload is required.");
  }

  const rawPayload = payload as {
    type?: unknown;
    sourceSubcategoryId?: unknown;
    targetSubcategoryId?: unknown;
    sourcePocketId?: unknown;
    targetPocketId?: unknown;
    amount?: unknown;
    description?: unknown;
  };
  const type = readNonEmptyString(rawPayload.type, "Closure action type");

  if (
    type !== "SURPLUS_TO_POCKET_ON_CLOSE" &&
    type !== "DEFICIT_COVER_FROM_SUBCATEGORY" &&
    type !== "DEFICIT_COVER_FROM_POCKET"
  ) {
    throw new Error("Closure action type is invalid.");
  }

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    type,
    sourceSubcategoryId: readOptionalString(rawPayload.sourceSubcategoryId),
    targetSubcategoryId: readOptionalString(rawPayload.targetSubcategoryId),
    sourcePocketId: readOptionalString(rawPayload.sourcePocketId),
    targetPocketId: readOptionalString(rawPayload.targetPocketId),
    amount: readOptionalPositiveAmount(rawPayload.amount, "Closure action amount"),
    description: readOptionalString(rawPayload.description),
  };
};
