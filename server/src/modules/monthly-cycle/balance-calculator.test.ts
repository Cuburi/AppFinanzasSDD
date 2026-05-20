import test from "node:test";
import assert from "node:assert/strict";
import { MovementType, Prisma } from "../../lib/prisma-client.js";

import { calculateMonthBalances } from "./balance-calculator.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

test("calculateMonthBalances allows overspend and tracks pocket transfers", () => {
  const balances = calculateMonthBalances({
    incomes: [{ amount: amount(500) }],
    categories: [
      {
        subcategories: [
          { id: "food", plannedAmount: amount(100) },
          { id: "fun", plannedAmount: amount(50) },
        ],
      },
    ],
    movements: [
      {
        type: MovementType.EXPENSE,
        amount: amount(120),
        sourceSubcategoryId: "food",
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: null,
      },
      {
        type: MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY,
        amount: amount(15),
        sourceSubcategoryId: "fun",
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: "emergency",
      },
      {
        type: MovementType.POCKET_DEPOSIT_EXTERNAL,
        amount: amount(25),
        sourceSubcategoryId: null,
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: "emergency",
      },
    ],
  });

  assert.equal(balances.subcategoryBalances.get("food"), -20);
  assert.equal(balances.subcategoryBalances.get("fun"), 35);
  assert.equal(balances.pocketBalances.get("emergency"), 40);
  assert.equal(balances.monthlyIncomeTotal, 500);
  assert.equal(balances.availableMoney, 340);
});

test("calculateMonthBalances applies closure movements to source and target balances", () => {
  const balances = calculateMonthBalances({
    categories: [
      {
        subcategories: [
          { id: "groceries", plannedAmount: amount(80) },
          { id: "transport", plannedAmount: amount(40) },
        ],
      },
    ],
    movements: [
      {
        type: MovementType.DEFICIT_COVER_FROM_SUBCATEGORY,
        amount: amount(10),
        sourceSubcategoryId: "transport",
        targetSubcategoryId: "groceries",
        sourcePocketId: null,
        targetPocketId: null,
      },
      {
        type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE,
        amount: amount(15),
        sourceSubcategoryId: "groceries",
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: "vacation",
      },
      {
        type: MovementType.DEFICIT_COVER_FROM_POCKET,
        amount: amount(5),
        sourceSubcategoryId: null,
        targetSubcategoryId: "groceries",
        sourcePocketId: "vacation",
        targetPocketId: null,
      },
    ],
  });

  assert.equal(balances.subcategoryBalances.get("groceries"), 80);
  assert.equal(balances.subcategoryBalances.get("transport"), 30);
  assert.equal(balances.pocketBalances.get("vacation"), 10);
});

test("calculateMonthBalances reports zero income defaults and available money", () => {
  const balances = calculateMonthBalances({
    categories: [{ subcategories: [{ id: "food", plannedAmount: amount(100) }] }],
    movements: [],
  });

  assert.equal(balances.monthlyIncomeTotal, 0);
  assert.equal(balances.availableMoney, 0);
});
