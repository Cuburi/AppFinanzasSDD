import { Router } from "express";

import {
  type BasicMonthlyReportView,
  type CashSummaryView,
  type ClosureActionInput,
  type ClosureReviewView,
  type CreateMonthCategoryInput,
  type CreateMonthSubcategoryInput,
  type CreateMonthlyIncomeInput,
  type DepositToPocketInput,
  type ExpenseHistoryQueryInput,
  type ExpenseHistoryView,
  type MonthView,
  type OpenMonthInput,
  type RecordExpenseInput,
  type UpdateExpenseInput,
  type UpdateMonthCategoryInput,
  type UpdateMonthSubcategoryInput,
  type UpdateMonthlyIncomeInput,
  type WithdrawCashInput,
  parseCreateMonthlyIncomeInput,
  parseClosureActionInput,
  parseCreateMonthCategoryInput,
  parseCreateMonthSubcategoryInput,
  parseCashSummaryInput,
  parseDepositToPocketInput,
  parseDeleteExpenseInput,
  parseDeleteMonthCategoryInput,
  parseDeleteMonthSubcategoryInput,
  parseExpenseHistoryQueryInput,
  parseBasicReportInput,
  parseOpenMonthInput,
  parseRecordExpenseInput,
  parseTemplateInput,
  parseUpdateExpenseInput,
  parseUpdateMonthCategoryInput,
  parseUpdateMonthlyIncomeInput,
  parseUpdateMonthSubcategoryInput,
  parseWithdrawCashInput,
} from "./dto/index.js";
import type { LifecycleUseCases } from "./application/use-cases/lifecycle-use-cases.js";
import type { MovementUseCases } from "./application/use-cases/movement-use-cases.js";
import type { TemplateUseCases } from "./application/use-cases/template-use-cases.js";
import { DomainError } from "./shared/service-errors.js";

const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;

const readMessage = (error: unknown) => (error instanceof Error ? error.message : "Unexpected error.");

export type TemplateRouteService = TemplateUseCases;
export type LifecycleRouteService = Pick<LifecycleUseCases, "openMonth" | "getActiveMonth"> & {
  closeMonth(monthId: string): Promise<MonthView>;
};
export type MovementRouteService = MovementUseCases;

type CompatibilityRouteService = {
  createMonthCategory(input: CreateMonthCategoryInput): Promise<MonthView>;
  updateMonthCategory(input: UpdateMonthCategoryInput): Promise<MonthView>;
  deleteMonthCategory(monthId: string, categoryId: string): Promise<MonthView>;
  createMonthSubcategory(input: CreateMonthSubcategoryInput): Promise<MonthView>;
  updateMonthSubcategory(input: UpdateMonthSubcategoryInput): Promise<MonthView>;
  deleteMonthSubcategory(monthId: string, subcategoryId: string): Promise<MonthView>;
  listExpenseHistory(input: ExpenseHistoryQueryInput): Promise<ExpenseHistoryView>;
  getBasicReport(monthId: string): Promise<BasicMonthlyReportView>;
  withdrawCash(input: WithdrawCashInput): Promise<{ month: MonthView }>;
  getCashSummary(monthId: string): Promise<CashSummaryView>;
  createMonthlyIncome(input: CreateMonthlyIncomeInput): Promise<MonthView>;
  updateMonthlyIncome(input: UpdateMonthlyIncomeInput): Promise<MonthView>;
  deleteMonthlyIncome(monthId: string, incomeId: string): Promise<MonthView>;
  getClosureReview(monthId: string): Promise<ClosureReviewView>;
  applyClosureAction(input: ClosureActionInput): Promise<ClosureReviewView>;
};

export type MonthlyCycleRouteService = TemplateRouteService & LifecycleRouteService & MovementRouteService & CompatibilityRouteService;

