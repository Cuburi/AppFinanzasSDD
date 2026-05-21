import { prisma } from "../../lib/prisma.js";
import {
  type ClosureActionInput,
  type CreateMonthlyIncomeInput,
  type OpenMonthInput,
  type DepositToPocketInput,
  type RecordExpenseInput,
  type TemplateInput,
  type UpdateMonthlyIncomeInput,
} from "./dto/index.js";
import { createClosureService, buildClosureReview } from "./closure-service.js";
import { createIncomeService } from "./income-service.js";
import { createMonthLifecycleService } from "./month-lifecycle-service.js";
import { createMovementService } from "./movement-service.js";
import { createTemplateService } from "./template-service.js";
import type { MonthlyCycleDb } from "./service-types.js";

export { DomainError } from "./service-errors.js";

export const createMonthlyCycleService = (db: MonthlyCycleDb) => {
  const templateService = createTemplateService(db);
  const monthLifecycleService = createMonthLifecycleService(db);
  const movementService = createMovementService(db);
  const incomeService = createIncomeService(db);
  const closureService = createClosureService(db);

  return {
    getTemplate: templateService.getTemplate,
    updateTemplate: templateService.updateTemplate,
    openMonth: monthLifecycleService.openMonth,
    getActiveMonth: monthLifecycleService.getActiveMonth,
    recordExpense: movementService.recordExpense,
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
export const depositToPocket = (input: DepositToPocketInput) => monthlyCycleService.depositToPocket(input);
export const createMonthlyIncome = (input: CreateMonthlyIncomeInput) => monthlyCycleService.createMonthlyIncome(input);
export const updateMonthlyIncome = (input: UpdateMonthlyIncomeInput) => monthlyCycleService.updateMonthlyIncome(input);
export const deleteMonthlyIncome = (monthId: string, incomeId: string) => monthlyCycleService.deleteMonthlyIncome(monthId, incomeId);
export const getClosureReview = (monthId: string) => monthlyCycleService.getClosureReview(monthId);
export const applyClosureAction = (input: ClosureActionInput) => monthlyCycleService.applyClosureAction(input);
export const closeMonth = (monthId: string) => monthlyCycleService.closeMonth(monthId);
