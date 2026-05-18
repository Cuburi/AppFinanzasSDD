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

export type ClosureReviewView = {
  monthId: string;
  status: "ACTIVE" | "CLOSED";
  pendingSurpluses: ClosurePendingSurplusView[];
  pendingDeficits: ClosurePendingDeficitView[];
  availableMoney: number;
  availableMoneyBlocker: "SURPLUS" | "DEFICIT" | null;
  canClose: boolean;
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
