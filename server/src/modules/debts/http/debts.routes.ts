import { type Response, Router } from "express";

import { DebtNotFoundError } from "../application/errors/debt-application-errors.js";
import { DomainError } from "../domain/debt-errors.js";
import type { CreateDebtInput, DebtView, RegisterDebtPaymentInput } from "../shared/types.js";
import { parseCreateDebtInput, parseRegisterDebtPaymentInput } from "./debts.schemas.js";
import { toDebtApiView, toDebtListApiResponse } from "./debts.presenter.js";

export type DebtsHttpService = {
  listDebts: () => Promise<DebtView[]>;
  createDebt: (input: CreateDebtInput) => Promise<DebtView>;
  registerPayment: (debtId: string, input: RegisterDebtPaymentInput) => Promise<DebtView>;
};

const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;

const readMessage = (error: unknown) => (error instanceof Error ? error.message : "Unexpected error.");

const handleError = (response: Response, error: unknown) => {
  if (error instanceof DebtNotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }

  if (isDomainError(error)) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(400).json({ message: readMessage(error) });
};

export const createDebtsRouter = (service: DebtsHttpService) => {
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
