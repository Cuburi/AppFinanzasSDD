import { createCreditCard, CreditCardValidationError, normalizeCreditCardName, normalizeCreditCardUpdate, toCreditCardView } from "../../domain/credit-card.js";
import type { CreateCreditCardInput, CreditCardListFilter, UpdateCreditCardInput } from "../../shared/types.js";
import type { CreditCardRepository } from "../ports/credit-card-repository.port.js";

export class CreditCardNotFoundError extends Error {
  public readonly statusCode = 404;

  constructor() {
    super("Credit card was not found.");
    this.name = "CreditCardNotFoundError";
  }
}

const ensureUniqueName = async (creditCards: CreditCardRepository, ownerId: string, name: string, currentId?: string) => {
  const existing = await creditCards.findByNameForOwner(ownerId, normalizeCreditCardName(name));
  if (existing && existing.id !== currentId) throw new CreditCardValidationError("A credit card with that name already exists.");
};

export const createCreditCardUseCases = ({ creditCards }: { creditCards: CreditCardRepository }) => ({
  async listCreditCards(ownerId: string, filter: CreditCardListFilter) {
    return { cards: (await creditCards.findAllByOwner(ownerId, filter)).map(toCreditCardView) };
  },

  async getCreditCard(ownerId: string, id: string) {
    const card = await creditCards.findByIdForOwner(ownerId, id);
    if (!card) throw new CreditCardNotFoundError();
    return toCreditCardView(card);
  },

  async createCreditCard(ownerId: string, input: CreateCreditCardInput) {
    await ensureUniqueName(creditCards, ownerId, input.name);
    return toCreditCardView(await creditCards.create(createCreditCard(ownerId, input)));
  },

  async updateCreditCard(ownerId: string, id: string, input: UpdateCreditCardInput) {
    const existing = await creditCards.findByIdForOwner(ownerId, id);
    if (!existing) throw new CreditCardNotFoundError();
    if (input.name !== undefined) await ensureUniqueName(creditCards, ownerId, input.name, id);
    return toCreditCardView(await creditCards.update(ownerId, id, normalizeCreditCardUpdate(input)));
  },

  async activateCreditCard(ownerId: string, id: string) {
    return this.updateCreditCard(ownerId, id, { active: true });
  },

  async inactivateCreditCard(ownerId: string, id: string) {
    return this.updateCreditCard(ownerId, id, { active: false });
  },
});
