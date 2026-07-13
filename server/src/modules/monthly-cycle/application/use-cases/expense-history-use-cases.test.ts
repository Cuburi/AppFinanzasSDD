import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";
import { createExpenseHistoryUseCases, EXPENSE_HISTORY_USE_CASE_NAMES } from "./expense-history-use-cases.js";
import type { ExpenseHistoryQueryInput } from "../../dto/index.js";
import { DomainError } from "../../shared/service-errors.js";
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
      subcategories: [{ id: "sub-market", name: "Market", plannedAmount: amount(300), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 0 }],
    },
  ],
  movements: [],
};

const expense = { id: "expense-1", type: MovementType.EXPENSE, amount: amount(75), occurredAt: new Date("2026-05-10T00:00:00.000Z"), description: "Market", paymentMethod: PaymentMethod.NON_CASH, sourceSubcategoryId: "sub-market", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null, creditCardId: "card-1" };

const createHistoryPorts = () => {
  const calls: unknown[] = [];
  const ports = {
    months: {
      async findById(monthId: string) {
        calls.push(["months.findById", monthId]);
        return month;
      },
    },
    templates: {},
    movements: {
      async findExpenseHistory(input: ExpenseHistoryQueryInput) {
        calls.push(["movements.findExpenseHistory", input]);
        return [expense];
      },
    },
    incomes: {},
    structure: {},
    pockets: {},
    transactionRunner: {},
  } as unknown as MonthlyCyclePorts;

  return { calls, ports };
};

test("expense-history use cases expose only the history public surface", () => {
  assert.deepEqual(EXPENSE_HISTORY_USE_CASE_NAMES, ["listExpenseHistory"]);
  assert.deepEqual(Object.keys(createExpenseHistoryUseCases(createHistoryPorts().ports)), ["listExpenseHistory"]);
});

test("listExpenseHistory validates subcategory ownership and reads filtered expenses through explicit ports", async () => {
  const { calls, ports } = createHistoryPorts();
  const useCases = createExpenseHistoryUseCases(ports);
  const input = { monthId: "month-1", subcategoryId: "sub-market", paymentMethod: PaymentMethod.NON_CASH, from: "2026-05-01T00:00:00.000Z", to: "2026-05-31T23:59:59.999Z" };

  const history = await useCases.listExpenseHistory(input);

  assert.deepEqual(history.expenses.map((item) => [item.id, item.amount, item.subcategory.id, item.creditCardId]), [["expense-1", 75, "sub-market", "card-1"]]);
  assert.deepEqual(calls, [
    ["months.findById", "month-1"],
    ["movements.findExpenseHistory", input],
  ]);
});

test("listExpenseHistory rejects unknown subcategories before movement history reads", async () => {
  const { calls, ports } = createHistoryPorts();
  const useCases = createExpenseHistoryUseCases(ports);

  await assert.rejects(() => useCases.listExpenseHistory({ monthId: "month-1", subcategoryId: "missing-sub" }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.equal(error.message, "Subcategory was not found in this month.");
    return true;
  });
  assert.deepEqual(calls, [["months.findById", "month-1"]]);
});
