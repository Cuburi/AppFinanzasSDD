import { type Response, Router } from "express";

import { parseCreatePocketInput, parsePocketListFilter, parseUpdatePocketInput } from "./dto.js";
import { DomainError, createPocket, deactivatePocket, getPocket, listPockets, updatePocket } from "./service.js";

type PocketsService = {
  listPockets: typeof listPockets;
  getPocket: typeof getPocket;
  createPocket: typeof createPocket;
  updatePocket: typeof updatePocket;
  deactivatePocket: typeof deactivatePocket;
};

const defaultService: PocketsService = {
  listPockets,
  getPocket,
  createPocket,
  updatePocket,
  deactivatePocket,
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

export const pocketsRouter = (service: PocketsService = defaultService) => {
  const router = Router();

  router.get("/pockets", async (request, response) => {
    try {
      const filter = parsePocketListFilter(request.query.active);
      const pockets = await service.listPockets(filter);
      response.json(pockets);
    } catch (error) {
      handleError(response, error);
    }
  });

  router.get("/pockets/:id", async (request, response) => {
    try {
      const pocket = await service.getPocket(request.params.id);
      response.json(pocket);
    } catch (error) {
      handleError(response, error);
    }
  });

  router.post("/pockets", async (request, response) => {
    try {
      const payload = parseCreatePocketInput(request.body);
      const pocket = await service.createPocket(payload);
      response.status(201).json(pocket);
    } catch (error) {
      handleError(response, error);
    }
  });

  router.patch("/pockets/:id", async (request, response) => {
    try {
      const payload = parseUpdatePocketInput(request.body);
      const pocket = await service.updatePocket(request.params.id, payload);
      response.json(pocket);
    } catch (error) {
      handleError(response, error);
    }
  });

  router.delete("/pockets/:id", async (request, response) => {
    try {
      const pocket = await service.deactivatePocket(request.params.id);
      response.json(pocket);
    } catch (error) {
      handleError(response, error);
    }
  });

  return router;
};
