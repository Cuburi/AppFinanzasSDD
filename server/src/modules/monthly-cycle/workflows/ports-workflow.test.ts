import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../lib/prisma-client.js";

import type { MonthlyCyclePrismaPortSet } from "../infrastructure/prisma/monthly-cycle-prisma-adapters.js";
import { createMovementService } from "./movement-service.js";
import { createMonthLifecycleService } from "./month-lifecycle-service.js";
import { createTemplateService } from "./template-service.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

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

test("template workflow updates through transaction-scoped ports instead of a Prisma-shaped db", async () => {
  const calls: string[] = [];
  const txPorts: MonthlyCyclePrismaPortSet = {
    months: {} as MonthlyCyclePrismaPortSet["months"],
    movements: {} as MonthlyCyclePrismaPortSet["movements"],
    incomes: {},
    structure: {},
    templates: {
      async readCategories() {
        calls.push("templates.readCategories");
        return templateCategories;
      },
      async replaceCategories() {
        calls.push("templates.replaceCategories");
      },
    },
    pockets: {
      async ensurePocketIsActive() {
        calls.push("pockets.ensurePocketIsActive");
      },
      async ensureTemplateDefaultPocketsAreActive() {
        calls.push("pockets.ensureTemplateDefaultPocketsAreActive");
      },
    },
  };
  const service = createTemplateService({
    ...txPorts,
    transactionRunner: {
      async run(work) {
        calls.push("transactionRunner.run");
        return work(txPorts);
      },
    },
  });

  const result = await service.updateTemplate({
    categories: [{ name: "Fixed", subcategories: [{ name: "Rent", plannedAmount: 250, defaultPocketId: "pocket-home" }] }],
  });

  assert.deepEqual(calls, [
    "transactionRunner.run",
    "pockets.ensureTemplateDefaultPocketsAreActive",
    "templates.replaceCategories",
    "templates.readCategories",
  ]);
  assert.deepEqual(result, {
    categories: [
      {
        id: "template-category-1",
        name: "Fixed",
        sortOrder: 0,
        subcategories: [
          { id: "template-subcategory-1", name: "Rent", plannedAmount: 250, defaultPocketId: "pocket-home", active: true, sortOrder: 0 },
        ],
      },
    ],
  });
});

test("movement workflow validates pocket deposits through ports inside the transaction runner", async () => {
  const calls: unknown[] = [];
  const txPorts: MonthlyCyclePrismaPortSet = {
    months: {} as MonthlyCyclePrismaPortSet["months"],
    templates: {} as MonthlyCyclePrismaPortSet["templates"],
    incomes: {},
    structure: {},
    pockets: {
      async ensurePocketIsActive(pocketId, label) {
        calls.push(["pockets.ensurePocketIsActive", pocketId, label]);
      },
      async ensureTemplateDefaultPocketsAreActive() {},
    },
    movements: {
      async findById() {
        return null;
      },
      async create(args) {
        calls.push(["movements.create", args.type, args.amount.toString(), args.targetPocketId]);
      },
      async updateExpense() {},
      async delete() {},
    },
  };
  const service = createMovementService({
    ...txPorts,
    transactionRunner: {
      async run(work) {
        calls.push(["transactionRunner.run"]);
        return work(txPorts);
      },
    },
  });

  const result = await service.depositToPocket({
    amount: 25,
    targetPocketId: "pocket-home",
    externalSourceLabel: "Bonus",
  });

  assert.equal(result, null);
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["pockets.ensurePocketIsActive", "pocket-home", "Target pocket"],
    ["movements.create", "POCKET_DEPOSIT_EXTERNAL", "25", "pocket-home"],
  ]);
});

test("month lifecycle workflow reads active month through the month repository port", async () => {
  const service = createMonthLifecycleService({
    transactionRunner: { async run() {} },
    months: {
      async findActive() {
        return null;
      },
    },
    templates: {},
    movements: {},
    incomes: {},
    structure: {},
    pockets: {},
  } as never);

  assert.equal(await service.getActiveMonth(), null);
});
