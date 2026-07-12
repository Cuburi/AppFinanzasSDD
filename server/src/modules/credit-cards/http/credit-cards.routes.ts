import { type Response, Router } from "express";

import { CreditCardNotFoundError } from "../application/use-cases/credit-card-use-cases.js";
import { CreditCardValidationError } from "../domain/credit-card.js";
import type { CreateCreditCardInput, CreditCardListFilter, CreditCardListView, CreditCardView, UpdateCreditCardInput } from "../shared/types.js";
import { parseCreateCreditCardInput, parseCreditCardListFilter, parseUpdateCreditCardInput } from "./credit-cards.schemas.js";

export type CreditCardsHttpService = {
  listCreditCards: (ownerId: string, filter: CreditCardListFilter) => Promise<CreditCardListView>;
  getCreditCard: (ownerId: string, id: string) => Promise<CreditCardView>;
  createCreditCard: (ownerId: string, input: CreateCreditCardInput) => Promise<CreditCardView>;
  updateCreditCard: (ownerId: string, id: string, input: UpdateCreditCardInput) => Promise<CreditCardView>;
  activateCreditCard: (ownerId: string, id: string) => Promise<CreditCardView>;
  inactivateCreditCard: (ownerId: string, id: string) => Promise<CreditCardView>;
};

export type CreditCardOwnerProvider = () => string;

const readMessage = (error: unknown) => (error instanceof Error ? error.message : "Unexpected error.");

const handleError = (response: Response, error: unknown) => {
  if (error instanceof CreditCardNotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }
  if (error instanceof CreditCardValidationError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }
  response.status(400).json({ message: readMessage(error) });
};

export const createCreditCardsRouter = ({ service, ownerProvider }: { service: CreditCardsHttpService; ownerProvider: CreditCardOwnerProvider }) => {
  const router = Router();

  router.get("/credit-cards", async (request, response) => {
    try {
      response.json(await service.listCreditCards(ownerProvider(), parseCreditCardListFilter(request.query.active)));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.get("/credit-cards/:id", async (request, response) => {
    try {
      response.json(await service.getCreditCard(ownerProvider(), request.params.id));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.post("/credit-cards", async (request, response) => {
    try {
      response.status(201).json(await service.createCreditCard(ownerProvider(), parseCreateCreditCardInput(request.body)));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.patch("/credit-cards/:id", async (request, response) => {
    try {
      response.json(await service.updateCreditCard(ownerProvider(), request.params.id, parseUpdateCreditCardInput(request.body)));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.patch("/credit-cards/:id/activate", async (request, response) => {
    try {
      response.json(await service.activateCreditCard(ownerProvider(), request.params.id));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.patch("/credit-cards/:id/inactivate", async (request, response) => {
    try {
      response.json(await service.inactivateCreditCard(ownerProvider(), request.params.id));
    } catch (error) {
      handleError(response, error);
    }
  });

  return router;
};