export const createMonthlyCycleRouter = (routeService: Partial<MonthlyCycleRouteService>) => {
  const service = routeService as MonthlyCycleRouteService;
  const router = Router();

  router.get("/template", async (_request, response) => {
    const template = await service.getTemplate();
    response.json(template);
  });

  router.put("/template", async (request, response) => {
    try {
      const payload = parseTemplateInput(request.body);
      const template = await service.updateTemplate(payload);
      response.json(template);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/months/open", async (request, response) => {
    try {
      const payload = parseOpenMonthInput(request.body);
      const month = await service.openMonth(payload);
      response.status(201).json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.get("/months/active", async (_request, response) => {
    const month = await service.getActiveMonth();
    response.json({ month });
  });

  router.post("/months/:id/expenses", async (request, response) => {
    try {
      const payload = parseRecordExpenseInput(request.params.id, request.body);
      const month = await service.recordExpense(payload);
      response.status(201).json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.patch("/months/:id/expenses/:expenseId", async (request, response) => {
    try {
      const payload = parseUpdateExpenseInput(request.params.id, request.params.expenseId, request.body);
      const month = await service.updateExpense(payload);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.delete("/months/:id/expenses/:expenseId", async (request, response) => {
    try {
      const payload = parseDeleteExpenseInput(request.params.id, request.params.expenseId);
      const month = await service.deleteExpense(payload.monthId, payload.expenseId);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/months/:id/categories", async (request, response) => {
    try {
      const payload = parseCreateMonthCategoryInput(request.params.id, request.body);
      const month = await service.createMonthCategory(payload);
      response.status(201).json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.patch("/months/:id/categories/:categoryId", async (request, response) => {
    try {
      const payload = parseUpdateMonthCategoryInput(request.params.id, request.params.categoryId, request.body);
      const month = await service.updateMonthCategory(payload);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.delete("/months/:id/categories/:categoryId", async (request, response) => {
    try {
      const payload = parseDeleteMonthCategoryInput(request.params.id, request.params.categoryId);
      const month = await service.deleteMonthCategory(payload.monthId, payload.categoryId);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/months/:id/categories/:categoryId/subcategories", async (request, response) => {
    try {
      const payload = parseCreateMonthSubcategoryInput(request.params.id, request.params.categoryId, request.body);
      const month = await service.createMonthSubcategory(payload);
      response.status(201).json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.patch("/months/:id/subcategories/:subcategoryId", async (request, response) => {
    try {
      const payload = parseUpdateMonthSubcategoryInput(request.params.id, request.params.subcategoryId, request.body);
      const month = await service.updateMonthSubcategory(payload);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.delete("/months/:id/subcategories/:subcategoryId", async (request, response) => {
    try {
      const payload = parseDeleteMonthSubcategoryInput(request.params.id, request.params.subcategoryId);
      const month = await service.deleteMonthSubcategory(payload.monthId, payload.subcategoryId);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.get("/months/:id/expenses", async (request, response) => {
    try {
      const payload = parseExpenseHistoryQueryInput(request.params.id, request.query);
      const history = await service.listExpenseHistory(payload);
      response.json(history);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.get("/months/:id/reports/basic", async (request, response) => {
    try {
      const payload = parseBasicReportInput(request.params.id);
      const report = await service.getBasicReport(payload.monthId);
      response.json(report);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/months/:id/cash-withdrawals", async (request, response) => {
    try {
      const payload = parseWithdrawCashInput(request.params.id, request.body);
      const result = await service.withdrawCash(payload);
      response.status(201).json(result);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.get("/months/:id/cash", async (request, response) => {
    try {
      const payload = parseCashSummaryInput(request.params.id);
      const summary = await service.getCashSummary(payload.monthId);
      response.json(summary);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/months/:id/incomes", async (request, response) => {
    try {
      const payload = parseCreateMonthlyIncomeInput(request.params.id, request.body);
      const month = await service.createMonthlyIncome(payload);
      response.status(201).json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.patch("/months/:id/incomes/:incomeId", async (request, response) => {
    try {
      const payload = parseUpdateMonthlyIncomeInput(request.params.id, request.params.incomeId, request.body);
      const month = await service.updateMonthlyIncome(payload);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.delete("/months/:id/incomes/:incomeId", async (request, response) => {
    try {
      const month = await service.deleteMonthlyIncome(request.params.id, request.params.incomeId);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/pockets/deposits", async (request, response) => {
    try {
      const payload = parseDepositToPocketInput(request.body);
      const month = await service.depositToPocket(payload);
      response.status(201).json({ month });
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.get("/months/:id/closure-review", async (request, response) => {
    try {
      const review = await service.getClosureReview(request.params.id);
      response.json(review);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/months/:id/closure-actions", async (request, response) => {
    try {
      const payload = parseClosureActionInput(request.params.id, request.body);
      const review = await service.applyClosureAction(payload);
      response.status(201).json(review);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  router.post("/months/:id/close", async (request, response) => {
    try {
      const month = await service.closeMonth(request.params.id);
      response.json(month);
    } catch (error) {
      if (isDomainError(error)) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      response.status(400).json({ message: readMessage(error) });
    }
  });

  return router;
};

export const monthlyCycleRouter = createMonthlyCycleRouter;
