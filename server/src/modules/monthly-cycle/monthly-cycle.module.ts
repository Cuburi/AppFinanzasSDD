import { prisma } from "../../lib/prisma.js";
import { createCashUseCases } from "./application/use-cases/cash-use-cases.js";
import { createClosureUseCases } from "./application/use-cases/closure-use-cases.js";
import { createExpenseHistoryUseCases } from "./application/use-cases/expense-history-use-cases.js";
import { createIncomeUseCases } from "./application/use-cases/income-use-cases.js";
import { createLifecycleUseCases } from "./application/use-cases/lifecycle-use-cases.js";
import { createMonthStructureUseCases } from "./application/use-cases/month-structure-use-cases.js";
import { createMovementUseCases } from "./application/use-cases/movement-use-cases.js";
import { createReportsUseCases } from "./application/use-cases/reports-use-cases.js";
import { createTemplateUseCases } from "./application/use-cases/template-use-cases.js";
import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "./infrastructure/prisma/monthly-cycle-prisma-adapters.js";
import { composeMonthlyCycleService, type MonthlyCycleService } from "./monthly-cycle-service-contract.js";
import { createMonthlyCycleRouter } from "./routes.js";
import type { MonthlyCycleDb } from "./shared/service-types.js";

type PrismaMonthlyCycleModuleDb = typeof prisma;

type CreateMonthlyCycleModuleOptions = {
  db?: PrismaMonthlyCycleModuleDb;
  service?: Partial<MonthlyCycleService>;
};

export const createMonthlyCycleModule = (options: CreateMonthlyCycleModuleOptions = {}) => {
  const db = (options.db ?? prisma) as unknown as MonthlyCycleDb;
  const ports = {
    ...createMonthlyCyclePrismaAdapters(db),
    transactionRunner: createMonthlyCyclePrismaTransactionRunner(db),
  };
  const lifecycleUseCases = createLifecycleUseCases(ports);
  const movementUseCases = createMovementUseCases(ports);
  const templateUseCases = createTemplateUseCases(ports);
  const incomeUseCases = createIncomeUseCases(ports);
  const cashUseCases = createCashUseCases(ports);
  const reportsUseCases = createReportsUseCases(ports);
  const expenseHistoryUseCases = createExpenseHistoryUseCases(ports);
  const closureUseCases = createClosureUseCases(ports);
  const monthStructureUseCases = createMonthStructureUseCases(ports);
  const service = {
    ...composeMonthlyCycleService({
      lifecycleUseCases,
      movementUseCases,
      templateUseCases,
      incomeUseCases,
      cashUseCases,
      reportsUseCases,
      expenseHistoryUseCases,
      closureUseCases,
      monthStructureUseCases,
    }),
    ...options.service,
  };

  return {
    router: createMonthlyCycleRouter(service),
    service,
  };
};
