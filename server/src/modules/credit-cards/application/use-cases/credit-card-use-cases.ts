import { createCreditCard, CreditCardValidationError, normalizeCreditCardName, normalizeCreditCardUpdate, toCreditCardView } from "../../domain/credit-card.js";
import { calculateStatementPeriodSplit } from "../../domain/statement-cycle.js";
import type { CreateCreditCardInput, CreditCardListFilter, CreditCardStatementSummaryView, UpdateCreditCardInput } from "../../shared/types.js";
import type { CreditCardMovementSummaryPort } from "../ports/credit-card-movement-summary.port.js";
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

export const createCreditCardUseCases = ({ creditCards, movementSummary }: { creditCards: CreditCardRepository; movementSummary: CreditCardMovementSummaryPort }) => ({
  async listCreditCards(ownerId: string, filter: CreditCardListFilter) {
    return { cards: (await creditCards.findAllByOwner(ownerId, filter)).map(toCreditCardView) };
  },

  async listCurrentStatementSummaries(ownerId: string, today = new Date()) {
    const cards = await creditCards.findAllByOwner(ownerId, { active: true });
    const summaries: CreditCardStatementSummaryView[] = [];

    for (const card of cards) {
      const periods = calculateStatementPeriodSplit({ closingDay: card.closingDay, dueDay: card.dueDay, today });
      const closedAmount = await movementSummary.sumExpensesByCardInWindow({
        ownerId,
        creditCardId: card.id,
        from: periods.closedStatement.from,
        to: periods.closedStatement.to,
      });
      const inProgressAmount = await movementSummary.sumExpensesByCardInWindow({
        ownerId,
        creditCardId: card.id,
        from: periods.inProgressCycle.from,
        to: periods.inProgressCycle.to,
      });

      summaries.push({
        creditCardId: card.id,
        name: card.name,
        issuer: card.issuer,
        limit: card.limit,
        closedStatement: {
          periodStart: periods.closedStatement.periodStart,
          periodEnd: periods.closedStatement.periodEnd,
          cutoffDate: periods.closedStatement.cutoffDate,
          dueDate: periods.closedStatement.dueDate,
          amount: closedAmount,
        },
        inProgressCycle: {
          periodStart: periods.inProgressCycle.periodStart,
          periodEnd: periods.inProgressCycle.periodEnd,
          cutoffDate: periods.inProgressCycle.cutoffDate,
          amount: inProgressAmount,
        },
      });
    }

    return { estimation: "APP_ESTIMATED" as const, cards: summaries };
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
