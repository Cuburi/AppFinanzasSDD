import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "../infrastructure/prisma/monthly-cycle-prisma-adapters.js";
import type { MonthlyCyclePorts } from "../application/ports/monthly-cycle-ports.js";
import type { MonthlyCycleDb } from "../shared/service-types.js";

export type MonthlyCycleWorkflowDependencies = MonthlyCycleDb | MonthlyCyclePorts;

export const isMonthlyCyclePorts = (dependencies: MonthlyCycleWorkflowDependencies): dependencies is MonthlyCyclePorts =>
  "transactionRunner" in dependencies;

export const resolveMonthlyCyclePorts = (dependencies: MonthlyCycleWorkflowDependencies): MonthlyCyclePorts => {
  if (isMonthlyCyclePorts(dependencies)) {
    return dependencies;
  }

  return {
    ...createMonthlyCyclePrismaAdapters(dependencies),
    transactionRunner: createMonthlyCyclePrismaTransactionRunner(dependencies),
  };
};
