import type { CreateCreditCardInput, CreditCardListFilter, UpdateCreditCardInput } from "../shared/types.js";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  throw new Error("Expected a valid number.");
};

const readText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is required.`);
  return value.trim();
};

const readOptionalLimit = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const limit = toNumber(value);
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("Credit card limit must be positive.");
  return limit;
};

const readDay = (value: unknown, label: string) => {
  const day = toNumber(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(`${label} must be between 1 and 31.`);
  return day;
};

const readOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Credit card active flag must be a boolean.");
};

export const parseCreditCardListFilter = (value: unknown): CreditCardListFilter => {
  if (value === "all") return { active: "all" };
  if (value === "false" || value === false) return { active: false };
  return { active: true };
};

export const parseCreateCreditCardInput = (payload: unknown): CreateCreditCardInput => {
  if (!payload || typeof payload !== "object") throw new Error("Credit card payload is required.");
  const raw = payload as { issuer?: unknown; name?: unknown; limit?: unknown; closingDay?: unknown; dueDay?: unknown };
  return {
    issuer: readText(raw.issuer, "Credit card issuer"),
    name: readText(raw.name, "Credit card name"),
    limit: readOptionalLimit(raw.limit),
    closingDay: readDay(raw.closingDay, "Credit card closing day"),
    dueDay: readDay(raw.dueDay, "Credit card due day"),
  };
};

export const parseUpdateCreditCardInput = (payload: unknown): UpdateCreditCardInput => {
  if (!payload || typeof payload !== "object") throw new Error("Credit card update payload is required.");
  const raw = payload as { issuer?: unknown; name?: unknown; limit?: unknown; closingDay?: unknown; dueDay?: unknown; active?: unknown };
  const input: UpdateCreditCardInput = {};
  if (raw.issuer !== undefined) input.issuer = readText(raw.issuer, "Credit card issuer");
  if (raw.name !== undefined) input.name = readText(raw.name, "Credit card name");
  if (raw.limit !== undefined) input.limit = readOptionalLimit(raw.limit);
  if (raw.closingDay !== undefined) input.closingDay = readDay(raw.closingDay, "Credit card closing day");
  if (raw.dueDay !== undefined) input.dueDay = readDay(raw.dueDay, "Credit card due day");
  if (raw.active !== undefined) input.active = readOptionalBoolean(raw.active);
  return input;
};
