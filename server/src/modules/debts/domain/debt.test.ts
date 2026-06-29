import test from "node:test";
import assert from "node:assert/strict";

import { DomainError } from "./debt-errors.js";
import {
  assertPaymentCanBeRegistered,
  createDebt,
  createDebtPayment,
  rehydrateDebt,
  sortDebtsForList,
  toDebtView,
} from "./debt.js";

const fixedDate = new Date("2026-05-23T00:00:00.000Z");

test("createDebt enforces positive COP debts and defaults omitted currency to COP", () => {
  const debt = createDebt({
    direction: "OWED_TO_ME",
    counterpartyName: "Laura",
    description: "Prestamo personal",
    totalAmount: 250_000,
    originDate: fixedDate,
  });

  assert.equal(debt.currency, "COP");
  assert.equal(debt.totalAmount, 250_000);

  assert.throws(
    () =>
      createDebt({
        direction: "I_OWE",
        counterpartyName: "Banco",
        totalAmount: 0,
        originDate: fixedDate,
      }),
    (error) => error instanceof DomainError && error.statusCode === 400 && error.message === "Debt amount must be positive.",
  );

  assert.throws(
    () =>
      createDebt({
        direction: "I_OWE",
        counterpartyName: "Banco",
        totalAmount: 100,
        currency: "USD",
        originDate: fixedDate,
      }),
    (error) => error instanceof DomainError && error.statusCode === 400 && error.message === "Debt currency must be COP.",
  );
});

test("toDebtView derives remaining balance and paid status from sorted payments", () => {
  const debt = rehydrateDebt({
    id: "debt-1",
    direction: "I_OWE",
    counterpartyName: "Banco",
    description: null,
    totalAmount: 100,
    currency: "COP",
    originDate: fixedDate,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    payments: [
      createDebtPayment({ id: "payment-2", amount: 30, paidAt: new Date("2026-05-24T00:00:00.000Z"), notes: null }),
      createDebtPayment({ id: "payment-1", amount: 10, paidAt: new Date("2026-05-23T00:00:00.000Z"), notes: "Abono" }),
    ],
  });

  const debtView = toDebtView(debt);

  assert.equal(debtView.remainingBalance, 60);
  assert.equal(debtView.status, "OPEN");
  assert.deepEqual(
    debtView.payments.map((payment) => payment.id),
    ["payment-1", "payment-2"],
  );
});

test("toDebtView clamps historic overpayment in list mode and rejects it otherwise", () => {
  const overpaidDebt = rehydrateDebt({
    id: "debt-overpaid",
    direction: "I_OWE",
    counterpartyName: "Banco",
    description: null,
    totalAmount: 100,
    currency: "COP",
    originDate: fixedDate,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    payments: [createDebtPayment({ id: "payment-1", amount: 120, paidAt: fixedDate, notes: null })],
  });

  assert.equal(toDebtView(overpaidDebt, { clampOverpayment: true }).remainingBalance, 0);
  assert.equal(toDebtView(overpaidDebt, { clampOverpayment: true }).status, "PAID");

  assert.throws(
    () => toDebtView(overpaidDebt),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Debt payments exceed total debt amount.",
  );
});

test("assertPaymentCanBeRegistered accepts valid payments and rejects invalid ones", () => {
  const openDebt = rehydrateDebt({
    id: "debt-open",
    direction: "I_OWE",
    counterpartyName: "Banco",
    description: null,
    totalAmount: 100,
    currency: "COP",
    originDate: fixedDate,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    payments: [createDebtPayment({ id: "payment-1", amount: 40, paidAt: fixedDate, notes: null })],
  });

  assert.doesNotThrow(() => assertPaymentCanBeRegistered(openDebt, 60));

  assert.throws(
    () => assertPaymentCanBeRegistered(openDebt, 0),
    (error) => error instanceof DomainError && error.statusCode === 400 && error.message === "Payment amount must be positive.",
  );

  assert.throws(
    () => assertPaymentCanBeRegistered(openDebt, 61),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Payment exceeds remaining debt balance.",
  );

  const paidDebt = rehydrateDebt({
    ...openDebt,
    id: "debt-paid",
    payments: [createDebtPayment({ id: "payment-full", amount: 100, paidAt: fixedDate, notes: null })],
  });

  assert.throws(
    () => assertPaymentCanBeRegistered(paidDebt, 1),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Debt is already paid.",
  );
});

test("sortDebtsForList orders originDate desc and then createdAt desc", () => {
  const oldest = rehydrateDebt({
    id: "oldest",
    direction: "I_OWE",
    counterpartyName: "A",
    description: null,
    totalAmount: 10,
    currency: "COP",
    originDate: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: fixedDate,
    payments: [],
  });
  const newerCreated = rehydrateDebt({
    id: "newer-created",
    direction: "I_OWE",
    counterpartyName: "B",
    description: null,
    totalAmount: 10,
    currency: "COP",
    originDate: new Date("2026-02-01T00:00:00.000Z"),
    createdAt: new Date("2026-02-02T00:00:00.000Z"),
    updatedAt: fixedDate,
    payments: [],
  });
  const olderCreatedSameOrigin = rehydrateDebt({
    id: "older-created-same-origin",
    direction: "I_OWE",
    counterpartyName: "C",
    description: null,
    totalAmount: 10,
    currency: "COP",
    originDate: new Date("2026-02-01T00:00:00.000Z"),
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    updatedAt: fixedDate,
    payments: [],
  });

  assert.deepEqual(
    sortDebtsForList([oldest, olderCreatedSameOrigin, newerCreated]).map((debt) => debt.id),
    ["newer-created", "older-created-same-origin", "oldest"],
  );
});
