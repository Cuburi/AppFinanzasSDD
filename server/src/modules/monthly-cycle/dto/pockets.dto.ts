import { SemanticError } from "../shared/service-errors.js";
import { readIsoDateString, readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

type StrictDepositBase = { targetPocketId: string; amount: number; occurredAt: string; description?: string | null };

export type DepositToPocketInput = StrictDepositBase & (
  | { sourceKind: "SUBCATEGORY"; monthId: string; sourceSubcategoryId: string; externalSourceLabel?: never }
  | { sourceKind: "MONTH_AVAILABLE"; monthId: string; sourceSubcategoryId?: never; externalSourceLabel?: never }
  | { sourceKind: "EXTERNAL"; monthId?: never; sourceSubcategoryId?: never; externalSourceLabel?: string }
);

const invalidDepositSource = (message: string) => new SemanticError("INVALID_DEPOSIT_SOURCE", 400, message);

const readRequiredDepositSourceField = (value: unknown, label: string) => {
  try {
    return readNonEmptyString(value, label);
  } catch (error) {
    throw invalidDepositSource(error instanceof Error ? error.message : `${label} is required.`);
  }
};

const readDepositAmount = (value: unknown) => {
  try {
    return readPositiveAmount(value, "Deposit amount");
  } catch (error) {
    throw new SemanticError("INVALID_AMOUNT", 400, error instanceof Error ? error.message : "Deposit amount is invalid.");
  }
};

const readDepositDate = (value: unknown) => {
  try {
    return readIsoDateString(value, "Pocket deposit date");
  } catch (error) {
    throw new SemanticError("INVALID_DATE", 400, error instanceof Error ? error.message : "Pocket deposit date is invalid.");
  }
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
  const sourceKind = typeof rawPayload.sourceKind === "string" ? rawPayload.sourceKind.trim() : "";
  if (sourceKind !== "SUBCATEGORY" && sourceKind !== "MONTH_AVAILABLE" && sourceKind !== "EXTERNAL") {
    throw invalidDepositSource("Pocket deposit source kind must be SUBCATEGORY, MONTH_AVAILABLE, or EXTERNAL.");
  }
  const base = {
    targetPocketId: readNonEmptyString(rawPayload.targetPocketId, "Target pocket"),
    amount: readDepositAmount(rawPayload.amount),
    occurredAt: readDepositDate((payload as { occurredAt?: unknown }).occurredAt),
    description: readOptionalString(rawPayload.description),
  };

  if (sourceKind === "SUBCATEGORY") {
    if (Object.hasOwn(rawPayload, "externalSourceLabel")) {
      throw invalidDepositSource("Subcategory pocket deposits cannot specify an external source label.");
    }
    return {
      ...base,
      sourceKind,
      monthId: readRequiredDepositSourceField(rawPayload.monthId, "Month id"),
      sourceSubcategoryId: readRequiredDepositSourceField(rawPayload.sourceSubcategoryId, "Source subcategory"),
    };
  }

  if (sourceKind === "MONTH_AVAILABLE") {
    if (Object.hasOwn(rawPayload, "sourceSubcategoryId") || Object.hasOwn(rawPayload, "externalSourceLabel")) {
      throw invalidDepositSource("Available-funds pocket deposits cannot specify a subcategory or external source label.");
    }
    return { ...base, sourceKind, monthId: readRequiredDepositSourceField(rawPayload.monthId, "Month id") };
  }

  if (sourceKind === "EXTERNAL") {
    if (Object.hasOwn(rawPayload, "monthId") || Object.hasOwn(rawPayload, "sourceSubcategoryId")) {
      throw invalidDepositSource("External pocket deposits cannot specify a month or subcategory.");
    }
    const externalSourceLabel = readOptionalString(rawPayload.externalSourceLabel);
    return { ...base, sourceKind, ...(externalSourceLabel ? { externalSourceLabel } : {}) };
  }
  throw invalidDepositSource("Pocket deposit source kind must be SUBCATEGORY, MONTH_AVAILABLE, or EXTERNAL.");
};
