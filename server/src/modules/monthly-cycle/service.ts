import { prisma } from "../../lib/prisma.js";
import {
  type ClosureActionInput,
  type CreateMonthlyIncomeInput,
  type ExpenseHistoryQueryInput,
  type OpenMonthInput,
  type DepositToPocketInput,
  type BasicReportInput,
  type RecordExpenseInput,
  type TemplateInput,
  type UpdateExpenseInput,
  type UpdateMonthCategoryInput,
  type UpdateMonthlyIncomeInput,
  type UpdateMonthSubcategoryInput,
  type WithdrawCashInput,
} from "./dto/index.js";
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

export { DomainError } from "./shared/service-errors.js";

export const createMonthlyCycleService = (db: MonthlyCycleDb) => {
  const templateService = createTemplateService(db);
  const monthLifecycleService = createMonthLifecycleService(db);
  const movementService = createMovementService(db);
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
    updateMonthCategory: monthStructureService.updateMonthCategory,
    deleteMonthCategory: monthStructureService.deleteMonthCategory,
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

const monthlyCycleService = createMonthlyCycleService(prisma as unknown as MonthlyCycleDb);

export const getTemplate = () => monthlyCycleService.getTemplate();
export const updateTemplate = (input: TemplateInput) => monthlyCycleService.updateTemplate(input);
export const openMonth = (input: OpenMonthInput) => monthlyCycleService.openMonth(input);
export const getActiveMonth = () => monthlyCycleService.getActiveMonth();
export const recordExpense = (input: RecordExpenseInput) => monthlyCycleService.recordExpense(input);
export const updateExpense = (input: UpdateExpenseInput) => monthlyCycleService.updateExpense(input);
export const deleteExpense = (monthId: string, expenseId: string) => monthlyCycleService.deleteExpense(monthId, expenseId);
export const updateMonthCategory = (input: UpdateMonthCategoryInput) => monthlyCycleService.updateMonthCategory(input);
export const deleteMonthCategory = (monthId: string, categoryId: string) => monthlyCycleService.deleteMonthCategory(monthId, categoryId);
export const updateMonthSubcategory = (input: UpdateMonthSubcategoryInput) => monthlyCycleService.updateMonthSubcategory(input);
export const deleteMonthSubcategory = (monthId: string, subcategoryId: string) =>
  monthlyCycleService.deleteMonthSubcategory(monthId, subcategoryId);
export const listExpenseHistory = (input: ExpenseHistoryQueryInput) => monthlyCycleService.listExpenseHistory(input);
export const getBasicReport = (monthId: BasicReportInput["monthId"]) => monthlyCycleService.getBasicReport(monthId);
export const withdrawCash = (input: WithdrawCashInput) => monthlyCycleService.withdrawCash(input);
export const getCashSummary = (monthId: string) => monthlyCycleService.getCashSummary(monthId);
export const depositToPocket = (input: DepositToPocketInput) => monthlyCycleService.depositToPocket(input);
export const createMonthlyIncome = (input: CreateMonthlyIncomeInput) => monthlyCycleService.createMonthlyIncome(input);
export const updateMonthlyIncome = (input: UpdateMonthlyIncomeInput) => monthlyCycleService.updateMonthlyIncome(input);
export const deleteMonthlyIncome = (monthId: string, incomeId: string) => monthlyCycleService.deleteMonthlyIncome(monthId, incomeId);
export const getClosureReview = (monthId: string) => monthlyCycleService.getClosureReview(monthId);
export const applyClosureAction = (input: ClosureActionInput) => monthlyCycleService.applyClosureAction(input);
export const closeMonth = (monthId: string) => monthlyCycleService.closeMonth(monthId);
