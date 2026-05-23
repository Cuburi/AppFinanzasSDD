import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../../../lib/prisma-client.js";

import { DomainError } from "../shared/domain-error.js";
import { createDebtWorkflowService } from "./debt-workflow-service.js";
import type { DebtDirection, DebtRecord, DebtsDb } from "../shared/types.js";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

const fixedDate = new Date("2026-05-23T00:00:00.000Z");

const buildDebt = ({
  id = "debt-1",
  direction = "I_OWE",
  totalAmount = 100,
  payments = [],
}: {
  id?: string;
  direction?: DebtDirection;
  totalAmount?: number;
  payments?: Array<{ id: string; amount: number; paidAt?: Date; notes?: string | null }>;
}): DebtRecord => ({
  id,
  direction,
  counterpartyName: "Banco",
  description: null,
  totalAmount: money(totalAmount),
  currency: "COP",
  originDate: fixedDate,
  createdAt: fixedDate,
  updatedAt: fixedDate,
  payments: payments.map((payment) => ({
    id: payment.id,
    debtId: id,
    amount: money(payment.amount),
    paidAt: payment.paidAt ?? fixedDate,
    notes: payment.notes ?? null,
    createdAt: fixedDate,
  })),
});

const createDbStub = ({
  initialDebts = [],
  failPaymentCreate = false,
  failFirstCommitWithConcurrentPayment,
}: {
  initialDebts?: DebtRecord[];
  failPaymentCreate?: boolean;
  failFirstCommitWithConcurrentPayment?: { debtId: string; amount: number };
} = {}) => {
  let debts = initialDebts.map((debt) => ({ ...debt, payments: debt.payments.map((payment) => ({ ...payment })) }));
  const capturedCreates: unknown[] = [];
  const transactionOptions: unknown[] = [];
  let shouldFailCommit = Boolean(failFirstCommitWithConcurrentPayment);

  const cloneDebt = (debt: DebtRecord): DebtRecord => ({
    ...debt,
    payments: debt.payments.map((payment) => ({ ...payment })),
  });

  const db: DebtsDb = {
    async $transaction<T>(callback: (tx: DebtsDb) => Promise<T>, options?: unknown) {
      transactionOptions.push(options);
      const snapshot = debts.map(cloneDebt);
      try {
        const result = await callback(db);
        if (shouldFailCommit && failFirstCommitWithConcurrentPayment) {
          shouldFailCommit = false;
          debts = snapshot;
          const debt = debts.find((candidate) => candidate.id === failFirstCommitWithConcurrentPayment.debtId);
          if (debt) {
            debt.payments.push({
              id: `payment-${debt.payments.length + 1}`,
              debtId: debt.id,
              amount: money(failFirstCommitWithConcurrentPayment.amount),
              paidAt: fixedDate,
              notes: "Concurrent payment",
              createdAt: fixedDate,
            });
          }
          throw Object.assign(new Error("Transaction write conflict"), { code: "P2034" });
        }
        return result;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "P2034")) {
          debts = snapshot;
        }
        throw error;
      }
    },
    debt: {
      async findMany() {
        return debts.map(cloneDebt);
      },
      async findUnique(args) {
        const debt = debts.find((candidate) => candidate.id === args.where.id);
        return debt ? cloneDebt(debt) : null;
      },
      async create(args) {
        capturedCreates.push(args);
        const created = buildDebt({
          id: `debt-${debts.length + 1}`,
          direction: args.data.direction,
          totalAmount: Number(args.data.totalAmount.toString()),
        });
        created.counterpartyName = args.data.counterpartyName;
        created.description = args.data.description;
        created.currency = args.data.currency;
        created.originDate = args.data.originDate;
        debts.push(created);
        return cloneDebt(created);
      },
    },
    debtPayment: {
      async create(args) {
        if (failPaymentCreate) {
          throw new Error("payment insert failed");
        }

        const debt = debts.find((candidate) => candidate.id === args.data.debtId);
        if (!debt) {
          throw new Error("debt missing in stub");
        }

        const payment = {
          id: `payment-${debt.payments.length + 1}`,
          debtId: args.data.debtId,
          amount: args.data.amount,
          paidAt: args.data.paidAt,
          notes: args.data.notes,
          createdAt: fixedDate,
        };
        debt.payments.push(payment);
        return payment;
      },
    },
  };

  return {
    db,
    get debts() {
      return debts.map(cloneDebt);
    },
    get capturedCreates() {
      return [...capturedCreates];
    },
    get transactionOptions() {
      return [...transactionOptions];
    },
  };
};

