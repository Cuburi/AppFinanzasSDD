import { createCashService } from "./workflows/cash-service.js";
import { createClosureService, buildClosureReview } from "./workflows/closure-service.js";
import { createExpenseHistoryService } from "./workflows/expense-history-service.js";
import { createIncomeService } from "./workflows/income-service.js";
import { createMonthLifecycleService } from "./workflows/month-lifecycle-service.js";
import { createMonthStructureService } from "./workflows/month-structure-service.js";
import { createMovementService } from "./workflows/movement-service.js";
import { createReportsService } from "./workflows/reports-service.js";
import { createTemplateService } from "./workflows/template-service.js";
import type { MonthlyCycleDb } from "./shared/service-types.js";
import type { MonthlyCycleWorkflowDependencies } from "./workflows/workflow-dependencies.js";

export const createMonthlyCycleService = (dependencies: MonthlyCycleWorkflowDependencies) => {
  const db = dependencies as MonthlyCycleDb;
  const templateService = createTemplateService(dependencies);
  const monthLifecycleService = createMonthLifecycleService(dependencies);
  const movementService = createMovementService(dependencies);
  const incomeService = createIncomeService(db);
  const closureService = createClosureService(db);
  const cashService = createCashService(db);
  const expenseHistoryService = createExpenseHistoryService(db);
  const reportsService = createReportsService(db);
  const monthStructureService = createMonthStructureService(db);

  return {
    getTemplate: templateService.getTemplate,
    updateTemplate: templateService.updateTemplate,
    openMonth: monthLifecycleService.openMonth,
    getActiveMonth: monthLifecycleService.getActiveMonth,
    recordExpense: movementService.recordExpense,
    updateExpense: movementService.updateExpense,
    deleteExpense: movementService.deleteExpense,
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
    depositToPocket: movementService.depositToPocket,
    createMonthlyIncome: incomeService.createMonthlyIncome,
    updateMonthlyIncome: incomeService.updateMonthlyIncome,
    deleteMonthlyIncome: incomeService.deleteMonthlyIncome,
    getClosureReview: closureService.getClosureReview,
    applyClosureAction: closureService.applyClosureAction,
    closeMonth: (monthId: string) => monthLifecycleService.closeMonth(monthId, buildClosureReview),
  };
};

export type MonthlyCycleService = ReturnType<typeof createMonthlyCycleService>;
