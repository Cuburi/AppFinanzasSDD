import type { CreateDebtInput, DebtDirection, RegisterDebtPaymentInput } from "../shared/types.js";

const COP_CURRENCY = "COP";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  throw new Error("Expected a valid number.");
};

const readNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
};

const readOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Optional text fields must be strings.");
  }

  return value.trim() === "" ? null : value.trim();
};

const readPositiveAmount = (value: unknown, label: string): number => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be positive.`);
  }

  return amount;
};

const readDate = (value: unknown, label: string): Date => {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new Error(`${label} must be a valid date.`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
};

const readDirection = (value: unknown): DebtDirection => {
  if (value === "I_OWE" || value === "OWED_TO_ME") {
    return value;
  }

  throw new Error("Debt direction must be I_OWE or OWED_TO_ME.");
};

const readCopCurrency = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return COP_CURRENCY;
  if (value === COP_CURRENCY) return COP_CURRENCY;

  throw new Error("Debt currency must be COP.");
};

export const parseCreateDebtInput = (payload: unknown): CreateDebtInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Debt payload is required.");
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
    counterpartyName: readNonEmptyString(rawPayload.counterpartyName, "Counterparty name"),
    description: readOptionalString(rawPayload.description),
    totalAmount: readPositiveAmount(rawPayload.totalAmount, "Debt amount"),
    currency: readCopCurrency(rawPayload.currency),
    originDate: readDate(rawPayload.originDate, "Origin date"),
  };
};

export const parseRegisterDebtPaymentInput = (payload: unknown): RegisterDebtPaymentInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payment payload is required.");
  }

  const rawPayload = payload as { amount?: unknown; paidAt?: unknown; notes?: unknown };

  return {
    amount: readPositiveAmount(rawPayload.amount, "Payment amount"),
    paidAt: readDate(rawPayload.paidAt, "Payment date"),
    notes: readOptionalString(rawPayload.notes),
  };
};
