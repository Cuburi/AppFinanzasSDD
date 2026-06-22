import test from "node:test";
import assert from "node:assert/strict";

import { DomainError } from "../../domain/debt-errors.js";
import { createDebtPayment, rehydrateDebt, toDebtView } from "../../domain/debt.js";
import { DebtNotFoundError } from "../errors/debt-application-errors.js";
import { createCreateDebtUseCase } from "./create-debt-use-case.js";
import { createListDebtsUseCase } from "./list-debts-use-case.js";
import { createRegisterDebtPaymentUseCase } from "./register-debt-payment-use-case.js";

const fixedDate = new Date("2026-05-23T00:00:00.000Z");

const buildDebt = ({
  id = "debt-1",
  totalAmount = 100,
  payments = [],
  originDate = fixedDate,
  createdAt = fixedDate,
}: {
  id?: string;
  totalAmount?: number;
  payments?: ReturnType<typeof createDebtPayment>[];
  originDate?: Date;
  createdAt?: Date;
} = {}) =>
  rehydrateDebt({
    id,
    direction: "I_OWE",
    counterpartyName: "Banco",
    description: null,
    totalAmount,
    currency: "COP",
    originDate,
    createdAt,
    updatedAt: createdAt,
    payments,
  });

test("listDebts use case orders debts for the API and clamps historic overpayment", async () => {
  const listDebts = createListDebtsUseCase({
    debts: {
      async findAll() {
        return [
          buildDebt({ id: "older", totalAmount: 100, payments: [createDebtPayment({ id: "payment-1", amount: 10, paidAt: fixedDate, notes: null })], originDate: new Date("2026-01-01T00:00:00.000Z") }),
          buildDebt({ id: "overpaid", totalAmount: 100, payments: [createDebtPayment({ id: "payment-2", amount: 120, paidAt: fixedDate, notes: null })], originDate: new Date("2026-02-01T00:00:00.000Z") }),
        ];
      },
      async findById() {
        throw new Error("Not used.");
      },
      async create() {
        throw new Error("Not used.");
      },
      async addPayment() {
        throw new Error("Not used.");
      },
    },
  });

  const debts = await listDebts();

  assert.deepEqual(
    debts.map((debt) => debt.id),
    ["overpaid", "older"],
  );
  assert.equal(debts[0]?.remainingBalance, 0);
  assert.equal(debts[0]?.status, "PAID");
});

test("createDebt use case defaults currency to COP before persistence and returns the debt view", async () => {
  const calls: unknown[] = [];
  const createDebt = createCreateDebtUseCase({
    debts: {
      async findAll() {
        throw new Error("Not used.");
      },
      async findById() {
        throw new Error("Not used.");
      },
      async create(input) {
        calls.push(input);
        return buildDebt({ id: "debt-created", totalAmount: input.totalAmount });
      },
      async addPayment() {
        throw new Error("Not used.");
      },
    },
  });

  const created = await createDebt({
    direction: "OWED_TO_ME",
    counterpartyName: "Laura",
    description: "Prestamo personal",
    totalAmount: 250_000,
    originDate: fixedDate,
  });

  assert.equal(created.id, "debt-created");
  assert.equal(created.currency, "COP");
  assert.deepEqual(calls, [
    {
      direction: "OWED_TO_ME",
      counterpartyName: "Laura",
      description: "Prestamo personal",
      totalAmount: 250_000,
      currency: "COP",
      originDate: fixedDate,
    },
  ]);
});

test("registerPayment use case rejects missing debts inside the transaction", async () => {
  let transactionRuns = 0;
  const registerPayment = createRegisterDebtPaymentUseCase({
    transactionRunner: {
      async runSerializable(work) {
        transactionRuns += 1;
        return work({
          debts: {
            async findAll() {
              throw new Error("Not used.");
            },
            async findById() {
              return null;
            },
            async create() {
              throw new Error("Not used.");
            },
            async addPayment() {
              throw new Error("Not used.");
            },
          },
        });
      },
    },
  });

  await assert.rejects(registerPayment("missing-debt", { amount: 20, paidAt: fixedDate }), (error) => {
    assert.ok(error instanceof DebtNotFoundError);
    assert.equal(error.message, "Debt not found.");
    assert.equal("statusCode" in error, false);
    return true;
  });

  assert.equal(transactionRuns, 1);
});

