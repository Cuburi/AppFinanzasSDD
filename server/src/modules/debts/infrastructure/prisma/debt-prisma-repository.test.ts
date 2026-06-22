import test from "node:test";
import assert from "node:assert/strict";

import { Prisma } from "../../../../lib/prisma-client.js";
import { createDebtPrismaRepository } from "./debt-prisma-repository.js";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));
const fixedDate = new Date("2026-05-23T00:00:00.000Z");

const buildRecord = ({
  id = "debt-1",
  totalAmount = 100,
  payments = [],
}: {
  id?: string;
  totalAmount?: number;
  payments?: Array<{ id: string; amount: number; paidAt?: Date; notes?: string | null }>;
} = {}) => ({
  id,
  direction: "I_OWE" as const,
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

test("DebtPrismaRepository maps Decimal debt records to domain debts and always includes payments", async () => {
  const calls: unknown[] = [];
  const repository = createDebtPrismaRepository({
    debt: {
      async findMany(args?: unknown) {
        calls.push(args);
        return [buildRecord({ payments: [{ id: "payment-1", amount: 40 }] })];
      },
      async findUnique(args: unknown) {
        calls.push(args);
        return buildRecord({ id: "debt-2", payments: [{ id: "payment-2", amount: 10 }] });
      },
      async create() {
        throw new Error("Not used.");
      },
    },
    debtPayment: {
      async create() {
        throw new Error("Not used.");
      },
    },
  });

  const debts = await repository.findAll();
  const debt = await repository.findById("debt-2");

  assert.equal(debts[0]?.totalAmount, 100);
  assert.equal(debts[0]?.payments[0]?.amount, 40);
  assert.equal(debt?.id, "debt-2");
  assert.equal(debt?.payments[0]?.amount, 10);
  assert.deepEqual(calls, [
    { include: { payments: true } },
    { where: { id: "debt-2" }, include: { payments: true } },
  ]);
});

test("DebtPrismaRepository converts domain amounts to Decimal for debt and payment writes", async () => {
  const creates: unknown[] = [];
  const repository = createDebtPrismaRepository({
    debt: {
      async findMany() {
        throw new Error("Not used.");
      },
      async findUnique() {
        throw new Error("Not used.");
      },
      async create(args: unknown) {
        creates.push(args);
        return buildRecord({ id: "debt-created", totalAmount: 250_000 });
      },
    },
    debtPayment: {
      async create(args: unknown) {
        creates.push(args);
        return { id: "payment-1" };
      },
    },
  });

  const createdDebt = await repository.create({
    direction: "OWED_TO_ME",
    counterpartyName: "Laura",
    description: "Prestamo personal",
    totalAmount: 250_000,
    currency: "COP",
    originDate: fixedDate,
  });
  await repository.addPayment("debt-created", { amount: 20, paidAt: fixedDate, notes: null });

  assert.equal(createdDebt.totalAmount, 250_000);
  assert.deepEqual(creates, [
    {
      data: {
        direction: "OWED_TO_ME",
        counterpartyName: "Laura",
        description: "Prestamo personal",
        totalAmount: money(250_000),
        currency: "COP",
        originDate: fixedDate,
      },
      include: { payments: true },
    },
    {
      data: {
        debtId: "debt-created",
        amount: money(20),
        paidAt: fixedDate,
        notes: null,
      },
    },
  ]);
});
