import test from "node:test";
import assert from "node:assert/strict";

import { DomainError } from "../../domain/pocket-errors.js";
import { rehydratePocket } from "../../domain/pocket.js";
import type { PocketRepository } from "../ports/pocket-repository.port.js";
import { PocketNotFoundError } from "../errors/pocket-application-errors.js";
import { createCreatePocketUseCase } from "./create-pocket-use-case.js";
import { createDeactivatePocketUseCase } from "./deactivate-pocket-use-case.js";
import { createGetPocketUseCase } from "./get-pocket-use-case.js";
import { createListPocketsUseCase } from "./list-pockets-use-case.js";
import { createUpdatePocketUseCase } from "./update-pocket-use-case.js";

const buildPocket = (id: string, name = "Emergency", active = true) =>
  rehydratePocket({ id, name, goalAmount: null, active, incomingMovements: [], outgoingMovements: [] });

const createRepositoryStub = (initial = [buildPocket("pocket-1")]) => {
  const pockets = [...initial];
  const calls: unknown[] = [];
  const repository: PocketRepository = {
    async findAll(filter) {
      calls.push({ findAll: filter });
      return pockets.filter((pocket) => filter.active === "all" || pocket.active === filter.active);
    },
    async findById(id) {
      calls.push({ findById: id });
      return pockets.find((pocket) => pocket.id === id) ?? null;
    },
    async findByName(name) {
      calls.push({ findByName: name });
      return pockets.find((pocket) => pocket.name.toLocaleLowerCase() === name.toLocaleLowerCase()) ?? null;
    },
    async create(input) {
      calls.push({ create: input });
      const pocket = buildPocket("created", input.name, input.active);
      pockets.push(pocket);
      return pocket;
    },
    async update(id, input) {
      calls.push({ update: { id, input } });
      const existing = pockets.find((pocket) => pocket.id === id);
      if (!existing) throw new Error("Missing pocket in stub.");
      const updated = buildPocket(id, input.name ?? existing.name, input.active ?? existing.active);
      pockets.splice(pockets.indexOf(existing), 1, updated);
      return updated;
    },
    async deactivate(id) {
      calls.push({ deactivate: id });
      const existing = pockets.find((pocket) => pocket.id === id);
      if (!existing) throw new Error("Missing pocket in stub.");
      const updated = buildPocket(id, existing.name, false);
      pockets.splice(pockets.indexOf(existing), 1, updated);
      return updated;
    },
  };

  return { repository, calls };
};

test("list and get pocket use cases return existing compatible view data", async () => {
  const { repository, calls } = createRepositoryStub([buildPocket("active", "Active", true), buildPocket("inactive", "Inactive", false)]);
  const listPockets = createListPocketsUseCase({ pockets: repository });
  const getPocket = createGetPocketUseCase({ pockets: repository });

  const listed = await listPockets({ active: true });
  const detail = await getPocket("active");

  assert.deepEqual(listed.pockets.map((pocket) => pocket.id), ["active"]);
  assert.equal(detail.name, "Active");
  assert.deepEqual(calls.slice(0, 2), [{ findAll: { active: true } }, { findById: "active" }]);
});

test("create and update use cases reject duplicate names case-insensitively", async () => {
  const { repository } = createRepositoryStub([buildPocket("existing", "Emergency")]);
  const createPocket = createCreatePocketUseCase({ pockets: repository });
  const updatePocket = createUpdatePocketUseCase({ pockets: repository });

  await assert.rejects(() => createPocket({ name: " emergency ", goalAmount: null }), (error) => error instanceof DomainError && error.statusCode === 409);
  await assert.rejects(() => updatePocket("missing", { name: "Other" }), (error) => error instanceof PocketNotFoundError);
});

test("update active and deactivate use cases preserve soft-delete semantics", async () => {
  const { repository } = createRepositoryStub([buildPocket("pocket-1", "Emergency", true)]);
  const updatePocket = createUpdatePocketUseCase({ pockets: repository });
  const deactivatePocket = createDeactivatePocketUseCase({ pockets: repository });

  const updated = await updatePocket("pocket-1", { active: false });
  const deactivated = await deactivatePocket("pocket-1");

  assert.equal(updated.active, false);
  assert.equal(deactivated.active, false);
});
