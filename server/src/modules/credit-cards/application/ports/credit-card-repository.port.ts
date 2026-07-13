import type { CreditCard, NewCreditCard } from "../../domain/credit-card.js";
import type { CreditCardListFilter, UpdateCreditCardInput } from "../../shared/types.js";

export type CreditCardRepository = {
  findAllByOwner(ownerId: string, filter: CreditCardListFilter): Promise<CreditCard[]>;
  findByIdForOwner(ownerId: string, id: string): Promise<CreditCard | null>;
  findByNameForOwner(ownerId: string, name: string): Promise<CreditCard | null>;
  create(input: NewCreditCard): Promise<CreditCard>;
  update(ownerId: string, id: string, input: UpdateCreditCardInput): Promise<CreditCard>;
};
