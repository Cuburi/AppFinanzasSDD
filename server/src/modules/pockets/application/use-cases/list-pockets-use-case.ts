import { toPocketView } from "../../domain/pocket.js";
import type { PocketListFilter } from "../../shared/types.js";
import type { PocketRepository } from "../ports/pocket-repository.port.js";

export const createListPocketsUseCase = ({ pockets }: { pockets: PocketRepository }) => async (filter: PocketListFilter) => ({
  pockets: (await pockets.findAll(filter)).map(toPocketView),
});
