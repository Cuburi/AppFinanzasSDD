import { type Response, Router } from "express";

import { parseCreateDebtInput, parseRegisterDebtPaymentInput } from "./dto/index.js";
import { toDebtApiView, toDebtListApiResponse } from "./mappers/debt-mappers.js";
import { DomainError, createDebt, listDebts, registerPayment } from "./service.js";

type DebtsService = {
  listDebts: typeof listDebts;
  createDebt: typeof createDebt;
  registerPayment: typeof registerPayment;
};

const defaultService: DebtsService = {
  listDebts,
  createDebt,
  registerPayment,
};

const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;

const readMessage = (error: unknown) => (error instanceof Error ? error.message : "Unexpected error.");

const handleError = (response: Response, error: unknown) => {
  if (isDomainError(error)) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(400).json({ message: readMessage(error) });
};

export const debtsRouter = (service: DebtsService = defaultService) => {
  const router = Router();

  router.get("/debts", async (_request, response) => {
    try {
      const debts = await service.listDebts();
      response.json(toDebtListApiResponse(debts));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.post("/debts", async (request, response) => {
    try {
      const payload = parseCreateDebtInput(request.body);
      const debt = await service.createDebt(payload);
      response.status(201).json(toDebtApiView(debt));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.post("/debts/:id/payments", async (request, response) => {
    try {
      const payload = parseRegisterDebtPaymentInput(request.body);
      const debt = await service.registerPayment(request.params.id, payload);
      response.status(201).json(toDebtApiView(debt));
    } catch (error) {
      handleError(response, error);
    }
  });

  return router;
};
