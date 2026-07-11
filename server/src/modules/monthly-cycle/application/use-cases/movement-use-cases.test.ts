import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";
import { createMovementUseCases, MOVEMENT_USE_CASE_NAMES } from "./movement-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-01T00:00:00.000Z"),
  closedAt: null,
  incomes: [],
  categories: [
    {
      id: "cat-food",
      name: "Food",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        { id: "sub-market", name: "Market", plannedAmount: amount(250), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 0 },
      ],
    },
  ],
  movements: [],
};

const createMovementPorts = () => {
  const calls: unknown[] = [];
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
    },
    movements: {
      async findById(movementId: string) {
        calls.push(["tx.movements.findById", movementId]);
        return { id: movementId, type: MovementType.EXPENSE, monthId: month.id };
      },
      async create(args: { type: MovementType; amount: Prisma.Decimal; targetPocketId?: string | null }) {
        calls.push(["tx.movements.create", args.type, args.amount.toString(), args.targetPocketId ?? null]);
      },
      async updateExpense(input: { expenseId: string; amount: Prisma.Decimal }) {
        calls.push(["tx.movements.updateExpense", input.expenseId, input.amount.toString()]);
      },
      async delete(movementId: string) {
        calls.push(["tx.movements.delete", movementId]);
      },
    },
    pockets: {
      async ensurePocketIsActive(pocketId: string, label: string) {
        calls.push(["tx.pockets.ensurePocketIsActive", pocketId, label]);
      },
    },
  };
  const ports = {
    months: {},
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

test("movement use cases expose only the expense and pocket-deposit public surface", () => {
  assert.deepEqual(MOVEMENT_USE_CASE_NAMES, ["recordExpense", "updateExpense", "deleteExpense", "depositToPocket"]);
  assert.deepEqual(Object.keys(createMovementUseCases(createMovementPorts().ports)), ["recordExpense", "updateExpense", "deleteExpense", "depositToPocket"]);
});

test("recordExpense persists an expense inside the transaction runner and returns the mapped month", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.recordExpense({
    monthId: "month-1",
    sourceSubcategoryId: "sub-market",
    amount: 75,
    description: "Market",
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });

  assert.equal(updated.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.create", "EXPENSE", "75", null],
    ["tx.months.findById", "month-1"],
  ]);
});

test("updateExpense and deleteExpense operate on the transaction-scoped expense ledger", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.updateExpense({
    monthId: "month-1",
    expenseId: "expense-1",
    sourceSubcategoryId: "sub-market",
    amount: 90,
    occurredAt: "2026-05-11T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });
  const deleted = await useCases.deleteExpense("month-1", "expense-1");

  assert.equal(updated.id, "month-1");
  assert.equal(deleted.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.findById", "expense-1"],
    ["tx.movements.updateExpense", "expense-1", "90"],
    ["tx.months.findById", "month-1"],
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.findById", "expense-1"],
    ["tx.movements.delete", "expense-1"],
    ["tx.months.findById", "month-1"],
  ]);
});

test("depositToPocket validates the target pocket and preserves the external deposit response", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.depositToPocket({ amount: 25, targetPocketId: "pocket-safe", externalSourceLabel: "Bonus" });

  assert.equal(updated, null);
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.pockets.ensurePocketIsActive", "pocket-safe", "Target pocket"],
    ["tx.movements.create", "POCKET_DEPOSIT_EXTERNAL", "25", "pocket-safe"],
  ]);
});