test("createDebt persists a positive COP debt with OPEN status and full remaining balance", async () => {
  const fixture = createDbStub();
  const service = createDebtWorkflowService(fixture.db);

  const debt = await service.createDebt({
    direction: "OWED_TO_ME",
    counterpartyName: "Laura",
    description: "Prestamo personal",
    totalAmount: 250_000,
    originDate: fixedDate,
  });

  assert.equal(debt.direction, "OWED_TO_ME");
  assert.equal(debt.currency, "COP");
  assert.equal(debt.totalAmount, 250_000);
  assert.equal(debt.remainingBalance, 250_000);
  assert.equal(debt.status, "OPEN");
  assert.equal(fixture.debts.length, 1);
});

test("createDebt rejects zero or negative amounts without persisting a debt", async () => {
  const fixture = createDbStub();
  const service = createDebtWorkflowService(fixture.db);

  await assert.rejects(
    service.createDebt({
      direction: "I_OWE",
      counterpartyName: "Banco",
      totalAmount: 0,
      originDate: fixedDate,
    }),
    (error) => error instanceof DomainError && error.statusCode === 400 && error.message === "Debt amount must be positive.",
  );

  assert.equal(fixture.debts.length, 0);
});

test("registerPayment appends ledger payments and derives partial and paid balances", async () => {
  const fixture = createDbStub({ initialDebts: [buildDebt({ totalAmount: 100 })] });
  const service = createDebtWorkflowService(fixture.db);

  const partial = await service.registerPayment("debt-1", { amount: 30, paidAt: fixedDate });
  assert.equal(partial.remainingBalance, 70);
  assert.equal(partial.status, "OPEN");
  assert.equal(partial.payments.length, 1);
  assert.equal(partial.payments[0]?.amount, 30);

  const paid = await service.registerPayment("debt-1", { amount: 70, paidAt: fixedDate, notes: "Saldo final" });
  assert.equal(paid.remainingBalance, 0);
  assert.equal(paid.status, "PAID");
  assert.equal(paid.payments.length, 2);
  assert.equal(paid.payments[1]?.notes, "Saldo final");
});

test("registerPayment rejects non-positive payments and overpayments without ledger entries", async () => {
  const fixture = createDbStub({ initialDebts: [buildDebt({ totalAmount: 100, payments: [{ id: "payment-1", amount: 80 }] })] });
  const service = createDebtWorkflowService(fixture.db);

  await assert.rejects(
    service.registerPayment("debt-1", { amount: -1, paidAt: fixedDate }),
    (error) => error instanceof DomainError && error.statusCode === 400 && error.message === "Payment amount must be positive.",
  );
  await assert.rejects(
    service.registerPayment("debt-1", { amount: 30, paidAt: fixedDate }),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Payment exceeds remaining debt balance.",
  );

  assert.equal(fixture.debts[0]?.payments.length, 1);
  assert.equal(Number(fixture.debts[0]?.payments[0]?.amount.toString()), 80);
});

