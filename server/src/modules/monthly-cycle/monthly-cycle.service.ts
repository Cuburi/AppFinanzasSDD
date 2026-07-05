import { createCashUseCases, type CashUseCases } from "./application/use-cases/cash-use-cases.js";
import { createClosureUseCases, type ClosureUseCases } from "./application/use-cases/closure-use-cases.js";
import { createExpenseHistoryUseCases, type ExpenseHistoryUseCases } from "./application/use-cases/expense-history-use-cases.js";
import { createIncomeUseCases, type IncomeUseCases } from "./application/use-cases/income-use-cases.js";
import { createLifecycleUseCases, type LifecycleUseCases } from "./application/use-cases/lifecycle-use-cases.js";
import { createMovementUseCases, type MovementUseCases } from "./application/use-cases/movement-use-cases.js";
import { createReportsUseCases, type ReportsUseCases } from "./application/use-cases/reports-use-cases.js";
import { createTemplateUseCases, type TemplateUseCases } from "./application/use-cases/template-use-cases.js";
import { createMonthStructureService } from "./workflows/month-structure-service.js";
import type { MonthlyCycleDb } from "./shared/service-types.js";
import { resolveMonthlyCyclePorts, type MonthlyCycleWorkflowDependencies } from "./workflows/workflow-dependencies.js";

type CreateMonthlyCycleServiceOptions = {
  lifecycleUseCases?: LifecycleUseCases;
  movementUseCases?: MovementUseCases;
  templateUseCases?: TemplateUseCases;
  incomeUseCases?: IncomeUseCases;
  cashUseCases?: CashUseCases;
  reportsUseCases?: ReportsUseCases;
  expenseHistoryUseCases?: ExpenseHistoryUseCases;
  closureUseCases?: ClosureUseCases;
};

export const createMonthlyCycleService = (dependencies: MonthlyCycleWorkflowDependencies, options: CreateMonthlyCycleServiceOptions = {}) => {
  const db = dependencies as MonthlyCycleDb;
  const ports = resolveMonthlyCyclePorts(dependencies);
  const lifecycleUseCases = options.lifecycleUseCases ?? createLifecycleUseCases(ports);
  const movementUseCases = options.movementUseCases ?? createMovementUseCases(ports);
  const templateUseCases = options.templateUseCases ?? createTemplateUseCases(ports);
  const incomeUseCases = options.incomeUseCases ?? createIncomeUseCases(ports);
  const cashUseCases = options.cashUseCases ?? createCashUseCases(ports);
  const reportsUseCases = options.reportsUseCases ?? createReportsUseCases(ports);
  const expenseHistoryUseCases = options.expenseHistoryUseCases ?? createExpenseHistoryUseCases(ports);
  const closureUseCases = options.closureUseCases ?? createClosureUseCases(ports);
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
    listExpenseHistory: expenseHistoryUseCases.listExpenseHistory,
    getBasicReport: reportsUseCases.getBasicReport,
    withdrawCash: cashUseCases.withdrawCash,
    getCashSummary: cashUseCases.getCashSummary,
    depositToPocket: movementUseCases.depositToPocket,
    createMonthlyIncome: incomeUseCases.createMonthlyIncome,
    updateMonthlyIncome: incomeUseCases.updateMonthlyIncome,
    deleteMonthlyIncome: incomeUseCases.deleteMonthlyIncome,
    getClosureReview: closureUseCases.getClosureReview,
    applyClosureAction: closureUseCases.applyClosureAction,
    closeMonth: closureUseCases.closeMonth,
  };
};

export type MonthlyCycleService = ReturnType<typeof createMonthlyCycleService>;
