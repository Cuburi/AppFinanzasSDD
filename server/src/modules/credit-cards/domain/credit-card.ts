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
  if (text === "") throw new CreditCardValidationError(`${label} is required.`);
  return text;
};

const readOptionalLimit = (value: number | null | undefined) => {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value <= 0) throw new CreditCardValidationError("Credit card limit must be positive.");
  return value;
};

const readDay = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 1 || value > 31) throw new CreditCardValidationError(`${label} must be between 1 and 31.`);
  return value;
};

export const normalizeCreditCardName = (name: string) => readRequiredText(name, "Credit card name");

export const createCreditCard = (ownerId: string, input: CreateCreditCardInput): NewCreditCard => ({
  ownerId,
  issuer: readRequiredText(input.issuer, "Credit card issuer"),
  name: normalizeCreditCardName(input.name),
  limit: readOptionalLimit(input.limit),
  closingDay: readDay(input.closingDay, "Credit card closing day"),
  dueDay: readDay(input.dueDay, "Credit card due day"),
  active: true,
});

export const normalizeCreditCardUpdate = (input: UpdateCreditCardInput): UpdateCreditCardInput => ({
  ...(input.issuer !== undefined ? { issuer: readRequiredText(input.issuer, "Credit card issuer") } : {}),
  ...(input.name !== undefined ? { name: normalizeCreditCardName(input.name) } : {}),
  ...(input.limit !== undefined ? { limit: readOptionalLimit(input.limit) } : {}),
  ...(input.closingDay !== undefined ? { closingDay: readDay(input.closingDay, "Credit card closing day") } : {}),
  ...(input.dueDay !== undefined ? { dueDay: readDay(input.dueDay, "Credit card due day") } : {}),
  ...(input.active !== undefined ? { active: input.active } : {}),
});

export const rehydrateCreditCard = (card: CreditCard): CreditCard => ({
  ...card,
  issuer: readRequiredText(card.issuer, "Credit card issuer"),
  name: normalizeCreditCardName(card.name),
  limit: readOptionalLimit(card.limit),
  closingDay: readDay(card.closingDay, "Credit card closing day"),
  dueDay: readDay(card.dueDay, "Credit card due day"),
});

export const toCreditCardView = (card: CreditCard): CreditCardView => ({ ...card });
