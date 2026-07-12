import { prisma } from "../../lib/prisma.js";
import { createCreditCardUseCases } from "./application/use-cases/credit-card-use-cases.js";
import { createCreditCardsRouter, type CreditCardOwnerProvider } from "./http/credit-cards.routes.js";
import { createCreditCardPrismaRepository } from "./infrastructure/prisma/credit-card-prisma-repository.js";

const SINGLE_USER_OWNER_ID = "single-user";

type PrismaCreditCardsModuleDb = typeof prisma;

export const createCreditCardsModule = (db: PrismaCreditCardsModuleDb = prisma, ownerProvider: CreditCardOwnerProvider = () => SINGLE_USER_OWNER_ID) => {
  const creditCards = createCreditCardPrismaRepository(db as unknown as Parameters<typeof createCreditCardPrismaRepository>[0]);
  const service = createCreditCardUseCases({ creditCards });

  return {
    router: createCreditCardsRouter({ service, ownerProvider }),
    service,
  };
};
