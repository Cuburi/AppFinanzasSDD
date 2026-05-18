import { readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

export type DepositToPocketInput = {
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
    targetPocketId?: unknown;
    amount?: unknown;
    description?: unknown;
    externalSourceLabel?: unknown;
  };
  const sourceSubcategoryId = readOptionalString(rawPayload.sourceSubcategoryId);
  const monthId = readOptionalString(rawPayload.monthId);
  const externalSourceLabel = readOptionalString(rawPayload.externalSourceLabel);

  if (sourceSubcategoryId && !monthId) {
    throw new Error("Month id is required when depositing from a subcategory.");
  }

  if (!sourceSubcategoryId && !externalSourceLabel) {
    throw new Error("External source label is required for external pocket deposits.");
  }

  return {
    monthId,
    sourceSubcategoryId,
    targetPocketId: readNonEmptyString(rawPayload.targetPocketId, "Target pocket"),
    amount: readPositiveAmount(rawPayload.amount, "Deposit amount"),
    description: readOptionalString(rawPayload.description),
    externalSourceLabel,
  };
};
