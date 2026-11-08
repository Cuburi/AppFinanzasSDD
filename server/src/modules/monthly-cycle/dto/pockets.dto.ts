import { SemanticError } from "../shared/service-errors.js";
import { readIsoDateString, readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

type StrictDepositBase = { targetPocketId: string; amount: number; occurredAt: string; description?: string | null };

export type WithdrawFromPocketInput = {
  sourcePocketId: string;
  amount: number;
  occurredAt: string;
  description?: string | null;
};

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
    throw invalidDepositSource(error instanceof Error ? error.message : `${label}: valor obligatorio.`);
  }
};

const readDepositAmount = (value: unknown) => {
  try {
    return readPositiveAmount(value, "Monto del depósito");
  } catch (error) {
    throw new SemanticError("INVALID_AMOUNT", 400, error instanceof Error ? error.message : "El monto del depósito no es válido.");
  }
};

const readDepositDate = (value: unknown) => {
  try {
    return readIsoDateString(value, "Fecha del depósito al bolsillo");
  } catch (error) {
    throw new SemanticError("INVALID_DATE", 400, error instanceof Error ? error.message : "La fecha del depósito al bolsillo no es válida.");
  }
};

export const parseWithdrawFromPocketInput = (payload: unknown): WithdrawFromPocketInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos del retiro del bolsillo.");
  }

  const rawPayload = payload as { sourcePocketId?: unknown; amount?: unknown; occurredAt?: unknown; description?: unknown };
  return {
    sourcePocketId: readNonEmptyString(rawPayload.sourcePocketId, "Bolsillo de origen"),
    amount: readDepositAmount(rawPayload.amount),
    occurredAt: readDepositDate(rawPayload.occurredAt),
    description: readOptionalString(rawPayload.description),
  };
};

export const parseDepositToPocketInput = (payload: unknown): DepositToPocketInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos del depósito al bolsillo.");
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
    throw invalidDepositSource("El tipo de origen del depósito al bolsillo debe ser SUBCATEGORY, MONTH_AVAILABLE o EXTERNAL.");
  }
  const base = {
    targetPocketId: readNonEmptyString(rawPayload.targetPocketId, "Bolsillo de destino"),
    amount: readDepositAmount(rawPayload.amount),
    occurredAt: readDepositDate((payload as { occurredAt?: unknown }).occurredAt),
    description: readOptionalString(rawPayload.description),
  };

  if (sourceKind === "SUBCATEGORY") {
    if (Object.hasOwn(rawPayload, "externalSourceLabel")) {
      throw invalidDepositSource("Los depósitos al bolsillo desde una subcategoría no pueden indicar una etiqueta de origen externo.");
    }
    return {
      ...base,
      sourceKind,
      monthId: readRequiredDepositSourceField(rawPayload.monthId, "Identificador del mes"),
      sourceSubcategoryId: readRequiredDepositSourceField(rawPayload.sourceSubcategoryId, "Subcategoría de origen"),
    };
  }

  if (sourceKind === "MONTH_AVAILABLE") {
    if (Object.hasOwn(rawPayload, "sourceSubcategoryId") || Object.hasOwn(rawPayload, "externalSourceLabel")) {
      throw invalidDepositSource("Los depósitos al bolsillo desde el dinero disponible no pueden indicar una subcategoría ni una etiqueta de origen externo.");
    }
    return { ...base, sourceKind, monthId: readRequiredDepositSourceField(rawPayload.monthId, "Identificador del mes") };
  }

  if (sourceKind === "EXTERNAL") {
    if (Object.hasOwn(rawPayload, "monthId") || Object.hasOwn(rawPayload, "sourceSubcategoryId")) {
      throw invalidDepositSource("Los depósitos externos al bolsillo no pueden indicar un mes ni una subcategoría.");
    }
    const externalSourceLabel = readOptionalString(rawPayload.externalSourceLabel);
    return { ...base, sourceKind, ...(externalSourceLabel ? { externalSourceLabel } : {}) };
  }
  throw invalidDepositSource("El tipo de origen del depósito al bolsillo debe ser SUBCATEGORY, MONTH_AVAILABLE o EXTERNAL.");
};
