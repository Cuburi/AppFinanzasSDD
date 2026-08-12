import assert from "node:assert/strict";
import test from "node:test";

import { MovementType, Prisma, PrismaClient } from "../../../../lib/prisma-client.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import { createStrictDepositToPocketUseCase } from "../../application/use-cases/movement-use-cases.js";
import { createLedgerUseCases } from "../../application/use-cases/ledger-use-cases.js";
import type { MonthlyCyclePorts } from "../../application/ports/monthly-cycle-ports.js";
import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "./monthly-cycle-prisma-adapters.js";

const prisma = new PrismaClient();

test("strict deposits reread limited funds after a real PostgreSQL conflict and prevent overspending", async () => {
  if (!process.env.DATABASE_URL?.includes("appfinanzas_dev")) throw new Error("This integration test requires the dev PostgreSQL profile.");
  const id = `slice4-race-${Date.now()}`;
  const year = 2200 + (Date.now() % 1000);
  const occurredAt = new Date(Date.UTC(year, 0, 10));
  const month = await prisma.month.create({ data: { year, month: 1, openedAt: new Date(Date.UTC(year, 0, 1)) } });
  const pocket = await prisma.savingsPocket.create({ data: { name: id } });
  await prisma.monthlyIncome.create({ data: { monthId: month.id, sourceName: id, amount: new Prisma.Decimal("0.30"), receivedAt: occurredAt } });
  let reads = 0;
  let release: (() => void) | undefined;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const realRunner = createMonthlyCyclePrismaTransactionRunner(prisma as never);
  const transactionRunner = {
    run: realRunner.run,
    runSerializable<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
      return realRunner.runSerializable(async (ports) => work({
        ...ports,
        depositWriterGate: { async isEnabled() { return true; } },
        months: {
          ...ports.months,
          async findById(monthId) {
            const currentMonth = await ports.months.findById(monthId);
            reads += 1;
            if (reads <= 2) {
              if (reads === 2) release?.();
              await barrier;
            }
            return currentMonth;
          },
        },
      }));
    },
  };
  const deposit = createStrictDepositToPocketUseCase({ ...createMonthlyCyclePrismaAdapters(prisma as never), transactionRunner });
  const post = () => deposit({ sourceKind: "MONTH_AVAILABLE", monthId: month.id, targetPocketId: pocket.id, amount: 0.2, occurredAt: occurredAt.toISOString() });

  try {
    const results = await Promise.allSettled([post(), post()]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    if (!rejected || rejected.status !== "rejected") throw new Error("Expected one rejected competing deposit.");
    assert.equal(rejected.reason.code, "INSUFFICIENT_FUNDS");
    assert.equal(rejected.reason.statusCode, 409);
    assert.ok(reads >= 3);
    const movements = await prisma.movement.findMany({ where: { monthId: month.id, targetPocketId: pocket.id } });
    assert.deepEqual(movements.map((movement) => ({ type: movement.type, amount: movement.amount.toString(), monthId: movement.monthId, targetPocketId: movement.targetPocketId })), [
      { type: MovementType.POCKET_DEPOSIT_FROM_AVAILABLE, amount: "0.2", monthId: month.id, targetPocketId: pocket.id },
    ]);
    const balances = calculateMonthBalances(await createMonthlyCyclePrismaAdapters(prisma as never).months.findById(month.id));
    assert.equal(balances.availableMoney, 0.1);
    assert.equal(balances.pocketBalances.get(pocket.id), 0.2);
  } finally {
    await prisma.month.delete({ where: { id: month.id } });
    await prisma.savingsPocket.delete({ where: { id: pocket.id } });
    await prisma.$disconnect();
  }
});