test("registerPayment use case rejects already-paid and overpayment attempts", async () => {
  const paidDebt = buildDebt({ id: "debt-paid", payments: [createDebtPayment({ id: "payment-1", amount: 100, paidAt: fixedDate, notes: null })] });
  const almostPaidDebt = buildDebt({ id: "debt-open", payments: [createDebtPayment({ id: "payment-2", amount: 80, paidAt: fixedDate, notes: null })] });
  let debtIndex = 0;

  const registerPayment = createRegisterDebtPaymentUseCase({
    transactionRunner: {
      async runSerializable(work) {
        const debt = debtIndex === 0 ? paidDebt : almostPaidDebt;
        debtIndex += 1;

        return work({
          debts: {
            async findAll() {
              throw new Error("Not used.");
            },
            async findById() {
              return debt;
            },
            async create() {
              throw new Error("Not used.");
            },
            async addPayment() {
              throw new Error("Should not persist invalid payments.");
            },
          },
        });
      },
    },
  });

  await assert.rejects(
    registerPayment("debt-paid", { amount: 1, paidAt: fixedDate }),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Debt is already paid.",
  );

  await assert.rejects(
    registerPayment("debt-open", { amount: 21, paidAt: fixedDate }),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Payment exceeds remaining debt balance.",
  );
});

test("registerPayment use case persists a valid payment and returns the updated debt view", async () => {
  const debt = buildDebt();
  let storedPayments = debt.payments;

  const registerPayment = createRegisterDebtPaymentUseCase({
    transactionRunner: {
      async runSerializable(work) {
        return work({
          debts: {
            async findAll() {
              throw new Error("Not used.");
            },
            async findById() {
              return buildDebt({ payments: storedPayments });
            },
            async create() {
              throw new Error("Not used.");
            },
            async addPayment(_debtId, payment) {
              storedPayments = [...storedPayments, createDebtPayment({ id: "payment-1", ...payment })];
            },
          },
        });
      },
    },
  });

  const updated = await registerPayment("debt-1", { amount: 40, paidAt: fixedDate, notes: "Abono" });

  assert.equal(updated.remainingBalance, 60);
  assert.equal(updated.status, "OPEN");
  assert.deepEqual(updated.payments, [{ id: "payment-1", amount: 40, paidAt: fixedDate.toISOString(), notes: "Abono" }]);
});

test("registerPayment use case preserves debt balance when conflicting payments run concurrently", async () => {
  let storedPayments: ReturnType<typeof createDebtPayment>[] = [];
  let paymentSequence = 0;
  let serialQueue = Promise.resolve();

  const registerPayment = createRegisterDebtPaymentUseCase({
    transactionRunner: {
      runSerializable(work) {
        const runAfterPrevious = serialQueue.then(() =>
          work({
            debts: {
              async findAll() {
                throw new Error("Not used.");
              },
              async findById() {
                return buildDebt({ payments: storedPayments });
              },
              async create() {
                throw new Error("Not used.");
              },
              async addPayment(_debtId, payment) {
                paymentSequence += 1;
                storedPayments = [...storedPayments, createDebtPayment({ id: `payment-${paymentSequence}`, ...payment })];
              },
            },
          }),
        );
        serialQueue = runAfterPrevious.then(
          () => undefined,
          () => undefined,
        );
        return runAfterPrevious;
      },
    },
  });

  const attempts = await Promise.allSettled([
    registerPayment("debt-1", { amount: 100, paidAt: fixedDate, notes: "First concurrent payment" }),
    registerPayment("debt-1", { amount: 100, paidAt: fixedDate, notes: "Second concurrent payment" }),
  ]);

  const succeeded = attempts.filter((attempt) => attempt.status === "fulfilled");
  const rejected = attempts.filter((attempt) => attempt.status === "rejected");
  const collected = storedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  assert.equal(succeeded.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0]?.reason instanceof DomainError);
  assert.equal(rejected[0]?.reason.message, "Debt is already paid.");
  assert.equal(collected, 100);
  assert.equal(buildDebt({ payments: storedPayments }).payments.length, 1);
  assert.equal(toDebtView(buildDebt({ payments: storedPayments })).remainingBalance, 0);
});
