import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, Prisma } from "../../../../lib/prisma-client.js";
import { CLOSURE_USE_CASE_NAMES, createClosureUseCases } from "./closure-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const balancedMonth = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-01T00:00:00.000Z"),
  closedAt: null,
  incomes: [
    {
      id: "income-1",
      monthId: "month-1",
      sourceName: "Salary",
      amount: amount(300),
      receivedAt: new Date("2026-05-01T00:00:00.000Z"),
      notes: null,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  ],
  categories: [
    {
      id: "cat-food",
      name: "Food",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        { id: "sub-market", name: "Market", plannedAmount: amount(100), defaultPocketId: "pocket-food", templateSubcategoryId: null, sortOrder: 0 },
        { id: "sub-rent", name: "Rent", plannedAmount: amount(200), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 1 },
      ],
    },
  ],
  movements: [
    { id: "expense-market", type: MovementType.EXPENSE, amount: amount(100), sourceSubcategoryId: "sub-market", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "expense-rent", type: MovementType.EXPENSE, amount: amount(200), sourceSubcategoryId: "sub-rent", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const surplusMonth = {
  ...balancedMonth,
  movements: [
    { id: "expense-rent", type: MovementType.EXPENSE, amount: amount(200), sourceSubcategoryId: "sub-rent", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const deficitMonth = {
  ...balancedMonth,
  movements: [
    { id: "expense-market", type: MovementType.EXPENSE, amount: amount(150), sourceSubcategoryId: "sub-market", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "expense-rent", type: MovementType.EXPENSE, amount: amount(150), sourceSubcategoryId: "sub-rent", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const createClosurePorts = (month = balancedMonth) => {
  const calls: unknown[] = [];
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
      async close(monthId: string) {
        calls.push(["tx.months.close", monthId]);
        return { ...month, status: MonthStatus.CLOSED, closedAt: new Date("2026-05-31T00:00:00.000Z") };
      },
    },
    movements: {
      async create(args: { type: MovementType; amount: Prisma.Decimal; sourceSubcategoryId?: string | null; targetSubcategoryId?: string | null; sourcePocketId?: string | null; targetPocketId?: string | null }) {
        calls.push([
          "tx.movements.create",
          args.type,
          args.amount.toString(),
          args.sourceSubcategoryId ?? null,
          args.targetSubcategoryId ?? null,
          args.sourcePocketId ?? null,
          args.targetPocketId ?? null,
        ]);
      },
    },
    pockets: {
      async ensurePocketIsActive(pocketId: string, label: string) {
        calls.push(["tx.pockets.ensurePocketIsActive", pocketId, label]);
      },
    },
  };
  const ports = {
    months: {
      async findById(monthId: string) {
        calls.push(["months.findById", monthId]);
        return month;
      },
    },
    templates: {},
    movements: {},
    incomes: {},
    structure: {},
    pockets: {},
    transactionRunner: {
      async run<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push(["transactionRunner.run"]);
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
    },
  } as unknown as MonthlyCyclePorts;

  return { calls, ports };
};

test("closure use cases expose only the closure public surface", () => {
  assert.deepEqual(CLOSURE_USE_CASE_NAMES, ["getClosureReview", "applyClosureAction", "closeMonth"]);
  assert.deepEqual(Object.keys(createClosureUseCases(createClosurePorts().ports)), ["getClosureReview", "applyClosureAction", "closeMonth"]);
});

test("getClosureReview reads the month through the month repository port and reports pending balances", async () => {
  const { calls, ports } = createClosurePorts(surplusMonth);
  const useCases = createClosureUseCases(ports);

  const review = await useCases.getClosureReview("month-1");

  assert.equal(review.monthId, "month-1");
  assert.equal(review.canClose, false);
  assert.deepEqual(review.pendingSurpluses, [
    { subcategoryId: "sub-market", subcategoryName: "Market", amount: 100, defaultPocketId: "pocket-food", requiresPocketSelection: false },
  ]);
  assert.deepEqual(calls, [["months.findById", "month-1"]]);
});

test("applyClosureAction persists surplus and deficit closure movements inside the transaction runner", async () => {
  const { calls, ports } = createClosurePorts(surplusMonth);
  const deficitPorts = createClosurePorts(deficitMonth);
  const useCases = createClosureUseCases(ports);

  const surplusReview = await useCases.applyClosureAction({ monthId: "month-1", type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE, sourceSubcategoryId: "sub-market" });
  const deficitReview = await createClosureUseCases(deficitPorts.ports).applyClosureAction({
    monthId: "month-1",
    type: MovementType.DEFICIT_COVER_FROM_POCKET,
    sourcePocketId: "pocket-safe",
    targetSubcategoryId: "sub-market",
    amount: 25,
  });

  assert.equal(surplusReview.pendingSurpluses.length, 1);
  assert.equal(deficitReview.pendingDeficits.length, 1);
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.pockets.ensurePocketIsActive", "pocket-food", "Target pocket"],
    ["tx.movements.create", "SURPLUS_TO_POCKET_ON_CLOSE", "100", "sub-market", null, null, "pocket-food"],
    ["tx.months.findById", "month-1"],
  ]);
  assert.deepEqual(deficitPorts.calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.pockets.ensurePocketIsActive", "pocket-safe", "Source pocket"],
    ["tx.movements.create", "DEFICIT_COVER_FROM_POCKET", "25", null, "sub-market", "pocket-safe", null],
    ["tx.months.findById", "month-1"],
  ]);
});

test("closeMonth keeps closure validation and month close inside the transaction runner", async () => {
  const { calls, ports } = createClosurePorts();
  const useCases = createClosureUseCases(ports);

  const month = await useCases.closeMonth("month-1");

  assert.equal(month.status, "CLOSED");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.months.close", "month-1"],
  ]);
});
