import { createPocket, normalizePocketName, toPocketView } from "../../domain/pocket.js";
import { DomainError } from "../../domain/pocket-errors.js";
import type { CreatePocketInput } from "../../shared/types.js";
import type { PocketRepository } from "../ports/pocket-repository.port.js";

export const createCreatePocketUseCase = ({ pockets }: { pockets: PocketRepository }) => async (input: CreatePocketInput) => {
  const name = normalizePocketName(input.name);
  const existing = await pockets.findByName(name);
  if (existing) {
    throw new DomainError(409, "A pocket with that name already exists.");
  }

  return toPocketView(await pockets.create(createPocket({ ...input, name })));
};
