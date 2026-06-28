import { type Response, Router } from "express";

import { PocketNotFoundError } from "../application/errors/pocket-application-errors.js";
import { DomainError } from "../domain/pocket-errors.js";
import type { CreatePocketInput, PocketListFilter, PocketListView, SavingsPocketView, UpdatePocketInput } from "../shared/types.js";
import { toPocketApiView, toPocketListApiResponse } from "./pockets.presenter.js";
import { parseCreatePocketInput, parsePocketListFilter, parseUpdatePocketInput } from "./pockets.schemas.js";

export type PocketsHttpService = {
  listPockets: (filter: PocketListFilter) => Promise<PocketListView>;
  getPocket: (id: string) => Promise<SavingsPocketView>;
  createPocket: (input: CreatePocketInput) => Promise<SavingsPocketView>;
  updatePocket: (id: string, input: UpdatePocketInput) => Promise<SavingsPocketView>;
  deactivatePocket: (id: string) => Promise<SavingsPocketView>;
};

const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;

const readMessage = (error: unknown) => (error instanceof Error ? error.message : "Unexpected error.");

const handleError = (response: Response, error: unknown) => {
  if (error instanceof PocketNotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }

  if (isDomainError(error)) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(400).json({ message: readMessage(error) });
};

export const createPocketsRouter = (service: PocketsHttpService) => {
  const router = Router();

  router.get("/pockets", async (request, response) => {
    try {
      const filter = parsePocketListFilter(request.query.active);
      response.json(toPocketListApiResponse(await service.listPockets(filter)));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.get("/pockets/:id", async (request, response) => {
    try {
      response.json(toPocketApiView(await service.getPocket(request.params.id)));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.post("/pockets", async (request, response) => {
    try {
      const payload = parseCreatePocketInput(request.body);
      response.status(201).json(toPocketApiView(await service.createPocket(payload)));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.patch("/pockets/:id", async (request, response) => {
    try {
      const payload = parseUpdatePocketInput(request.body);
      response.json(toPocketApiView(await service.updatePocket(request.params.id, payload)));
    } catch (error) {
      handleError(response, error);
    }
  });

  router.delete("/pockets/:id", async (request, response) => {
    try {
      response.json(toPocketApiView(await service.deactivatePocket(request.params.id)));
    } catch (error) {
      handleError(response, error);
    }
  });

  return router;
};
