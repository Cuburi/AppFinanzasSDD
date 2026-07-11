import type { CashUseCases } from "./application/use-cases/cash-use-cases.js";
import type { ClosureUseCases } from "./application/use-cases/closure-use-cases.js";
import type { ExpenseHistoryUseCases } from "./application/use-cases/expense-history-use-cases.js";
import type { IncomeUseCases } from "./application/use-cases/income-use-cases.js";
import type { LifecycleUseCases } from "./application/use-cases/lifecycle-use-cases.js";
import type { MonthStructureUseCases } from "./application/use-cases/month-structure-use-cases.js";
import type { MovementUseCases } from "./application/use-cases/movement-use-cases.js";
import type { ReportsUseCases } from "./application/use-cases/reports-use-cases.js";
import type { TemplateUseCases } from "./application/use-cases/template-use-cases.js";

export type MonthlyCycleServiceParts = {
  lifecycleUseCases: LifecycleUseCases;
  movementUseCases: MovementUseCases;
  templateUseCases: TemplateUseCases;
  incomeUseCases: IncomeUseCases;
  cashUseCases: CashUseCases;
  reportsUseCases: ReportsUseCases;
  expenseHistoryUseCases: ExpenseHistoryUseCases;
  closureUseCases: ClosureUseCases;
  monthStructureUseCases: MonthStructureUseCases;
};

export const composeMonthlyCycleService = ({
  lifecycleUseCases,
  movementUseCases,
  templateUseCases,
  incomeUseCases,
  cashUseCases,
  reportsUseCases,
  expenseHistoryUseCases,
  closureUseCases,
  monthStructureUseCases,
}: MonthlyCycleServiceParts) => ({
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
});

export type MonthlyCycleService = ReturnType<typeof composeMonthlyCycleService>;
