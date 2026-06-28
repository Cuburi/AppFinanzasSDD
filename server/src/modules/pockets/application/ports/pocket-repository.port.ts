import type { Pocket, NewPocket } from "../../domain/pocket.js";
import type { PocketListFilter, UpdatePocketInput } from "../../shared/types.js";

export type PocketRepository = {
  findAll(filter: PocketListFilter): Promise<Pocket[]>;
  findById(id: string): Promise<Pocket | null>;
  findByName(name: string): Promise<Pocket | null>;
  create(input: NewPocket): Promise<Pocket>;
  update(id: string, input: UpdatePocketInput): Promise<Pocket>;
  deactivate(id: string): Promise<Pocket>;
};
