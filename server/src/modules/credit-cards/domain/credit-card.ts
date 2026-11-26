import type { CreateCreditCardInput, CreditCardView, UpdateCreditCardInput } from "../shared/types.js";

export class CreditCardValidationError extends Error {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "CreditCardValidationError";
  }
}

export type CreditCard = CreditCardView;

export type NewCreditCard = Omit<CreditCard, "id" | "active"> & { active: true };

const readRequiredText = (value: string, label: string) => {
  const text = value.trim();
  if (text === "") throw new CreditCardValidationError(`${label}: valor obligatorio.`);
  return text;
};

const readOptionalLimit = (value: number | null | undefined) => {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value <= 0) throw new CreditCardValidationError("El cupo de la tarjeta de crédito debe ser mayor que cero.");
  return value;
};

const readDay = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 1 || value > 31) throw new CreditCardValidationError(`${label} debe estar entre 1 y 31.`);
  return value;
};

export const normalizeCreditCardName = (name: string) => readRequiredText(name, "Nombre de la tarjeta de crédito");

export const createCreditCard = (ownerId: string, input: CreateCreditCardInput): NewCreditCard => ({
  ownerId,
  issuer: readRequiredText(input.issuer, "Emisor de la tarjeta de crédito"),
  name: normalizeCreditCardName(input.name),
  limit: readOptionalLimit(input.limit),
  closingDay: readDay(input.closingDay, "Día de corte de la tarjeta de crédito"),
  dueDay: readDay(input.dueDay, "Día de pago de la tarjeta de crédito"),
  active: true,
});

export const normalizeCreditCardUpdate = (input: UpdateCreditCardInput): UpdateCreditCardInput => ({
  ...(input.issuer !== undefined ? { issuer: readRequiredText(input.issuer, "Emisor de la tarjeta de crédito") } : {}),
  ...(input.name !== undefined ? { name: normalizeCreditCardName(input.name) } : {}),
  ...(input.limit !== undefined ? { limit: readOptionalLimit(input.limit) } : {}),
  ...(input.closingDay !== undefined ? { closingDay: readDay(input.closingDay, "Día de corte de la tarjeta de crédito") } : {}),
  ...(input.dueDay !== undefined ? { dueDay: readDay(input.dueDay, "Día de pago de la tarjeta de crédito") } : {}),
  ...(input.active !== undefined ? { active: input.active } : {}),
});

export const rehydrateCreditCard = (card: CreditCard): CreditCard => ({
  ...card,
  issuer: readRequiredText(card.issuer, "Emisor de la tarjeta de crédito"),
  name: normalizeCreditCardName(card.name),
  limit: readOptionalLimit(card.limit),
  closingDay: readDay(card.closingDay, "Día de corte de la tarjeta de crédito"),
  dueDay: readDay(card.dueDay, "Día de pago de la tarjeta de crédito"),
});

export const toCreditCardView = (card: CreditCard): CreditCardView => ({ ...card });
