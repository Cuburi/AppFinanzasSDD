import test from "node:test";
import assert from "node:assert/strict";
import { MovementType, PaymentMethod, Prisma } from "../../lib/prisma-client.js";

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

test("calculateMonthBalances does not double-count cash expenses against available money", () => {
  const balances = calculateMonthBalances({
    incomes: [{ amount: amount(500) }],
    categories: [{ subcategories: [{ id: "food", plannedAmount: amount(200) }] }],
    movements: [
      {
        type: MovementType.CASH_WITHDRAWAL,
        amount: amount(100),
        sourceSubcategoryId: null,
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: null,
      },
      {
        type: MovementType.EXPENSE,
        paymentMethod: PaymentMethod.CASH,
        amount: amount(40),
        sourceSubcategoryId: "food",
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: null,
      },
      {
        type: MovementType.EXPENSE,
        paymentMethod: PaymentMethod.NON_CASH,
        amount: amount(30),
        sourceSubcategoryId: "food",
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: null,
      },
    ],
  });

  assert.equal(balances.availableMoney, 370);
  assert.equal(balances.subcategoryBalances.get("food"), 130);
});

test("calculateMonthBalances ignores cash carryover for available money", () => {
  const balances = calculateMonthBalances({
    incomes: [{ amount: amount(300) }],
    categories: [{ subcategories: [] }],
    movements: [
      {
        type: MovementType.CASH_CARRYOVER_IN,
        amount: amount(80),
        sourceSubcategoryId: null,
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: null,
      },
    ],
  });

  assert.equal(balances.availableMoney, 300);
});

test("calculateMonthBalances applies post-backfill available deposits to monthly and pocket balances", () => {
  const balances = calculateMonthBalances({
    incomes: [{ amount: amount(100) }],
    categories: [{ subcategories: [] }],
    movements: [
      {
        type: MovementType.POCKET_DEPOSIT_FROM_AVAILABLE,
        amount: amount(25),
        sourceSubcategoryId: null,
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: "emergency",
      },
    ],
  });

  assert.equal(balances.availableMoney, 75);
  assert.equal(balances.pocketBalances.get("emergency"), 25);
});

test("calculateMonthBalances accumulates multiple post-backfill available deposits", () => {
  const balances = calculateMonthBalances({
    incomes: [{ amount: amount(80) }],
    categories: [{ subcategories: [] }],
    movements: [
      {
        type: MovementType.POCKET_DEPOSIT_FROM_AVAILABLE,
        amount: amount(15),
        sourceSubcategoryId: null,
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: "emergency",
      },
      {
        type: MovementType.POCKET_DEPOSIT_FROM_AVAILABLE,
        amount: amount(5),
        sourceSubcategoryId: null,
        targetSubcategoryId: null,
        sourcePocketId: null,
        targetPocketId: "emergency",
      },
    ],
  });

  assert.equal(balances.availableMoney, 60);
  assert.equal(balances.pocketBalances.get("emergency"), 20);
});
