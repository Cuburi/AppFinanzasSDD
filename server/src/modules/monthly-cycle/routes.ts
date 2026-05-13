import { Router } from "express";

import {
  parseClosureActionInput,
  parseDepositToPocketInput,
  parseOpenMonthInput,
  parseRecordExpenseInput,
  parseTemplateInput,
} from "./dto.js";
import {
  DomainError,
  applyClosureAction,
  closeMonth,
  depositToPocket,
  getActiveMonth,
  getClosureReview,
  getTemplate,
  openMonth,
  recordExpense,
  updateTemplate,
} from "./service.js";

const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;

const readMessage = (error: unknown) => (error instanceof Error ? error.message : "Unexpected error.");

export const monthlyCycleRouter = () => {
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
