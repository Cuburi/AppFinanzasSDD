import { toPocketView } from "../../domain/pocket.js";
import { PocketNotFoundError } from "../errors/pocket-application-errors.js";
import type { PocketRepository } from "../ports/pocket-repository.port.js";

export const createDeactivatePocketUseCase = ({ pockets }: { pockets: PocketRepository }) => async (id: string) => {
  const current = await pockets.findById(id);
  if (!current) {
    throw new PocketNotFoundError();
  }

  return toPocketView(await pockets.deactivate(id));
};
