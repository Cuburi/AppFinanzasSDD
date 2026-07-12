import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../../../../lib/prisma-client.js";

import { createCreditCardPrismaRepository } from "./credit-card-prisma-repository.js";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

const creditCardRecord = {
  id: "card-1",
  ownerId: "owner-1",
  issuer: "Visa",
  name: "Main",
  limit: money(1234.56),
  closingDay: 15,
  dueDay: 28,
  active: true,
};

test("credit card Prisma repository maps Decimal limits on reads and writes", async () => {
  const calls: unknown[] = [];
  const db = {
    creditCard: {
      async findMany(args: unknown) {
        calls.push(args);
        return [creditCardRecord];
      },
      async findFirst() {
        throw new Error("Not used.");
      },
      async create(args: unknown) {
        calls.push(args);
        return creditCardRecord;
      },
      async update() {
        throw new Error("Not used.");
      },
    },
  };

  const repository = createCreditCardPrismaRepository(db as Parameters<typeof createCreditCardPrismaRepository>[0]);
  const cards = await repository.findAllByOwner("owner-1", { active: true });
  await repository.create({ ownerId: "owner-1", issuer: "Visa", name: "Main", limit: 1234.56, closingDay: 15, dueDay: 28, active: true });

  assert.equal(cards[0]?.limit, 1234.56);
  assert.deepEqual(calls[0], { where: { ownerId: "owner-1", active: true }, orderBy: { name: "asc" } });
  assert.equal((calls[1] as { data: { limit: Prisma.Decimal } }).data.limit.toString(), "1234.56");
});

test("credit card Prisma repository keeps lookup and update operations owner-scoped", async () => {
  const calls: unknown[] = [];
  const db = {
    creditCard: {
      async findMany() {
        throw new Error("Not used.");
      },
      async findFirst(args: unknown) {
        calls.push(args);
        return creditCardRecord;
      },
      async create() {
        throw new Error("Not used.");
      },
      async update(args: unknown) {
        calls.push(args);
        return { ...creditCardRecord, limit: null, name: "Updated" };
      },
    },
  };

  const repository = createCreditCardPrismaRepository(db as Parameters<typeof createCreditCardPrismaRepository>[0]);
  const found = await repository.findByNameForOwner("owner-1", "MAIN");
  const updated = await repository.update("owner-1", "card-1", { name: "Updated", limit: null });

  assert.equal(found?.id, "card-1");
  assert.deepEqual(updated, { ...creditCardRecord, limit: null, name: "Updated" });
  assert.deepEqual(calls, [
    { where: { ownerId: "owner-1", name: { equals: "MAIN", mode: "insensitive" } } },
    { where: { ownerId: "owner-1", id: "card-1" } },
    { where: { id: "card-1" }, data: { name: "Updated", limit: null } },
  ]);
});

test("credit card Prisma repository rejects updates outside the owner scope before writing", async () => {
  const calls: unknown[] = [];
  const db = {
    creditCard: {
      async findMany() {
        throw new Error("Not used.");
      },
      async findFirst(args: unknown) {
        calls.push(args);
        return null;
      },
      async create() {
        throw new Error("Not used.");
      },
      async update() {
        throw new Error("Should not update another owner's card.");
      },
    },
  };

  const repository = createCreditCardPrismaRepository(db as Parameters<typeof createCreditCardPrismaRepository>[0]);

  await assert.rejects(() => repository.update("owner-2", "card-1", { name: "Blocked" }), /not found/i);
  assert.deepEqual(calls, [{ where: { ownerId: "owner-2", id: "card-1" } }]);
});
