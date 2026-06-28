import { toPocketView } from "../../domain/pocket.js";
import { PocketNotFoundError } from "../errors/pocket-application-errors.js";
import type { PocketRepository } from "../ports/pocket-repository.port.js";

export const createGetPocketUseCase = ({ pockets }: { pockets: PocketRepository }) => async (id: string) => {
  const pocket = await pockets.findById(id);
  if (!pocket) {
    throw new PocketNotFoundError();
  }

  return toPocketView(pocket);
};
