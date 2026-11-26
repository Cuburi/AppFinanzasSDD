import { parseBusinessDate } from "../../../shared/business-date.js";

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  throw new Error("Se esperaba un número válido.");
};

export const readNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}: valor obligatorio.`);
  }

  return value.trim();
};

export const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
};

export const readPositiveAmount = (value: unknown, label: string): number => {
  const amount = toNumber(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} debe ser mayor que cero.`);
  }

  return amount;
};

export const readIsoDateString = (value: unknown, label: string): string => parseBusinessDate(value, label);
