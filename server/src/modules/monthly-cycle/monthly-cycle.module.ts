import { prisma } from "../../lib/prisma.js";
import type { MonthlyCycleService } from "./monthly-cycle.service.js";
import { createMonthlyCycleService } from "./monthly-cycle.service.js";
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
  const templateUseCases = createTemplateUseCases(ports);
  const compatibilityService = createMonthlyCycleService(dependencies, { templateUseCases });
  const service = {
    ...compatibilityService,
    getTemplate: templateUseCases.getTemplate,
    updateTemplate: templateUseCases.updateTemplate,
    ...options.service,
  };

  return {
    router: createMonthlyCycleRouter(service),
    service,
  };
};
