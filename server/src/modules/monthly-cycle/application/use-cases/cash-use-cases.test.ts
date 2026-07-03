import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";
import { CASH_USE_CASE_NAMES, createCashUseCases } from "./cash-use-cases.js";
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
      amount: amount(500),
      receivedAt: new Date("2026-05-01T00:00:00.000Z"),
      notes: null,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  ],
  categories: [],
  movements: [
    { id: "withdrawal-1", type: MovementType.CASH_WITHDRAWAL, amount: amount(100), occurredAt: new Date("2026-05-05T00:00:00.000Z"), description: "ATM", paymentMethod: null, sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "cash-expense-1", type: MovementType.EXPENSE, amount: amount(25), occurredAt: new Date("2026-05-06T00:00:00.000Z"), description: "Cash groceries", paymentMethod: PaymentMethod.CASH, sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const createCashPorts = () => {
  const calls: unknown[] = [];
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
    },
    movements: {
      async create(args: { type: MovementType; amount: Prisma.Decimal; description?: string | null; occurredAt?: Date; monthId?: string | null }) {
        calls.push(["tx.movements.create", args.type, args.amount.toString(), args.description ?? null, args.occurredAt?.toISOString(), args.monthId ?? null]);
      },
      async findCashLedgerEvents(monthId: string) {
        calls.push(["tx.movements.findCashLedgerEvents", monthId]);
        return month.movements;
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
    movements: {
      async findCashLedgerEvents(monthId: string) {
        calls.push(["movements.findCashLedgerEvents", monthId]);
        return month.movements;
      },
    },
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

test("cash use cases expose only the cash public surface", () => {
  assert.deepEqual(CASH_USE_CASE_NAMES, ["withdrawCash", "getCashSummary"]);
  assert.deepEqual(Object.keys(createCashUseCases(createCashPorts().ports)), ["withdrawCash", "getCashSummary"]);
});

test("withdrawCash persists a cash withdrawal inside the transaction runner and returns the mapped month", async () => {
  const { calls, ports } = createCashPorts();
  const useCases = createCashUseCases(ports);

  const result = await useCases.withdrawCash({ monthId: "month-1", amount: 75, occurredAt: "2026-05-12T00:00:00.000Z", description: "ATM" });

  assert.equal(result.month.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.create", "CASH_WITHDRAWAL", "75", "ATM", "2026-05-12T00:00:00.000Z", "month-1"],
    ["tx.months.findById", "month-1"],
  ]);
});

test("getCashSummary reads the month and cash ledger events through explicit ports", async () => {
  const { calls, ports } = createCashPorts();
  const useCases = createCashUseCases(ports);

  const summary = await useCases.getCashSummary("month-1");

  assert.equal(summary.monthId, "month-1");
  assert.equal(summary.cashBalance, 75);
  assert.deepEqual(summary.events.map((event) => event.id), ["withdrawal-1", "cash-expense-1"]);
  assert.deepEqual(calls, [
    ["months.findById", "month-1"],
    ["movements.findCashLedgerEvents", "month-1"],
  ]);
});
