import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";
import { createLedgerUseCases } from "./ledger-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const month = {
  id: "month-1", year: 2026, month: 5, status: MonthStatus.CLOSED, openedAt: new Date("2026-05-01T00:00:00.000Z"), closedAt: new Date("2026-06-01T00:00:00.000Z"), categories: [],
  incomes: [{ id: "income-1", monthId: "month-1", sourceName: "Salary", amount: amount(1000), receivedAt: new Date("2026-05-12T00:00:00.000Z"), notes: "May", createdAt: new Date(), updatedAt: new Date() }],
  movements: [
    { id: "expense-cash", type: MovementType.EXPENSE, amount: amount(20), occurredAt: new Date("2026-05-12T00:00:00.000Z"), description: "Groceries", paymentMethod: PaymentMethod.CASH, sourceSubcategoryId: "food", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "deposit-subcategory", type: MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY, amount: amount(30), occurredAt: new Date("2026-05-11T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: "food", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: "pocket-1" },
    { id: "expense-card", type: MovementType.EXPENSE, amount: amount(15), occurredAt: new Date("2026-05-11T00:00:00.000Z"), description: null, paymentMethod: PaymentMethod.NON_CASH, sourceSubcategoryId: "food", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "withdrawal", type: MovementType.CASH_WITHDRAWAL, amount: amount(25), monthId: "month-1", occurredAt: new Date("2026-05-09T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "deposit-available", type: MovementType.POCKET_DEPOSIT_FROM_AVAILABLE, amount: amount(20), monthId: "month-1", occurredAt: new Date("2026-05-08T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: "pocket-1" },
    { id: "external", type: MovementType.POCKET_DEPOSIT_EXTERNAL, amount: amount(40), occurredAt: new Date("2026-05-10T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: "pocket-1" },
    { id: "carryover", type: MovementType.CASH_CARRYOVER_IN, amount: amount(50), occurredAt: new Date("2026-05-01T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "deficit", type: MovementType.DEFICIT_COVER_FROM_POCKET, amount: amount(10), occurredAt: new Date("2026-05-02T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: null, targetSubcategoryId: "food", sourcePocketId: "pocket-1", targetPocketId: null },
    { id: "deficit-subcategory", type: MovementType.DEFICIT_COVER_FROM_SUBCATEGORY, amount: amount(10), occurredAt: new Date("2026-05-03T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: "buffer", targetSubcategoryId: "food", sourcePocketId: null, targetPocketId: null },
    { id: "surplus", type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE, amount: amount(5), occurredAt: new Date("2026-05-04T00:00:00.000Z"), description: null, paymentMethod: null, sourceSubcategoryId: "buffer", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: "pocket-1" },
  ],
};

const createPorts = (record = month) => {
  const calls: string[] = [];
  return {
    calls,
    ports: { ledger: { async read(monthId: string) { calls.push(monthId); return record; } } } as unknown as MonthlyCyclePorts,
  };
};

const contract = (entries: Awaited<ReturnType<ReturnType<typeof createLedgerUseCases>["getMonthlyLedger"]>>["entries"]) =>
  entries.map(({ entryKey, eventType, direction, source, destination, amount, metadata }) => [entryKey, eventType, direction, source.kind, source.id, destination.kind, destination.id, amount, metadata.description, metadata.paymentMethod, metadata.isSystemEvent]);
const balanceEffects = (entries: Awaited<ReturnType<ReturnType<typeof createLedgerUseCases>["getMonthlyLedger"]>>["entries"]) =>
  entries.map(({ eventType, balanceEffects: { availableMoney, cashBalance, subcategoryAvailable, pocketBalance } }) => ({ eventType, availableMoney, cashBalance, subcategoryAvailable, pocketBalance }));

test("getMonthlyLedger returns a closed month projection once, in stable canonical order, without external or system events by default", async () => {
  const { calls, ports } = createPorts();

  const ledger = await createLedgerUseCases(ports).getMonthlyLedger({ monthId: "month-1", includeSystemEvents: false });

  assert.equal(ledger.monthId, "month-1");
  assert.equal(ledger.status, "CLOSED");
  assert.deepEqual(ledger.entries.map((entry) => [entry.entryKey, entry.eventType, entry.direction]), [
    ["income-1", "MONTHLY_INCOME", "INFLOW"],
    ["expense-cash", "CASH_EXPENSE", "OUTFLOW"],
    ["expense-card", "NON_CASH_EXPENSE", "OUTFLOW"], ["deposit-subcategory", "POCKET_DEPOSIT_FROM_SUBCATEGORY", "TRANSFER"], ["withdrawal", "CASH_WITHDRAWAL", "TRANSFER"], ["deposit-available", "POCKET_DEPOSIT_FROM_AVAILABLE", "TRANSFER"],
  ]);
  assert.deepEqual(calls, ["month-1"]);
});

test("getMonthlyLedger includes every system event only when requested and preserves the canonical order", async () => {
  const { ports } = createPorts();

  const ledger = await createLedgerUseCases(ports).getMonthlyLedger({ monthId: "month-1", includeSystemEvents: true });

  assert.deepEqual(contract(ledger.entries), [
    ["income-1", "MONTHLY_INCOME", "INFLOW", "EXTERNAL", null, "MONTH", "month-1", 1000, "May", null, false],
    ["expense-cash", "CASH_EXPENSE", "OUTFLOW", "CASH", null, "EXPENSE", "food", 20, "Groceries", "CASH", false],
    ["expense-card", "NON_CASH_EXPENSE", "OUTFLOW", "SUBCATEGORY", "food", "EXPENSE", null, 15, null, "NON_CASH", false],
    ["deposit-subcategory", "POCKET_DEPOSIT_FROM_SUBCATEGORY", "TRANSFER", "SUBCATEGORY", "food", "POCKET", "pocket-1", 30, null, null, false],
    ["withdrawal", "CASH_WITHDRAWAL", "TRANSFER", "MONTH", "month-1", "CASH", null, 25, null, null, false],
    ["deposit-available", "POCKET_DEPOSIT_FROM_AVAILABLE", "TRANSFER", "MONTH", "month-1", "POCKET", "pocket-1", 20, null, null, false],
    ["surplus", "CLOSURE_SURPLUS", "TRANSFER", "SUBCATEGORY", "buffer", "POCKET", "pocket-1", 5, null, null, true],
    ["deficit-subcategory", "DEFICIT_RESOLUTION", "TRANSFER", "SUBCATEGORY", "buffer", "SUBCATEGORY", "food", 10, null, null, true],
    ["deficit", "DEFICIT_RESOLUTION", "TRANSFER", "POCKET", "pocket-1", "SUBCATEGORY", "food", 10, null, null, true],
    ["carryover", "CASH_CARRYOVER", "TRANSFER", "CASH", null, "CASH", null, 50, null, null, true],
  ]);
  assert.deepEqual(balanceEffects(ledger.entries), [
    { eventType: "MONTHLY_INCOME", availableMoney: 1000, cashBalance: 0, subcategoryAvailable: 0, pocketBalance: 0 }, { eventType: "CASH_EXPENSE", availableMoney: 0, cashBalance: -20, subcategoryAvailable: -20, pocketBalance: 0 }, { eventType: "NON_CASH_EXPENSE", availableMoney: -15, cashBalance: 0, subcategoryAvailable: -15, pocketBalance: 0 }, { eventType: "POCKET_DEPOSIT_FROM_SUBCATEGORY", availableMoney: -30, cashBalance: 0, subcategoryAvailable: -30, pocketBalance: 30 }, { eventType: "CASH_WITHDRAWAL", availableMoney: -25, cashBalance: 25, subcategoryAvailable: 0, pocketBalance: 0 }, { eventType: "POCKET_DEPOSIT_FROM_AVAILABLE", availableMoney: -20, cashBalance: 0, subcategoryAvailable: 0, pocketBalance: 20 }, { eventType: "CLOSURE_SURPLUS", availableMoney: -5, cashBalance: 0, subcategoryAvailable: -5, pocketBalance: 5 }, { eventType: "DEFICIT_RESOLUTION", availableMoney: 0, cashBalance: 0, subcategoryAvailable: 0, pocketBalance: 0 }, { eventType: "DEFICIT_RESOLUTION", availableMoney: 0, cashBalance: 0, subcategoryAvailable: 10, pocketBalance: -10 }, { eventType: "CASH_CARRYOVER", availableMoney: 0, cashBalance: 50, subcategoryAvailable: 0, pocketBalance: 0 },
  ]);
});

test("getMonthlyLedger repeats the same total order and uses entryKey for same-rank timestamp ties", async () => {
  const timestamp = new Date("2026-05-09T00:00:00.000Z");
  const { ports } = createPorts({ ...month, movements: [...month.movements, { ...month.movements[3]!, id: "withdrawal-z", occurredAt: timestamp }, { ...month.movements[3]!, id: "withdrawal-a", occurredAt: timestamp }] });

  const useCases = createLedgerUseCases(ports);
  const [first, second] = await Promise.all([useCases.getMonthlyLedger({ monthId: "month-1", includeSystemEvents: false }), useCases.getMonthlyLedger({ monthId: "month-1", includeSystemEvents: false })]);

  assert.deepEqual(first.entries, second.entries);
  assert.deepEqual(first.entries.map((entry) => entry.entryKey), ["income-1", "expense-cash", "expense-card", "deposit-subcategory", "withdrawal", "withdrawal-a", "withdrawal-z", "deposit-available"]);
});
