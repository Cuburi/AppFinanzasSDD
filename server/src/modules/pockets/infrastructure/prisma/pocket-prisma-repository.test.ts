import test from "node:test";
import assert from "node:assert/strict";
import { MovementType, Prisma } from "../../../../lib/prisma-client.js";

import { createPocketPrismaRepository } from "./pocket-prisma-repository.js";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

test("pocket Prisma repository preserves include/orderBy and maps balance inputs", async () => {
  const calls: unknown[] = [];
  const db = {
    savingsPocket: {
      async findMany(args: unknown) {
        calls.push(args);
        return [
          {
            id: "pocket-1",
            name: "Emergency",
            goalAmount: money(1000),
            active: true,
            incomingMovements: [{ id: "in-1", type: MovementType.POCKET_DEPOSIT_EXTERNAL, amount: money(125), occurredAt: new Date("2026-05-10T00:00:00.000Z"), description: null, sourcePocketId: null, targetPocketId: "pocket-1" }],
            outgoingMovements: [{ id: "out-1", type: MovementType.DEFICIT_COVER_FROM_POCKET, amount: money(25), occurredAt: new Date("2026-05-11T00:00:00.000Z"), description: null, sourcePocketId: "pocket-1", targetPocketId: null }],
          },
        ];
      },
      async findUnique() {
        throw new Error("Not used.");
      },
      async findFirst() {
        throw new Error("Not used.");
      },
      async create() {
        throw new Error("Not used.");
      },
      async update() {
        throw new Error("Not used.");
      },
    },
  };

  const repository = createPocketPrismaRepository(db as Parameters<typeof createPocketPrismaRepository>[0]);
  const pockets = await repository.findAll({ active: true });

  assert.equal(pockets[0]?.id, "pocket-1");
  assert.equal(pockets[0]?.incomingMovements[0]?.amount, 125);
  assert.deepEqual(calls, [
    {
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        incomingMovements: { orderBy: { occurredAt: "desc" } },
        outgoingMovements: { orderBy: { occurredAt: "desc" } },
      },
    },
  ]);
});

test("pocket Prisma repository normalizes writes and performs case-insensitive name lookup", async () => {
  const calls: unknown[] = [];
  const pocketRecord = { id: "pocket-1", name: "Travel", goalAmount: money(500), active: true, incomingMovements: [], outgoingMovements: [] };
  const db = {
    savingsPocket: {
      async findMany() {
        throw new Error("Not used.");
      },
      async findUnique(args: unknown) {
        calls.push(args);
        return pocketRecord;
      },
      async findFirst(args: unknown) {
        calls.push(args);
        return pocketRecord;
      },
      async create(args: unknown) {
        calls.push(args);
        return pocketRecord;
      },
      async update(args: unknown) {
        calls.push(args);
        return { ...pocketRecord, active: false };
      },
    },
  };

  const repository = createPocketPrismaRepository(db as Parameters<typeof createPocketPrismaRepository>[0]);

  await repository.findByName("Travel");
  await repository.create({ name: "Travel", goalAmount: 500, active: true });
  const deactivated = await repository.deactivate("pocket-1");

  assert.equal(deactivated.active, false);
  assert.deepEqual(calls.map((call) => JSON.stringify(call)), [
    JSON.stringify({ where: { name: { equals: "Travel", mode: "insensitive" } }, include: { incomingMovements: { orderBy: { occurredAt: "desc" } }, outgoingMovements: { orderBy: { occurredAt: "desc" } } } }),
    JSON.stringify({ data: { name: "Travel", goalAmount: money(500), active: true }, include: { incomingMovements: { orderBy: { occurredAt: "desc" } }, outgoingMovements: { orderBy: { occurredAt: "desc" } } } }),
    JSON.stringify({ where: { id: "pocket-1" }, data: { active: false }, include: { incomingMovements: { orderBy: { occurredAt: "desc" } }, outgoingMovements: { orderBy: { occurredAt: "desc" } } } }),
  ]);
});