test("strict deposit rolls back all effects when persistence fails after its movement write", async () => {
  if (!process.env.DATABASE_URL?.includes("appfinanzas_dev")) throw new Error("This integration test requires the dev PostgreSQL profile.");
  const id = `slice4-rollback-${Date.now()}`;
  const year = 3300 + (Date.now() % 1000);
  const occurredAt = new Date(Date.UTC(year, 0, 10));
  const month = await prisma.month.create({ data: { year, month: 1, openedAt: new Date(Date.UTC(year, 0, 1)) } });
  const pocket = await prisma.savingsPocket.create({ data: { name: id } });
  await prisma.monthlyIncome.create({ data: { monthId: month.id, sourceName: id, amount: new Prisma.Decimal("0.30"), receivedAt: occurredAt } });
  const realRunner = createMonthlyCyclePrismaTransactionRunner(prisma as never);
  const transactionRunner = {
    run: realRunner.run,
    runSerializable<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
      return realRunner.runSerializable((ports) => work({
        ...ports,
        depositWriterGate: { async isEnabled() { return true; } },
        movements: {
          ...ports.movements,
          async create(input) {
            await ports.movements.create(input);
            throw new Error("force rollback");
          },
        },
      }));
    },
  };
  const deposit = createStrictDepositToPocketUseCase({ ...createMonthlyCyclePrismaAdapters(prisma as never), transactionRunner });

  try {
    await assert.rejects(() => deposit({ sourceKind: "MONTH_AVAILABLE", monthId: month.id, targetPocketId: pocket.id, amount: 0.2, occurredAt: occurredAt.toISOString() }), /force rollback/);
    assert.equal(await prisma.movement.count({ where: { monthId: month.id, targetPocketId: pocket.id } }), 0);
    const balances = calculateMonthBalances(await createMonthlyCyclePrismaAdapters(prisma as never).months.findById(month.id));
    assert.equal(balances.availableMoney, 0.3);
    assert.equal(balances.pocketBalances.get(pocket.id), undefined);
  } finally {
    await prisma.month.delete({ where: { id: month.id } });
    await prisma.savingsPocket.delete({ where: { id: pocket.id } });
    await prisma.$disconnect();
  }
});

test("ledger reads through the PostgreSQL adapter isolate two months", async () => {
  if (!process.env.DATABASE_URL?.includes("appfinanzas_dev")) throw new Error("This integration test requires the dev PostgreSQL profile.");
  const year = 4400 + (Date.now() % 1000);
  const monthIds: string[] = [];

  try {
    const firstMonth = await prisma.month.create({ data: { year, month: 1, openedAt: new Date(Date.UTC(year, 0, 1)) } });
    monthIds.push(firstMonth.id);
    const secondMonth = await prisma.month.create({ data: { year, month: 2, openedAt: new Date(Date.UTC(year, 1, 1)) } });
    monthIds.push(secondMonth.id);
    await Promise.all([prisma.monthlyIncome.create({ data: { monthId: firstMonth.id, sourceName: "first", amount: new Prisma.Decimal(1), receivedAt: new Date(Date.UTC(year, 0, 2)) } }), prisma.monthlyIncome.create({ data: { monthId: secondMonth.id, sourceName: "second", amount: new Prisma.Decimal(2), receivedAt: new Date(Date.UTC(year, 1, 2)) } })]);
    const ledger = createLedgerUseCases(createMonthlyCyclePrismaAdapters(prisma as never) as MonthlyCyclePorts);
    const [first, second] = await Promise.all([ledger.getMonthlyLedger({ monthId: firstMonth.id, includeSystemEvents: false }), ledger.getMonthlyLedger({ monthId: secondMonth.id, includeSystemEvents: false })]);
    assert.deepEqual([first.monthId, first.entries.map((entry) => [entry.amount, entry.metadata.description]), second.monthId, second.entries.map((entry) => [entry.amount, entry.metadata.description])], [firstMonth.id, [[1, null]], secondMonth.id, [[2, null]]]);
  } finally {
    try {
      await prisma.month.deleteMany({ where: { id: { in: monthIds } } });
    } finally {
      await prisma.$disconnect();
    }
  }
});
