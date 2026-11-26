import type { CreateCreditCardInput, CreditCardListFilter, UpdateCreditCardInput } from "../shared/types.js";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  throw new Error("Se esperaba un número válido.");
};

const readText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label}: valor obligatorio.`);
  return value.trim();
};

const readOptionalLimit = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const limit = toNumber(value);
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("El cupo de la tarjeta de crédito debe ser mayor que cero.");
  return limit;
};

const readDay = (value: unknown, label: string) => {
  const day = toNumber(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(`${label} debe estar entre 1 y 31.`);
  return day;
};

const readOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("El indicador de tarjeta de crédito activa debe ser un booleano.");
};

export const parseCreditCardListFilter = (value: unknown): CreditCardListFilter => {
  if (value === "all") return { active: "all" };
  if (value === "false" || value === false) return { active: false };
  return { active: true };
};

export const parseCreateCreditCardInput = (payload: unknown): CreateCreditCardInput => {
  if (!payload || typeof payload !== "object") throw new Error("Se requieren los datos de la tarjeta de crédito.");
  const raw = payload as { issuer?: unknown; name?: unknown; limit?: unknown; closingDay?: unknown; dueDay?: unknown };
  return {
    issuer: readText(raw.issuer, "Emisor de la tarjeta de crédito"),
    name: readText(raw.name, "Nombre de la tarjeta de crédito"),
    limit: readOptionalLimit(raw.limit),
    closingDay: readDay(raw.closingDay, "Día de corte de la tarjeta de crédito"),
    dueDay: readDay(raw.dueDay, "Día de pago de la tarjeta de crédito"),
  };
};

export const parseUpdateCreditCardInput = (payload: unknown): UpdateCreditCardInput => {
  if (!payload || typeof payload !== "object") throw new Error("Se requieren los datos para actualizar la tarjeta de crédito.");
  const raw = payload as { issuer?: unknown; name?: unknown; limit?: unknown; closingDay?: unknown; dueDay?: unknown; active?: unknown };
  const input: UpdateCreditCardInput = {};
  if (raw.issuer !== undefined) input.issuer = readText(raw.issuer, "Emisor de la tarjeta de crédito");
  if (raw.name !== undefined) input.name = readText(raw.name, "Nombre de la tarjeta de crédito");
  if (raw.limit !== undefined) input.limit = readOptionalLimit(raw.limit);
  if (raw.closingDay !== undefined) input.closingDay = readDay(raw.closingDay, "Día de corte de la tarjeta de crédito");
  if (raw.dueDay !== undefined) input.dueDay = readDay(raw.dueDay, "Día de pago de la tarjeta de crédito");
  if (raw.active !== undefined) input.active = readOptionalBoolean(raw.active);
  return input;
};
