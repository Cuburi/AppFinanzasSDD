import { createIncomeUseCases, type IncomeUseCases } from "./application/use-cases/income-use-cases.js";
import { createLifecycleUseCases, type LifecycleUseCases } from "./application/use-cases/lifecycle-use-cases.js";
import { createMovementUseCases, type MovementUseCases } from "./application/use-cases/movement-use-cases.js";
import { createTemplateUseCases, type TemplateUseCases } from "./application/use-cases/template-use-cases.js";
import { createCashService } from "./workflows/cash-service.js";
import { createClosureService, buildClosureReview } from "./workflows/closure-service.js";
import { createExpenseHistoryService } from "./workflows/expense-history-service.js";
import { createMonthStructureService } from "./workflows/month-structure-service.js";
import { createReportsService } from "./workflows/reports-service.js";
import type { MonthlyCycleDb } from "./shared/service-types.js";
import { resolveMonthlyCyclePorts, type MonthlyCycleWorkflowDependencies } from "./workflows/workflow-dependencies.js";

type CreateMonthlyCycleServiceOptions = {
  lifecycleUseCases?: LifecycleUseCases;
  movementUseCases?: MovementUseCases;
  templateUseCases?: TemplateUseCases;
  incomeUseCases?: IncomeUseCases;
};

export const createMonthlyCycleService = (dependencies: MonthlyCycleWorkflowDependencies, options: CreateMonthlyCycleServiceOptions = {}) => {
  const db = dependencies as MonthlyCycleDb;
  const ports = resolveMonthlyCyclePorts(dependencies);
  const lifecycleUseCases = options.lifecycleUseCases ?? createLifecycleUseCases(ports);
  const movementUseCases = options.movementUseCases ?? createMovementUseCases(ports);
  const templateUseCases = options.templateUseCases ?? createTemplateUseCases(ports);
  const incomeUseCases = options.incomeUseCases ?? createIncomeUseCases(ports);
  const closureService = createClosureService(db);
  const cashService = createCashService(db);
  const expenseHistoryService = createExpenseHistoryService(db);
  const reportsService = createReportsService(db);
  const monthStructureService = createMonthStructureService(db);

  return {
    getTemplate: templateUseCases.getTemplate,
    updateTemplate: templateUseCases.updateTemplate,
    openMonth: lifecycleUseCases.openMonth,
    getActiveMonth: lifecycleUseCases.getActiveMonth,
    recordExpense: movementUseCases.recordExpense,
    updateExpense: movementUseCases.updateExpense,
    deleteExpense: movementUseCases.deleteExpense,
    createMonthCategory: monthStructureService.createMonthCategory,
    updateMonthCategory: monthStructureService.updateMonthCategory,
    deleteMonthCategory: monthStructureService.deleteMonthCategory,
    createMonthSubcategory: monthStructureService.createMonthSubcategory,
    updateMonthSubcategory: monthStructureService.updateMonthSubcategory,
    deleteMonthSubcategory: monthStructureService.deleteMonthSubcategory,
    listExpenseHistory: expenseHistoryService.listExpenseHistory,
    getBasicReport: reportsService.getBasicReport,
    withdrawCash: cashService.withdrawCash,
    getCashSummary: cashService.getCashSummary,
    depositToPocket: movementUseCases.depositToPocket,
    createMonthlyIncome: incomeUseCases.createMonthlyIncome,
    updateMonthlyIncome: incomeUseCases.updateMonthlyIncome,
    deleteMonthlyIncome: incomeUseCases.deleteMonthlyIncome,
    getClosureReview: closureService.getClosureReview,
    applyClosureAction: closureService.applyClosureAction,
    closeMonth: (monthId: string) => lifecycleUseCases.closeMonth(monthId, buildClosureReview),
  };
};

export type MonthlyCycleService = ReturnType<typeof createMonthlyCycleService>;
