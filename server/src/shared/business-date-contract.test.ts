import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { createMonthlyCycleRouter } from "../modules/monthly-cycle/routes.js";
import { Prisma } from "../lib/prisma-client.js";
import { createMovementUseCases } from "../modules/monthly-cycle/application/use-cases/movement-use-cases.js";
import { createIncomeUseCases } from "../modules/monthly-cycle/application/use-cases/income-use-cases.js";
import { createCashUseCases } from "../modules/monthly-cycle/application/use-cases/cash-use-cases.js";
import { createClosureUseCases } from "../modules/monthly-cycle/application/use-cases/closure-use-cases.js";
import { createMonthLifecycleService } from "../modules/monthly-cycle/workflows/month-lifecycle-service.js";
import type { MonthlyCyclePorts } from "../modules/monthly-cycle/application/ports/monthly-cycle-ports.js";
import type { MonthRecord } from "../modules/monthly-cycle/shared/service-types.js";
import { mapMonthlyLedger } from "../modules/monthly-cycle/mappers/ledger-mappers.js";
import { toDebtView, rehydrateDebt } from "../modules/debts/domain/debt.js";
import { rehydratePocket, toPocketView } from "../modules/pockets/domain/pocket.js";
import { calculateStatementCycle } from "../modules/credit-cards/domain/statement-cycle.js";
import { createCreditCardMovementSummaryPrismaAdapter } from "../modules/credit-cards/infrastructure/prisma/credit-card-movement-summary-prisma-adapter.js";
import { businessDateToPrisma, todayInBogota } from "./business-date.js";

const money = (value: number) => new Prisma.Decimal(value);
const instant = new Date("2026-11-01T04:00:00.000Z");
const fixture = () => {
  const month: MonthRecord = {
    id: "october", year: 2026, month: 10, status: "ACTIVE", openedAt: instant, closedAt: null,
    incomes: [{ id: "income", monthId: "october", sourceName: "Salary", amount: money(1000), receivedAt: businessDateToPrisma("2026-10-01"), notes: null, createdAt: instant, updatedAt: instant }],
    categories: [{ id: "category", name: "General", sortOrder: 0, templateCategoryId: null, subcategories: [
      { id: "source", name: "Source", plannedAmount: money(100), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 0 },
      { id: "target", name: "Target", plannedAmount: money(100), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 1 },
    ] }], movements: [],
  };
  let writes = 0;
  const records: Array<{ occurredAt?: Date }> = [];
  const tx = {
    months: { findById: async () => month, lockForMutation: async () => month },
    movements: {
      create: async (input: Parameters<MonthlyCyclePorts["movements"]["create"]>[0]) => {
        writes++;
        records.push(input);
        month.movements.push({ ...input, id: `movement-${writes}`, createdAt: instant, sourceSubcategoryId: input.sourceSubcategoryId ?? null, targetSubcategoryId: input.targetSubcategoryId ?? null, sourcePocketId: input.sourcePocketId ?? null, targetPocketId: input.targetPocketId ?? null });
      },
      findById: async (id: string) => month.movements.find((movement) => movement.id === id) ?? null,
      updateExpense: async (input: Parameters<MonthlyCyclePorts["movements"]["updateExpense"]>[0]) => {
        writes++;
        Object.assign(month.movements.find((movement) => movement.id === input.expenseId)!, input);
      },
    },
    incomes: {
      findById: async () => month.incomes![0],
      create: async (input: Parameters<MonthlyCyclePorts["incomes"]["create"]>[0]) => { writes++; month.incomes!.push({ ...input, id: `income-${writes}`, createdAt: instant, updatedAt: instant }); },
      update: async (input: Parameters<MonthlyCyclePorts["incomes"]["update"]>[0]) => { writes++; Object.assign(month.incomes![0]!, input); },
    },
    pockets: { ensurePocketIsActive: async () => {}, getBalance: async () => 1000 },
    depositWriterGate: { isEnabled: async () => true },
  } as unknown as Omit<MonthlyCyclePorts, "transactionRunner">;
  const ports = { ...tx, transactionRunner: {
    run: async <T>(work: (ports: typeof tx) => Promise<T>) => work(tx),
    runSerializable: async <T>(work: (ports: typeof tx) => Promise<T>) => work(tx),
  } } as MonthlyCyclePorts;
  return { month, ports, records, writes: () => writes };
};

