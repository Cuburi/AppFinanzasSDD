import { MovementType } from "../../../../lib/prisma-client.js";
import type { CreditCardMovementSummaryPort } from "../../application/ports/credit-card-movement-summary.port.js";

type DecimalLike = { toString(): string };

type PrismaMovementSummaryClient = {
  movement: {
    aggregate(args: {
      where: {
        type: typeof MovementType.EXPENSE;
        creditCardId: string;
        creditCard: { ownerId: string };
        occurredAt: { gte: Date; lte: Date };
      };
      _sum: { amount: true };
    }): Promise<{ _sum: { amount: DecimalLike | null } }>;
  };
};

const decimalLikeToNumber = (value: DecimalLike | null) => (value ? Number(value.toString()) : 0);

export const createCreditCardMovementSummaryPrismaAdapter = (db: PrismaMovementSummaryClient): CreditCardMovementSummaryPort => ({
  async sumExpensesByCardInWindow(input) {
    const result = await db.movement.aggregate({
      where: {
        type: MovementType.EXPENSE,
        creditCardId: input.creditCardId,
        creditCard: { ownerId: input.ownerId },
        occurredAt: { gte: input.from, lte: input.to },
      },
      _sum: { amount: true },
    });

    return decimalLikeToNumber(result._sum.amount);
  },
});
