import { prisma } from "../../lib/prisma.js";
import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "./infrastructure/prisma/monthly-cycle-prisma-adapters.js";
import { createMonthlyCycleRouter } from "./routes.js";
import { createMonthlyCycleService } from "./service.js";
import type { MonthlyCycleService } from "./service.js";
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
  const baseService = createMonthlyCycleService(dependencies);
  const service = { ...baseService, ...options.service };

  return {
    router: createMonthlyCycleRouter(service),
    service,
  };
};
