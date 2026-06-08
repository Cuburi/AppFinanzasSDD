import { Router } from "express";

import {
  parseCreateMonthlyIncomeInput,
  parseClosureActionInput,
  parseCashSummaryInput,
  parseDepositToPocketInput,
  parseDeleteExpenseInput,
  parseExpenseHistoryQueryInput,
  parseBasicReportInput,
  parseOpenMonthInput,
  parseRecordExpenseInput,
  parseTemplateInput,
  parseUpdateExpenseInput,
  parseUpdateMonthlyIncomeInput,
  parseWithdrawCashInput,
} from "./dto/index.js";
import {
  DomainError,
  applyClosureAction,
  closeMonth,
  createMonthlyIncome,
  deleteExpense,
  deleteMonthlyIncome,
  depositToPocket,
  getActiveMonth,
  getClosureReview,
  getCashSummary,
  getBasicReport,
  getTemplate,
  listExpenseHistory,
  openMonth,
  recordExpense,
  updateExpense,
  withdrawCash,
  updateMonthlyIncome,
  updateTemplate,
} from "./service.js";

const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;

const readMessage = (error: unknown) => (error instanceof Error ? error.message : "Unexpected error.");

type MonthlyCycleRouteService = {
  getBasicReport(monthId: string): ReturnType<typeof getBasicReport>;
  updateExpense(input: Parameters<typeof updateExpense>[0]): ReturnType<typeof updateExpense>;
  deleteExpense(monthId: string, expenseId: string): ReturnType<typeof deleteExpense>;
};

const defaultMonthlyCycleRouteService: MonthlyCycleRouteService = {
  getBasicReport,
  updateExpense,
  deleteExpense,
};

export const monthlyCycleRouter = (serviceOverrides: Partial<MonthlyCycleRouteService> = {}) => {
  const service = { ...defaultMonthlyCycleRouteService, ...serviceOverrides };
  const router = Router();

  router.get("/template", async (_request, response) => {
    const template = await getTemplate();
    response.json(template);
  });

  router.put("/template", async (request, response) => {
    try {
      const payload = parseTemplateInput(request.body);
      const template = await updateTemplate(payload);
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
      const month = await openMonth(payload);
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
    const month = await getActiveMonth();
    response.json({ month });
  });

  router.post("/months/:id/expenses", async (request, response) => {
    try {
      const payload = parseRecordExpenseInput(request.params.id, request.body);
      const month = await recordExpense(payload);
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

  router.get("/months/:id/expenses", async (request, response) => {
    try {
      const payload = parseExpenseHistoryQueryInput(request.params.id, request.query);
      const history = await listExpenseHistory(payload);
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
      const result = await withdrawCash(payload);
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
      const summary = await getCashSummary(payload.monthId);
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
      const month = await createMonthlyIncome(payload);
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
      const month = await updateMonthlyIncome(payload);
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
      const month = await deleteMonthlyIncome(request.params.id, request.params.incomeId);
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
      const month = await depositToPocket(payload);
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
      const review = await getClosureReview(request.params.id);
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
      const review = await applyClosureAction(payload);
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
      const month = await closeMonth(request.params.id);
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
