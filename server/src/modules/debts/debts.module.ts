import { prisma } from "../../lib/prisma.js";
import { createCreateDebtUseCase } from "./application/use-cases/create-debt-use-case.js";
import { createListDebtsUseCase } from "./application/use-cases/list-debts-use-case.js";
import { createRegisterDebtPaymentUseCase } from "./application/use-cases/register-debt-payment-use-case.js";
import { createDebtsRouter } from "./http/debts.routes.js";
import { createDebtPrismaRepository } from "./infrastructure/prisma/debt-prisma-repository.js";
import { createPrismaTransactionRunner } from "./infrastructure/prisma/prisma-transaction-runner.js";

type PrismaDebtModuleDb = typeof prisma;

export const createDebtsModule = (db: PrismaDebtModuleDb = prisma) => {
  const debts = createDebtPrismaRepository(db as unknown as Parameters<typeof createDebtPrismaRepository>[0]);
  const transactionRunner = createPrismaTransactionRunner(db as unknown as Parameters<typeof createPrismaTransactionRunner>[0]);

  const service = {
    listDebts: createListDebtsUseCase({ debts }),
    createDebt: createCreateDebtUseCase({ debts }),
    registerPayment: createRegisterDebtPaymentUseCase({ transactionRunner }),
  };

  return {
    router: createDebtsRouter(service),
    service,
  };
};
