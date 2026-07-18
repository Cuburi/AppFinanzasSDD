import test from "node:test";
import assert from "node:assert/strict";

import { MovementType } from "../../../../lib/prisma-client.js";
import { createCreditCardMovementSummaryPrismaAdapter } from "./credit-card-movement-summary-prisma-adapter.js";

test("credit card movement summary adapter sums only owned expense movements for one card window", async () => {
  const calls: unknown[] = [];
  const db = {
    movement: {
      async aggregate(args: unknown) {
        calls.push(args);
        return { _sum: { amount: { toString: () => "123.45" } } };
      },
    },
  };

  const adapter = createCreditCardMovementSummaryPrismaAdapter(db as Parameters<typeof createCreditCardMovementSummaryPrismaAdapter>[0]);
  const total = await adapter.sumExpensesByCardInWindow({
    ownerId: "owner-1",
    creditCardId: "card-1",
    from: new Date("2026-06-16T00:00:00.000Z"),
    to: new Date("2026-07-15T23:59:59.999Z"),
  });

  assert.equal(total, 123.45);
  assert.deepEqual(calls, [
    {
      where: {
        type: MovementType.EXPENSE,
        creditCardId: "card-1",
        creditCard: { ownerId: "owner-1" },
        occurredAt: { gte: new Date("2026-06-16T00:00:00.000Z"), lte: new Date("2026-07-15T23:59:59.999Z") },
      },
      _sum: { amount: true },
    },
  ]);
});

test("credit card movement summary adapter returns zero when no expense total exists", async () => {
  const db = {
    movement: {
      async aggregate() {
        return { _sum: { amount: null } };
      },
    },
  };

  const adapter = createCreditCardMovementSummaryPrismaAdapter(db as Parameters<typeof createCreditCardMovementSummaryPrismaAdapter>[0]);

  assert.equal(
    await adapter.sumExpensesByCardInWindow({ ownerId: "owner-1", creditCardId: "card-1", from: new Date("2026-01-01T00:00:00.000Z"), to: new Date("2026-01-31T23:59:59.999Z") }),
    0,
  );
});

test("credit card movement summary adapter keeps each split window isolated by owner, card, and expense date", async () => {
  const calls: unknown[] = [];
  const db = {
    movement: {
      async aggregate(args: unknown) {
        calls.push(args);
        return { _sum: { amount: null } };
      },
    },
  };
  const adapter = createCreditCardMovementSummaryPrismaAdapter(db as Parameters<typeof createCreditCardMovementSummaryPrismaAdapter>[0]);

  await adapter.sumExpensesByCardInWindow({ ownerId: "owner-1", creditCardId: "card-1", from: new Date("2026-06-16T00:00:00.000Z"), to: new Date("2026-07-15T23:59:59.999Z") });
  await adapter.sumExpensesByCardInWindow({ ownerId: "owner-1", creditCardId: "card-1", from: new Date("2026-07-16T00:00:00.000Z"), to: new Date("2026-08-15T23:59:59.999Z") });

  assert.deepEqual(calls, [
    {
      where: {
        type: MovementType.EXPENSE,
        creditCardId: "card-1",
        creditCard: { ownerId: "owner-1" },
        occurredAt: { gte: new Date("2026-06-16T00:00:00.000Z"), lte: new Date("2026-07-15T23:59:59.999Z") },
      },
      _sum: { amount: true },
    },
    {
      where: {
        type: MovementType.EXPENSE,
        creditCardId: "card-1",
        creditCard: { ownerId: "owner-1" },
        occurredAt: { gte: new Date("2026-07-16T00:00:00.000Z"), lte: new Date("2026-08-15T23:59:59.999Z") },
      },
      _sum: { amount: true },
    },
  ]);
});
