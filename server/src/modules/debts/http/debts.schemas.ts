import type { CreateDebtInput, DebtDirection, RegisterDebtPaymentInput } from "../shared/types.js";

import { businessDateToPrisma, parseBusinessDate } from "../../../shared/business-date.js";

const COP_CURRENCY = "COP";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  throw new Error("Se esperaba un número válido.");
};

const readNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}: valor obligatorio.`);
  }

  return value.trim();
};

const readOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Los campos de texto opcionales deben ser cadenas de texto.");
  }

  return value.trim() === "" ? null : value.trim();
};

const readPositiveAmount = (value: unknown, label: string): number => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} debe ser mayor que cero.`);
  }

  return amount;
};

const readDate = (value: unknown, label: string): Date => businessDateToPrisma(parseBusinessDate(value, label));

const readDirection = (value: unknown): DebtDirection => {
  if (value === "I_OWE" || value === "OWED_TO_ME") {
    return value;
  }

  throw new Error("La dirección de la deuda debe ser I_OWE u OWED_TO_ME.");
};

const readCopCurrency = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return COP_CURRENCY;
  if (value === COP_CURRENCY) return COP_CURRENCY;

  throw new Error("La moneda de la deuda debe ser COP.");
};

export const parseCreateDebtInput = (payload: unknown): CreateDebtInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos de la deuda.");
  }

  const rawPayload = payload as {
    direction?: unknown;
    counterpartyName?: unknown;
    description?: unknown;
    totalAmount?: unknown;
    currency?: unknown;
    originDate?: unknown;
  };

  return {
    direction: readDirection(rawPayload.direction),
    counterpartyName: readNonEmptyString(rawPayload.counterpartyName, "Nombre de la contraparte"),
    description: readOptionalString(rawPayload.description),
    totalAmount: readPositiveAmount(rawPayload.totalAmount, "Monto de la deuda"),
    currency: readCopCurrency(rawPayload.currency),
    originDate: readDate(rawPayload.originDate, "Fecha de origen"),
  };
};

export const parseRegisterDebtPaymentInput = (payload: unknown): RegisterDebtPaymentInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos del pago.");
  }

  const rawPayload = payload as { amount?: unknown; paidAt?: unknown; notes?: unknown };

  return {
    amount: readPositiveAmount(rawPayload.amount, "Monto del pago"),
    paidAt: readDate(rawPayload.paidAt, "Fecha del pago"),
    notes: readOptionalString(rawPayload.notes),
  };
};
