import assert from "node:assert/strict";
import test from "node:test";
import { MonthStatus, Prisma } from "../../../../lib/prisma-client.js";

import { DomainError } from "../../shared/service-errors.js";
import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "./monthly-cycle-prisma-adapters.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

test("monthly-cycle Prisma adapters expose template reads and pocket validation through explicit ports", async () => {
  const templateCategories = [
    {
      id: "template-category-1",
      name: "Fixed",
      sortOrder: 0,
      subcategories: [
        {
          id: "template-subcategory-1",
          name: "Rent",
          plannedAmount: amount(250),
          defaultPocketId: "pocket-home",
          active: true,
          sortOrder: 0,
        },
      ],
    },
  ];
  const calls: unknown[] = [];
  const db: any = {
    templateCategory: {
      async findMany(args: unknown) {
        calls.push(args);
        return templateCategories;
      },
    },
    savingsPocket: {
      async findUnique(args: unknown) {
        calls.push(args);
        return { id: "pocket-home", active: true };
      },
    },
  };

  const ports = createMonthlyCyclePrismaAdapters(db);

  assert.deepEqual(await ports.templates.readCategories(), templateCategories);
  await ports.pockets.ensurePocketIsActive("pocket-home", "Default pocket");
  assert.deepEqual(calls, [
    { orderBy: { sortOrder: "asc" }, include: { subcategories: { orderBy: { sortOrder: "asc" } } } },
    { where: { id: "pocket-home" }, select: { id: true, active: true } },
  ]);
});

test("monthly-cycle Prisma pocket validation preserves existing domain error semantics", async () => {
  const db: any = {
    savingsPocket: {
      async findUnique() {
        return { id: "pocket-home", active: false };
      },
    },
  };
  const ports = createMonthlyCyclePrismaAdapters(db);

  await assert.rejects(() => ports.pockets.ensurePocketIsActive("pocket-home", "Target pocket"), {
    name: "DomainError",
    statusCode: 400,
    message: "Target pocket must exist and be active.",
  } as DomainError);
});

test("monthly-cycle transaction runner preserves default Prisma transaction options and binds tx ports", async () => {
  const transactionCalls: unknown[] = [];
  const tx: any = {
    month: {
      async findFirst() {
        return { id: "month-1", year: 2026, month: 5 };
      },
    },
    savingsPocket: {
      async findUnique() {
        return { id: "pocket-home", active: true };
      },
    },
  };
  const db: any = {
    async $transaction<T>(work: (txClient: typeof tx) => Promise<T>, options?: unknown) {
      transactionCalls.push(options);
      return work(tx);
    },
  };

  const runner = createMonthlyCyclePrismaTransactionRunner(db);
  const result = await runner.run(async (ports) => {
    await ports.pockets.ensurePocketIsActive("pocket-home", "Target pocket");
    return ports.months.findActiveSummary(MonthStatus.ACTIVE);
  });

  assert.deepEqual(transactionCalls, [undefined]);
  assert.deepEqual(result, { id: "month-1", year: 2026, month: 5 });
});
