import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";
import { createReportsUseCases, REPORTS_USE_CASE_NAMES } from "./reports-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-01T00:00:00.000Z"),
  closedAt: null,
  incomes: [{ id: "income-1", monthId: "month-1", sourceName: "Salary", amount: amount(1000), receivedAt: new Date("2026-05-01T00:00:00.000Z"), notes: null, createdAt: new Date("2026-05-01T00:00:00.000Z"), updatedAt: new Date("2026-05-01T00:00:00.000Z") }],
  categories: [
    {
      id: "cat-living",
      name: "Living",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        { id: "sub-rent", name: "Rent", plannedAmount: amount(600), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 0 },
        { id: "sub-food", name: "Food", plannedAmount: amount(300), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 1 },
      ],
    },
  ],
  movements: [
    { id: "expense-food", type: MovementType.EXPENSE, amount: amount(125), occurredAt: new Date("2026-05-06T00:00:00.000Z"), description: "Market", paymentMethod: PaymentMethod.NON_CASH, sourceSubcategoryId: "sub-food", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "cash-withdrawal", type: MovementType.CASH_WITHDRAWAL, amount: amount(100), occurredAt: new Date("2026-05-05T00:00:00.000Z"), description: "ATM", paymentMethod: null, sourceSubcategoryId: null, targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "cash-food", type: MovementType.EXPENSE, amount: amount(25), occurredAt: new Date("2026-05-07T00:00:00.000Z"), description: "Cash market", paymentMethod: PaymentMethod.CASH, sourceSubcategoryId: "sub-food", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const createReportPorts = () => {
  const calls: unknown[] = [];
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
    transactionRunner: {},
  } as unknown as MonthlyCyclePorts;

  return { calls, ports };
};

test("report use cases expose only the report public surface", () => {
  assert.deepEqual(REPORTS_USE_CASE_NAMES, ["getBasicReport"]);
  assert.deepEqual(Object.keys(createReportsUseCases(createReportPorts().ports)), ["getBasicReport"]);
});

test("getBasicReport reads the month through the month repository port and maps report totals", async () => {
  const { calls, ports } = createReportPorts();
  const useCases = createReportsUseCases(ports);

  const report = await useCases.getBasicReport("month-1");

  assert.equal(report.summary.monthId, "month-1");
  assert.equal(report.summary.monthlyIncomeTotal, 1000);
  assert.equal(report.summary.totalSpentCash, 25);
  assert.equal(report.summary.totalSpentNonCash, 125);
  assert.deepEqual(report.topSpendingSubcategories.map((item) => [item.subcategoryId, item.amount]), [["sub-food", 150]]);
  assert.deepEqual(calls, [["months.findById", "month-1"]]);
});