test("October expense, income, cash and month-funded deposits accept day 31 and reject November without writes", async () => {
  for (const kind of ["expense", "income", "cash", "deposit"] as const) {
    const { month, ports, writes, records } = fixture();
    const movements = createMovementUseCases(ports);
    const incomes = createIncomeUseCases(ports);
    const cash = createCashUseCases(ports);
    const create = (day: string) => {
      switch (kind) {
        case "expense": return movements.recordExpense({ monthId: month.id, sourceSubcategoryId: null, amount: 1, occurredAt: day, paymentMethod: "NON_CASH" });
        case "income": return incomes.createMonthlyIncome({ monthId: month.id, sourceName: "Bonus", amount: 1, receivedAt: day });
        case "cash": return cash.withdrawCash({ monthId: month.id, amount: 1, occurredAt: day });
        case "deposit": return movements.depositToPocket({ sourceKind: "MONTH_AVAILABLE", monthId: month.id, targetPocketId: "pocket", amount: 1, occurredAt: day });
      }
    };
    await create("2026-10-31");
    assert.equal(writes(), 1, kind);
    const before = JSON.stringify(month);
    await assert.rejects(() => create("2026-11-01"), { statusCode: 400 });
    await assert.rejects(() => create("2026-10-31T20:00:00.000-05:00"), /YYYY-MM-DD/);
    assert.equal(writes(), 1, kind);
    assert.equal(JSON.stringify(month), before, kind);
    if (kind === "income") {
      assert.equal((await incomes.updateMonthlyIncome({ monthId: month.id, incomeId: "income", receivedAt: "2026-10-31" })).incomes[0]!.receivedAt, "2026-10-31");
      const snapshot = JSON.stringify(month);
      await assert.rejects(() => incomes.updateMonthlyIncome({ monthId: month.id, incomeId: "income", receivedAt: "2026-11-01" }), { statusCode: 400 });
      assert.equal(JSON.stringify(month), snapshot);
      assert.equal(writes(), 2);
    } else {
      assert.equal(records[0]!.occurredAt!.toISOString(), "2026-10-31T00:00:00.000Z");
    }
    if (kind === "expense") {
      await movements.updateExpense({ monthId: month.id, expenseId: "movement-1", sourceSubcategoryId: null, amount: 2, occurredAt: "2026-10-31", paymentMethod: "NON_CASH" });
      const snapshot = JSON.stringify(month);
      await assert.rejects(() => movements.updateExpense({ monthId: month.id, expenseId: "movement-1", sourceSubcategoryId: null, amount: 3, occurredAt: "2026-11-01", paymentMethod: "NON_CASH" }), { statusCode: 400 });
      assert.equal(JSON.stringify(month), snapshot);
      assert.equal(writes(), 2);
    }
  }
});

test("ledger uses registration order before rank for same-day entries and Bogota day for opening", () => {
  const { month } = fixture();
  month.openingBalance = money(10);
  month.incomes![0]!.receivedAt = businessDateToPrisma("2026-10-31");
  month.incomes![0]!.createdAt = new Date("2026-11-01T02:00:00Z");
  month.movements.push({ id: "newest", type: "EXPENSE", amount: money(1), occurredAt: businessDateToPrisma("2026-10-31"), createdAt: new Date("2026-11-01T04:30:00Z"), paymentMethod: "NON_CASH", sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null });
  const ledger = mapMonthlyLedger(month, true);
  assert.deepEqual(ledger.entries.map((entry) => [entry.entryKey, entry.occurredAt]), [["newest", "2026-10-31"], ["opening:october", "2026-10-31"], ["income", "2026-10-31"]]);
  assert.equal(ledger.entries.some((entry) => "createdAt" in entry), false);
});

test("guided closure dates both deficit movement types using the injected Bogota today", async () => {
  for (const type of ["DEFICIT_COVER_FROM_SUBCATEGORY", "DEFICIT_COVER_FROM_POCKET"] as const) {
    const { month, ports, records } = fixture();
    month.movements.push({ id: "expense", type: "EXPENSE", amount: money(150), sourceSubcategoryId: "target", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null });
    await createClosureUseCases(ports, () => todayInBogota(instant)).applyClosureAction({ monthId: month.id, type, sourceSubcategoryId: "source", sourcePocketId: "pocket", targetSubcategoryId: "target", amount: 10 });
    assert.equal(records[0]!.occurredAt!.toISOString(), "2026-10-31T00:00:00.000Z");
  }
});

