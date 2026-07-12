import test from "node:test";
import assert from "node:assert/strict";

import { CreditCardValidationError, rehydrateCreditCard, type CreditCard, type NewCreditCard } from "../../domain/credit-card.js";
import type { CreditCardRepository } from "../ports/credit-card-repository.port.js";
import { CreditCardNotFoundError, createCreditCardUseCases } from "./credit-card-use-cases.js";

const buildCard = (id: string, ownerId = "owner-1", name = "Main", active = true): CreditCard =>
  rehydrateCreditCard({ id, ownerId, issuer: "Visa", name, limit: null, closingDay: 15, dueDay: 28, active });

const createRepositoryStub = (initial: CreditCard[] = [buildCard("card-1")]) => {
  const cards = [...initial];
  const calls: unknown[] = [];
  const repository: CreditCardRepository = {
    async findAllByOwner(ownerId, filter) {
      calls.push({ findAllByOwner: { ownerId, filter } });
      return cards.filter((card) => card.ownerId === ownerId && (filter.active === "all" || card.active === filter.active));
    },
    async findByIdForOwner(ownerId, id) {
      calls.push({ findByIdForOwner: { ownerId, id } });
      return cards.find((card) => card.ownerId === ownerId && card.id === id) ?? null;
    },
    async findByNameForOwner(ownerId, name) {
      calls.push({ findByNameForOwner: { ownerId, name } });
      return cards.find((card) => card.ownerId === ownerId && card.name.toLocaleLowerCase() === name.toLocaleLowerCase()) ?? null;
    },
    async create(input: NewCreditCard) {
      calls.push({ create: input });
      const card = buildCard("created", input.ownerId, input.name, input.active);
      cards.push(card);
      return card;
    },
    async update(ownerId, id, input) {
      calls.push({ update: { ownerId, id, input } });
      const existing = cards.find((card) => card.ownerId === ownerId && card.id === id);
      if (!existing) throw new Error("Missing card in stub.");
      const updated = rehydrateCreditCard({ ...existing, ...input });
      cards.splice(cards.indexOf(existing), 1, updated);
      return updated;
    },
  };

  return { repository, calls };
};

test("credit card use cases create, list, and get owner-scoped cards", async () => {
  const { repository, calls } = createRepositoryStub([buildCard("card-1"), buildCard("card-2", "owner-2")]);
  const useCases = createCreditCardUseCases({ creditCards: repository });

  const created = await useCases.createCreditCard("owner-1", { issuer: "Visa", name: "Travel", closingDay: 10, dueDay: 25 });
  const listed = await useCases.listCreditCards("owner-1", { active: true });
  const detail = await useCases.getCreditCard("owner-1", "card-1");

  assert.equal(created.name, "Travel");
  assert.deepEqual(listed.cards.map((card) => card.id), ["card-1", "created"]);
  assert.equal(detail.ownerId, "owner-1");
  assert.equal(calls.some((call) => JSON.stringify(call).includes("owner-2")), false);
});

test("credit card use cases reject duplicate names and another owner's card", async () => {
  const { repository } = createRepositoryStub([buildCard("card-1", "owner-1", "Main"), buildCard("card-2", "owner-2", "Other")]);
  const useCases = createCreditCardUseCases({ creditCards: repository });

  await assert.rejects(
    () => useCases.createCreditCard("owner-1", { issuer: "Visa", name: " main ", closingDay: 10, dueDay: 25 }),
    CreditCardValidationError,
  );
  await assert.rejects(() => useCases.updateCreditCard("owner-1", "card-2", { name: "Renamed" }), CreditCardNotFoundError);
});

test("credit card use cases inactivate and reactivate owned cards", async () => {
  const { repository } = createRepositoryStub([buildCard("card-1", "owner-1", "Main", true)]);
  const useCases = createCreditCardUseCases({ creditCards: repository });

  const inactive = await useCases.inactivateCreditCard("owner-1", "card-1");
  const active = await useCases.activateCreditCard("owner-1", "card-1");

  assert.equal(inactive.active, false);
  assert.equal(active.active, true);
});
