import { normalizePocketName, toPocketView } from "../../domain/pocket.js";
import { DomainError } from "../../domain/pocket-errors.js";
import type { UpdatePocketInput } from "../../shared/types.js";
import { PocketNotFoundError } from "../errors/pocket-application-errors.js";
import type { PocketRepository } from "../ports/pocket-repository.port.js";

export const createUpdatePocketUseCase = ({ pockets }: { pockets: PocketRepository }) => async (id: string, input: UpdatePocketInput) => {
  const current = await pockets.findById(id);
  if (!current) {
    throw new PocketNotFoundError();
  }

  if (input.name !== undefined) {
    const normalizedName = normalizePocketName(input.name);
    const existing = await pockets.findByName(normalizedName);
    if (existing && existing.id !== id) {
      throw new DomainError(409, "A pocket with that name already exists.");
    }
  }

  return toPocketView(await pockets.update(id, { ...input, ...(input.name !== undefined ? { name: normalizePocketName(input.name) } : {}) }));
};