test("cash carryover uses the new month's first day", async () => {
  const { month, ports, records } = fixture();
  const prior = { ...month, id: "previous", status: "CLOSED" as const, movements: [{ type: "CASH_WITHDRAWAL" as const, amount: money(10), sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null }] };
  Object.assign(ports.months, { findActiveSummary: async () => null, findByYearMonth: async () => null, findPriorClosedBefore: async () => prior, findOpeningRecipient: async () => null, createFromTemplate: async () => month });
  Object.assign(ports, { templates: { readCategories: async () => [{ id: "template", name: "General", sortOrder: 0, subcategories: [{ id: "sub", name: "Source", plannedAmount: money(1), defaultPocketId: null, active: true, sortOrder: 0 }] }] } });
  ports.pockets.ensureTemplateDefaultPocketsAreActive = async () => {};
  // The runner fixture captures the same port objects, including this template repository.
  const run = async <T>(work: (tx: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) => work(ports);
  ports.transactionRunner.runSerializable = run;
  await createMonthLifecycleService(ports).openMonth({ year: 2026, month: 10 });
  assert.equal(records[0]!.occurredAt!.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("debts and pocket projections serialize days and use registration order on ties", () => {
  const day = businessDateToPrisma("2026-10-31");
  const debt = rehydrateDebt({ id: "debt", direction: "I_OWE", counterpartyName: "Banco", description: null, totalAmount: 100, currency: "COP", originDate: day, createdAt: instant, updatedAt: instant, payments: [
    { id: "later", amount: 2, paidAt: day, createdAt: instant, notes: null },
    { id: "earlier", amount: 1, paidAt: day, createdAt: new Date("2026-10-31T12:00:00Z"), notes: null },
  ] });
  assert.deepEqual(toDebtView(debt), { id: "debt", direction: "I_OWE", counterpartyName: "Banco", description: null, totalAmount: 100, currency: "COP", originDate: "2026-10-31", remainingBalance: 97, status: "OPEN", payments: [{ id: "earlier", amount: 1, paidAt: "2026-10-31", notes: null }, { id: "later", amount: 2, paidAt: "2026-10-31", notes: null }] });
  const pocket = rehydratePocket({ id: "pocket", name: "Savings", goalAmount: null, active: true, outgoingMovements: [], incomingMovements: [
    { id: "earlier", type: "POCKET_DEPOSIT_FROM_AVAILABLE", amount: 1, occurredAt: day, createdAt: new Date("2026-10-31T12:00:00Z"), description: null },
    { id: "later", type: "POCKET_DEPOSIT_FROM_AVAILABLE", amount: 2, occurredAt: day, createdAt: instant, description: null },
  ] });
  assert.deepEqual(toPocketView(pocket).recentMovements.map((movement) => [movement.id, movement.occurredAt]), [["later", "2026-10-31"], ["earlier", "2026-10-31"]]);
});

test("HTTP rejects timestamp business dates with exact 400 responses before delegation", async (t) => {
  let calls = 0;
  const app = express();
  app.use(express.json());
  app.use("/api", createMonthlyCycleRouter({
    recordExpense: async () => { calls++; throw new Error("must not delegate"); },
    createMonthlyIncome: async () => { calls++; throw new Error("must not delegate"); },
    withdrawCash: async () => { calls++; throw new Error("must not delegate"); },
    depositToPocket: async () => { calls++; throw new Error("must not delegate"); },
  }));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const timestamp = "2026-10-31T20:00:00.000-05:00";
  const requests = [
    { path: "/months/october/expenses", body: { amount: 1, paymentMethod: "NON_CASH", occurredAt: timestamp }, expected: { message: "Fecha del gasto debe ser una fecha válida en formato YYYY-MM-DD." } },
    { path: "/months/october/incomes", body: { sourceName: "Salary", amount: 1, receivedAt: timestamp }, expected: { message: "Fecha de recepción del ingreso debe ser una fecha válida en formato YYYY-MM-DD." } },
    { path: "/months/october/cash-withdrawals", body: { amount: 1, occurredAt: timestamp }, expected: { message: "Fecha del retiro de efectivo debe ser una fecha válida en formato YYYY-MM-DD." } },
    { path: "/pockets/deposits", body: { sourceKind: "MONTH_AVAILABLE", monthId: "october", targetPocketId: "pocket", amount: 1, occurredAt: timestamp }, expected: { code: "INVALID_DATE", message: "Fecha del depósito al bolsillo debe ser una fecha válida en formato YYYY-MM-DD." } },
  ];
  for (const request of requests) {
    const response = await fetch(`${base}${request.path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.body) });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), request.expected);
    assert.equal(calls, 0);
  }
});

test("statement windows include the entire cutoff calendar day", async () => {
  const cycle = calculateStatementCycle({ closingDay: 31, dueDay: 5, today: new Date("2026-10-31T12:00:00Z") });
  assert.equal(cycle.to.toISOString(), "2026-10-31T00:00:00.000Z");
  const days = ["2026-10-01", "2026-10-31", "2026-11-01"].map(businessDateToPrisma);
  const adapter = createCreditCardMovementSummaryPrismaAdapter({ movement: { aggregate: async ({ where }) => ({ _sum: { amount: money(days.filter((date) => date >= where.occurredAt.gte && date <= where.occurredAt.lte).length) } }) } });
  assert.equal(await adapter.sumExpensesByCardInWindow({ ownerId: "owner", creditCardId: "card", from: cycle.from, to: cycle.to }), 2);
});
