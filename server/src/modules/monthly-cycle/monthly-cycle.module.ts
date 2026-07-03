import { prisma } from "../../lib/prisma.js";
import type { MonthlyCycleService } from "./monthly-cycle.service.js";
import { createMonthlyCycleService } from "./monthly-cycle.service.js";
import { createLifecycleUseCases } from "./application/use-cases/lifecycle-use-cases.js";
import { createMovementUseCases } from "./application/use-cases/movement-use-cases.js";
import { createTemplateUseCases } from "./application/use-cases/template-use-cases.js";
import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "./infrastructure/prisma/monthly-cycle-prisma-adapters.js";
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
  const dependencies = Object.assign(db, ports);
  const lifecycleUseCases = createLifecycleUseCases(ports);
  const movementUseCases = createMovementUseCases(ports);
  const templateUseCases = createTemplateUseCases(ports);
  const compatibilityService = createMonthlyCycleService(dependencies, { lifecycleUseCases, movementUseCases, templateUseCases });
  const service = {
    ...compatibilityService,
    openMonth: lifecycleUseCases.openMonth,
    getActiveMonth: lifecycleUseCases.getActiveMonth,
    closeMonth: compatibilityService.closeMonth,
    recordExpense: movementUseCases.recordExpense,
    updateExpense: movementUseCases.updateExpense,
    deleteExpense: movementUseCases.deleteExpense,
    depositToPocket: movementUseCases.depositToPocket,
    getTemplate: templateUseCases.getTemplate,
    updateTemplate: templateUseCases.updateTemplate,
    ...options.service,
  };

  return {
    router: createMonthlyCycleRouter(service),
    service,
  };
};
