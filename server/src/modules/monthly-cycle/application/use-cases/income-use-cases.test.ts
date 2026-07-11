import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, Prisma } from "../../../../lib/prisma-client.js";
import { createIncomeUseCases, INCOME_USE_CASE_NAMES } from "./income-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const month = {
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
      amount: amount(1000),
      receivedAt: new Date("2026-05-10T00:00:00.000Z"),
      notes: null,
      createdAt: new Date("2026-05-10T00:00:00.000Z"),
      updatedAt: new Date("2026-05-10T00:00:00.000Z"),
    },
  ],
  categories: [],
  movements: [],
};

const createIncomePorts = () => {
  const calls: unknown[] = [];
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
    },
    incomes: {
      async findById(incomeId: string) {
        calls.push(["tx.incomes.findById", incomeId]);
        return month.incomes.find((income) => income.id === incomeId) ?? null;
      },
      async create(input: { monthId: string; sourceName: string; amount: Prisma.Decimal; receivedAt: Date; notes: string | null }) {
        calls.push(["tx.incomes.create", input.monthId, input.sourceName, input.amount.toString(), input.receivedAt.toISOString(), input.notes]);
      },
      async update(input: { incomeId: string; amount?: Prisma.Decimal; sourceName?: string }) {
        calls.push(["tx.incomes.update", input.incomeId, input.sourceName ?? null, input.amount?.toString() ?? null]);
      },
      async delete(incomeId: string) {
        calls.push(["tx.incomes.delete", incomeId]);
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

test("income use cases expose only the monthly income public surface", () => {
  assert.deepEqual(INCOME_USE_CASE_NAMES, ["createMonthlyIncome", "updateMonthlyIncome", "deleteMonthlyIncome"]);
  assert.deepEqual(Object.keys(createIncomeUseCases(createIncomePorts().ports)), ["createMonthlyIncome", "updateMonthlyIncome", "deleteMonthlyIncome"]);
});

test("createMonthlyIncome persists income inside the transaction runner and returns the mapped month", async () => {
  const { calls, ports } = createIncomePorts();
  const useCases = createIncomeUseCases(ports);

  const updated = await useCases.createMonthlyIncome({
    monthId: "month-1",
    sourceName: "Bonus",
    amount: 250,
    receivedAt: "2026-05-20T00:00:00.000Z",
    notes: "Quarterly",
  });

  assert.equal(updated.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.incomes.create", "month-1", "Bonus", "250", "2026-05-20T00:00:00.000Z", "Quarterly"],
    ["tx.months.findById", "month-1"],
  ]);
});

test("updateMonthlyIncome and deleteMonthlyIncome operate on transaction-scoped income ownership", async () => {
  const { calls, ports } = createIncomePorts();
  const useCases = createIncomeUseCases(ports);

  const updated = await useCases.updateMonthlyIncome({ monthId: "month-1", incomeId: "income-1", sourceName: "Salary updated", amount: 1200 });
  const deleted = await useCases.deleteMonthlyIncome("month-1", "income-1");

  assert.equal(updated.id, "month-1");
  assert.equal(deleted.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.incomes.findById", "income-1"],
    ["tx.incomes.update", "income-1", "Salary updated", "1200"],
    ["tx.months.findById", "month-1"],
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.incomes.findById", "income-1"],
    ["tx.incomes.delete", "income-1"],
    ["tx.months.findById", "month-1"],
  ]);
});
