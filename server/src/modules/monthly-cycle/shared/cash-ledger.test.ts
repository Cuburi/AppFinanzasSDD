import test from "node:test";
import assert from "node:assert/strict";
import { MovementType, PaymentMethod, Prisma } from "../../../lib/prisma-client.js";

import {
  assertOccurredAtWithinMonth,
  calculateCashBalance,
  isCashCarryoverIn,
  isCashExpense,
  isCashWithdrawal,
} from "./cash-ledger.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

test("calculateCashBalance adds withdrawals and carryover, subtracts cash expenses only", () => {
  const balance = calculateCashBalance([
    { type: MovementType.CASH_CARRYOVER_IN, amount: amount(25) },
    { type: MovementType.CASH_WITHDRAWAL, amount: amount(100) },
    { type: MovementType.EXPENSE, paymentMethod: PaymentMethod.CASH, amount: amount(35) },
    { type: MovementType.EXPENSE, paymentMethod: PaymentMethod.NON_CASH, amount: amount(20) },
  ]);

  assert.equal(balance, 90);
});

test("cash movement predicates identify only physical-cash events", () => {
  assert.equal(isCashWithdrawal({ type: MovementType.CASH_WITHDRAWAL }), true);
  assert.equal(isCashWithdrawal({ type: MovementType.EXPENSE }), false);
  assert.equal(isCashCarryoverIn({ type: MovementType.CASH_CARRYOVER_IN }), true);
  assert.equal(isCashCarryoverIn({ type: MovementType.POCKET_DEPOSIT_EXTERNAL }), false);
  assert.equal(isCashExpense({ type: MovementType.EXPENSE, paymentMethod: PaymentMethod.CASH }), true);
  assert.equal(isCashExpense({ type: MovementType.EXPENSE, paymentMethod: PaymentMethod.NON_CASH }), false);
});

test("assertOccurredAtWithinMonth accepts matching UTC month and rejects outside dates", () => {
  assert.doesNotThrow(() => assertOccurredAtWithinMonth(new Date("2026-05-31T23:59:59.000Z"), { year: 2026, month: 5 }));

  assert.throws(
    () => assertOccurredAtWithinMonth(new Date("2026-06-01T00:00:00.000Z"), { year: 2026, month: 5 }),
    /within the target month/,
  );
});
