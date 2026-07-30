import { readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

const MONTH_AVAILABLE_SOURCE_KIND = "MONTH_AVAILABLE";

export type DepositToPocketInput = {
  sourceKind?: typeof MONTH_AVAILABLE_SOURCE_KIND;
  monthId?: string | null;
  sourceSubcategoryId?: string | null;
  targetPocketId: string;
  amount: number;
  description?: string | null;
  externalSourceLabel?: string | null;
};

export const parseDepositToPocketInput = (payload: unknown): DepositToPocketInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Pocket deposit payload is required.");
  }

  const rawPayload = payload as {
    monthId?: unknown;
    sourceSubcategoryId?: unknown;
    sourceKind?: unknown;
    targetPocketId?: unknown;
    amount?: unknown;
    description?: unknown;
    externalSourceLabel?: unknown;
  };
  const sourceSubcategoryId = readOptionalString(rawPayload.sourceSubcategoryId);
  const monthId = readOptionalString(rawPayload.monthId);
  const externalSourceLabel = readOptionalString(rawPayload.externalSourceLabel);
  const sourceKind = rawPayload.sourceKind === undefined ? null : readNonEmptyString(rawPayload.sourceKind, "Source kind");
  const isMonthAvailableCompatibilityInput = sourceKind === MONTH_AVAILABLE_SOURCE_KIND;

  if (sourceKind && !isMonthAvailableCompatibilityInput) {
    throw new Error("Unsupported pocket deposit source kind.");
  }

  if (sourceSubcategoryId && !monthId) {
    throw new Error("Month id is required when depositing from a subcategory.");
  }

  if (isMonthAvailableCompatibilityInput && !monthId) {
    throw new Error("Month id is required when depositing from available funds.");
  }

  if (isMonthAvailableCompatibilityInput && sourceSubcategoryId) {
    throw new Error("Source subcategory is not allowed when depositing from available funds.");
  }

  if (isMonthAvailableCompatibilityInput && externalSourceLabel) {
    throw new Error("External source label is not allowed when depositing from available funds.");
  }

  if (!sourceSubcategoryId && !externalSourceLabel && !isMonthAvailableCompatibilityInput) {
    throw new Error("External source label is required for external pocket deposits.");
  }

  return {
    ...(isMonthAvailableCompatibilityInput ? { sourceKind: MONTH_AVAILABLE_SOURCE_KIND } : {}),
    monthId,
    sourceSubcategoryId,
    targetPocketId: readNonEmptyString(rawPayload.targetPocketId, "Target pocket"),
    amount: readPositiveAmount(rawPayload.amount, "Deposit amount"),
    description: readOptionalString(rawPayload.description),
    externalSourceLabel,
  };
};
