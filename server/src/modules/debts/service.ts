import { prisma } from "../../lib/prisma.js";
import { createDebtWorkflowService } from "./workflows/debt-workflow-service.js";
import type { CreateDebtInput, DebtsDb, RegisterDebtPaymentInput } from "./shared/types.js";

export { DomainError } from "./shared/domain-error.js";

export const createDebtsService = (db: DebtsDb) => {
  const workflowService = createDebtWorkflowService(db);

  return {
    listDebts: workflowService.listDebts,
    createDebt: workflowService.createDebt,
    registerPayment: workflowService.registerPayment,
  };
};

const debtsService = createDebtsService(prisma as unknown as DebtsDb);

export const listDebts = () => debtsService.listDebts();
export const createDebt = (input: CreateDebtInput) => debtsService.createDebt(input);
export const registerPayment = (debtId: string, input: RegisterDebtPaymentInput) => debtsService.registerPayment(debtId, input);