test("registerPayment keeps debt unchanged when payment persistence fails inside the transaction", async () => {
  const fixture = createDbStub({
    initialDebts: [buildDebt({ totalAmount: 100, payments: [{ id: "payment-1", amount: 20 }] })],
    failPaymentCreate: true,
  });
  const service = createDebtWorkflowService(fixture.db);

  await assert.rejects(service.registerPayment("debt-1", { amount: 30, paidAt: fixedDate }), /payment insert failed/);

  const debtAfterFailure = fixture.debts[0];
  assert.equal(debtAfterFailure?.payments.length, 1);
  assert.equal(Number(debtAfterFailure?.payments[0]?.amount.toString()), 20);
});

test("registerPayment runs the balance check and ledger insert at serializable isolation", async () => {
  const fixture = createDbStub({ initialDebts: [buildDebt({ totalAmount: 100, payments: [{ id: "payment-1", amount: 80 }] })] });
  const service = createDebtWorkflowService(fixture.db);

  const updatedDebt = await service.registerPayment("debt-1", { amount: 20, paidAt: fixedDate });

  assert.equal(updatedDebt.remainingBalance, 0);
  assert.deepEqual(fixture.transactionOptions, [{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }]);
});

test("registerPayment retries a serializable write conflict and rejects if a concurrent payment consumed the balance", async () => {
  const fixture = createDbStub({
    initialDebts: [buildDebt({ totalAmount: 100, payments: [{ id: "payment-1", amount: 50 }] })],
    failFirstCommitWithConcurrentPayment: { debtId: "debt-1", amount: 30 },
  });
  const service = createDebtWorkflowService(fixture.db);

  await assert.rejects(
    service.registerPayment("debt-1", { amount: 30, paidAt: fixedDate }),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Payment exceeds remaining debt balance.",
  );

  assert.equal(fixture.debts[0]?.payments.length, 2);
  assert.equal(Number(fixture.debts[0]?.payments[1]?.amount.toString()), 30);
  assert.equal(fixture.transactionOptions.length, 2);
  assert.deepEqual(
    fixture.transactionOptions,
    Array.from({ length: 2 }, () => ({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable })),
  );
});

test("registerPayment rejects missing and already paid debts without adding payments", async () => {
  const fixture = createDbStub({ initialDebts: [buildDebt({ totalAmount: 100, payments: [{ id: "payment-1", amount: 100 }] })] });
  const service = createDebtWorkflowService(fixture.db);

  await assert.rejects(
    service.registerPayment("missing-debt", { amount: 1, paidAt: fixedDate }),
    (error) => error instanceof DomainError && error.statusCode === 404 && error.message === "Debt not found.",
  );
  await assert.rejects(
    service.registerPayment("debt-1", { amount: 1, paidAt: fixedDate }),
    (error) => error instanceof DomainError && error.statusCode === 409 && error.message === "Debt is already paid.",
  );

  assert.equal(fixture.debts[0]?.payments.length, 1);
});

test("listDebts orders newest origin dates first and derives status without crashing on historic overpayment", async () => {
  const oldestDate = new Date("2026-01-10T00:00:00.000Z");
  const newestDate = new Date("2026-02-10T00:00:00.000Z");
  const overpaidDebt = buildDebt({ id: "debt-overpaid", totalAmount: 100, payments: [{ id: "payment-over", amount: 120 }] });
  overpaidDebt.originDate = newestDate;
  const openDebt = buildDebt({ id: "debt-open", totalAmount: 90, payments: [{ id: "payment-open", amount: 30 }] });
  openDebt.originDate = oldestDate;
  const fixture = createDbStub({ initialDebts: [openDebt, overpaidDebt] });
  const service = createDebtWorkflowService(fixture.db);

  const debts = await service.listDebts();

  assert.deepEqual(
    debts.map((debt) => debt.id),
    ["debt-overpaid", "debt-open"],
  );
  assert.equal(debts[0]?.remainingBalance, 0);
  assert.equal(debts[0]?.status, "PAID");
  assert.equal(debts[1]?.remainingBalance, 60);
  assert.equal(debts[1]?.status, "OPEN");
});
