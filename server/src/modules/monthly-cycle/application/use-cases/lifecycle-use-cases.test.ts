import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, Prisma } from "../../../../lib/prisma-client.js";
import { createLifecycleUseCases, LIFECYCLE_USE_CASE_NAMES } from "./lifecycle-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const templateCategories = [
  {
    id: "cat-fixed",
    name: "Fixed",
    sortOrder: 0,
    subcategories: [
      {
        id: "sub-rent",
        name: "Rent",
        plannedAmount: amount(250),
        defaultPocketId: "pocket-home",
        active: true,
        sortOrder: 0,
      },
    ],
  },
];

const activeMonth = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-01T00:00:00.000Z"),
  closedAt: null,
  incomes: [],
  categories: [
    {
      id: "cat-fixed-snapshot",
      name: "Fixed",
      sortOrder: 0,
      templateCategoryId: "cat-fixed",
      subcategories: [
        {
          id: "sub-rent-snapshot",
          name: "Rent",
          plannedAmount: amount(250),
          defaultPocketId: "pocket-home",
          templateSubcategoryId: "sub-rent",
          sortOrder: 0,
        },
      ],
    },
  ],
  movements: [],
};

const createLifecyclePorts = () => {
  const calls: string[] = [];
  const txPorts = {
    months: {
      async findActiveSummary(status: MonthStatus) {
        calls.push(`tx.months.findActiveSummary:${status}`);
        return null;
      },
      async findByYearMonth(year: number, month: number) {
        calls.push(`tx.months.findByYearMonth:${year}-${month}`);
        return null;
      },
      async createFromTemplate() {
        calls.push("tx.months.createFromTemplate");
        return activeMonth;
      },
      async findPriorClosedBefore(year: number, month: number) {
        calls.push(`tx.months.findPriorClosedBefore:${year}-${month}`);
        return null;
      },
      async findById(monthId: string) {
        calls.push(`tx.months.findById:${monthId}`);
        return activeMonth;
      },
      async close(monthId: string) {
        calls.push(`tx.months.close:${monthId}`);
        return { ...activeMonth, status: MonthStatus.CLOSED, closedAt: new Date("2026-05-31T00:00:00.000Z") };
      },
    },
    templates: {
      async readCategories() {
        calls.push("tx.templates.readCategories");
        return templateCategories;
      },
    },
    pockets: {
      async ensureTemplateDefaultPocketsAreActive() {
        calls.push("tx.pockets.ensureTemplateDefaultPocketsAreActive");
      },
    },
    movements: {
      async create() {
        calls.push("tx.movements.create");
      },
    },
  };
  const ports = {
    months: {
      async findActive() {
        calls.push("months.findActive");
        return activeMonth;
      },
    },
    templates: {},
    movements: {},
    incomes: {},
    structure: {},
    pockets: {},
    transactionRunner: {
      async run<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push("transactionRunner.run");
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
    },
  } as unknown as MonthlyCyclePorts;

  return { calls, ports };
};

test("lifecycle use cases expose only the month lifecycle public surface", () => {
  assert.deepEqual(LIFECYCLE_USE_CASE_NAMES, ["openMonth", "getActiveMonth", "closeMonth"]);
  assert.deepEqual(Object.keys(createLifecycleUseCases(createLifecyclePorts().ports)), ["openMonth", "getActiveMonth", "closeMonth"]);
});

test("openMonth snapshots template data through transaction-scoped ports", async () => {
  const { calls, ports } = createLifecyclePorts();
  const useCases = createLifecycleUseCases(ports);

  const month = await useCases.openMonth({ year: 2026, month: 5 });

  assert.equal(month.id, "month-1");
  assert.equal(month.categories[0]?.subcategories[0]?.plannedAmount, 250);
  assert.deepEqual(calls, [
    "transactionRunner.run",
    "tx.months.findActiveSummary:ACTIVE",
    "tx.months.findByYearMonth:2026-5",
    "tx.templates.readCategories",
    "tx.pockets.ensureTemplateDefaultPocketsAreActive",
    "tx.months.createFromTemplate",
    "tx.months.findPriorClosedBefore:2026-5",
  ]);
});

test("getActiveMonth and closeMonth keep read and close semantics behind ports", async () => {
  const { calls, ports } = createLifecyclePorts();
  const useCases = createLifecycleUseCases(ports);

  const found = await useCases.getActiveMonth();
  const closed = await useCases.closeMonth("month-1", () => ({
    monthId: "month-1",
    status: MonthStatus.ACTIVE,
    canClose: true,
    pendingSubcategories: [],
    pendingSurpluses: [],
    pendingDeficits: [],
    availableMoney: 0,
    availableMoneyBlocker: null,
  }));

  assert.equal(found?.id, "month-1");
  assert.equal(closed.status, MonthStatus.CLOSED);
  assert.deepEqual(calls, ["months.findActive", "transactionRunner.run", "tx.months.findById:month-1", "tx.months.close:month-1"]);
});
