import { createCashUseCases, type CashUseCases } from "./application/use-cases/cash-use-cases.js";
import { createClosureUseCases, type ClosureUseCases } from "./application/use-cases/closure-use-cases.js";
import { createExpenseHistoryUseCases, type ExpenseHistoryUseCases } from "./application/use-cases/expense-history-use-cases.js";
import { createIncomeUseCases, type IncomeUseCases } from "./application/use-cases/income-use-cases.js";
import { createLifecycleUseCases, type LifecycleUseCases } from "./application/use-cases/lifecycle-use-cases.js";
import { createMonthStructureUseCases, type MonthStructureUseCases } from "./application/use-cases/month-structure-use-cases.js";
import { createMovementUseCases, type MovementUseCases } from "./application/use-cases/movement-use-cases.js";
import { createReportsUseCases, type ReportsUseCases } from "./application/use-cases/reports-use-cases.js";
import { createTemplateUseCases, type TemplateUseCases } from "./application/use-cases/template-use-cases.js";
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
  monthStructureUseCases?: MonthStructureUseCases;
};

export const createMonthlyCycleService = (dependencies: MonthlyCycleWorkflowDependencies, options: CreateMonthlyCycleServiceOptions = {}) => {
  const ports = resolveMonthlyCyclePorts(dependencies);
  const lifecycleUseCases = options.lifecycleUseCases ?? createLifecycleUseCases(ports);
  const movementUseCases = options.movementUseCases ?? createMovementUseCases(ports);
  const templateUseCases = options.templateUseCases ?? createTemplateUseCases(ports);
  const incomeUseCases = options.incomeUseCases ?? createIncomeUseCases(ports);
  const cashUseCases = options.cashUseCases ?? createCashUseCases(ports);
  const reportsUseCases = options.reportsUseCases ?? createReportsUseCases(ports);
  const expenseHistoryUseCases = options.expenseHistoryUseCases ?? createExpenseHistoryUseCases(ports);
  const closureUseCases = options.closureUseCases ?? createClosureUseCases(ports);
  const monthStructureUseCases = options.monthStructureUseCases ?? createMonthStructureUseCases(ports);

  return {
    getTemplate: templateUseCases.getTemplate,
    updateTemplate: templateUseCases.updateTemplate,
    openMonth: lifecycleUseCases.openMonth,
    getActiveMonth: lifecycleUseCases.getActiveMonth,
    recordExpense: movementUseCases.recordExpense,
    updateExpense: movementUseCases.updateExpense,
    deleteExpense: movementUseCases.deleteExpense,
    createMonthCategory: monthStructureUseCases.createMonthCategory,
    updateMonthCategory: monthStructureUseCases.updateMonthCategory,
    deleteMonthCategory: monthStructureUseCases.deleteMonthCategory,
    createMonthSubcategory: monthStructureUseCases.createMonthSubcategory,
    updateMonthSubcategory: monthStructureUseCases.updateMonthSubcategory,
    deleteMonthSubcategory: monthStructureUseCases.deleteMonthSubcategory,
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
