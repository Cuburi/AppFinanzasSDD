import assert from "node:assert/strict";
import test from "node:test";

import { MovementType, Prisma, PrismaClient } from "../../../../lib/prisma-client.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import { createStrictDepositToPocketUseCase } from "../../application/use-cases/movement-use-cases.js";
import { createLedgerUseCases } from "../../application/use-cases/ledger-use-cases.js";
import { createCashUseCases } from "../../application/use-cases/cash-use-cases.js";
import { createClosureUseCases } from "../../application/use-cases/closure-use-cases.js";
import { createIncomeUseCases } from "../../application/use-cases/income-use-cases.js";
import { createMonthStructureUseCases } from "../../application/use-cases/month-structure-use-cases.js";
import { createMovementUseCases } from "../../application/use-cases/movement-use-cases.js";
import { createMovementService } from "../../workflows/movement-service.js";
import type { MonthlyCyclePorts } from "../../application/ports/monthly-cycle-ports.js";
import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "./monthly-cycle-prisma-adapters.js";

const prisma = new PrismaClient();


test.after(async () => prisma.$disconnect());

const createDeterministicP2010RecoveryRunner = () => {
  const realRunner = createMonthlyCyclePrismaTransactionRunner(prisma as never);
  let attemptCount = 0;

  return {
    attempts: () => attemptCount,
    transactionRunner: {
      run: realRunner.run,
      runSerializable<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        return realRunner.runSerializable(async (ports) => {
          attemptCount += 1;
          return work({
            ...ports,
            depositWriterGate: { async isEnabled() { return true; } },
            movements: {
              ...ports.movements,
              async create(input) {
                await ports.movements.create(input);
                if (attemptCount === 1) throw { code: "P2010", meta: { code: "40001" } };
              },
            },
          });
        });
      },
    },
  };
};

test("qualifying P2010 recovery rolls back the first real PostgreSQL write and commits exactly once", async () => {
  if (!process.env.DATABASE_URL?.includes("appfinanzas_dev")) throw new Error("This integration test requires the dev PostgreSQL profile.");
  const id = `rm026-recovery-${Date.now()}`;
  const year = 5500 + (Date.now() % 1000);
  const occurredAt = new Date(Date.UTC(year, 0, 10));
  const month = await prisma.month.create({ data: { year, month: 1, openedAt: new Date(Date.UTC(year, 0, 1)) } });
  const pocket = await prisma.savingsPocket.create({ data: { name: id } });
  await prisma.monthlyIncome.create({ data: { monthId: month.id, sourceName: id, amount: new Prisma.Decimal("0.30"), receivedAt: occurredAt } });
  const { transactionRunner, attempts } = createDeterministicP2010RecoveryRunner();
  const deposit = createStrictDepositToPocketUseCase({ ...createMonthlyCyclePrismaAdapters(prisma as never), transactionRunner });

  try {
    await deposit({ sourceKind: "MONTH_AVAILABLE", monthId: month.id, targetPocketId: pocket.id, amount: 0.2, occurredAt: occurredAt.toISOString() });
    assert.equal(attempts(), 2);
    assert.equal(await prisma.movement.count({ where: { monthId: month.id, targetPocketId: pocket.id } }), 1);
    const balances = calculateMonthBalances(await createMonthlyCyclePrismaAdapters(prisma as never).months.findById(month.id));
    assert.equal(balances.availableMoney, 0.1);
    assert.equal(balances.pocketBalances.get(pocket.id), 0.2);
  } finally {
    await prisma.month.delete({ where: { id: month.id } });
    await prisma.savingsPocket.delete({ where: { id: pocket.id } });
  }
});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
};

const fixtureYearBase = 2200 + (Date.now() % 800);
let fixtureSequence = 0;

const createMonthFixture = async (id: string) => {
  const year = fixtureYearBase + fixtureSequence++;
  const occurredAt = new Date(Date.UTC(year, 0, 10));
  const month = await prisma.month.create({
    data: {
      year,
      month: 1,
      openedAt: new Date(Date.UTC(year, 0, 1)),
      categories: { create: [{ name: id, sortOrder: 0, subcategories: { create: [{ name: id, plannedAmount: new Prisma.Decimal(100), sortOrder: 0 }, { name: `${id}-empty`, plannedAmount: new Prisma.Decimal(0), sortOrder: 1 }] } }, { name: `${id}-empty-category`, sortOrder: 1 }] },
    },
    include: { categories: { include: { subcategories: true } } },
  });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const emptySubcategoryId = month.categories[0]?.subcategories[1]?.id ?? "";
  const emptyCategoryId = month.categories[1]?.id ?? "";
  const income = await prisma.monthlyIncome.create({ data: { monthId: month.id, sourceName: id, amount: new Prisma.Decimal(100), receivedAt: occurredAt } });
  const expense = await prisma.movement.create({ data: { type: MovementType.EXPENSE, amount: new Prisma.Decimal(100), monthId: month.id, sourceSubcategoryId: subcategoryId, paymentMethod: "NON_CASH", occurredAt } });
  const pocket = await prisma.savingsPocket.create({ data: { name: id } });
  return { month, occurredAt, subcategoryId, emptySubcategoryId, emptyCategoryId, income, expense, pocket };
};

type MonthFixture = Awaited<ReturnType<typeof createMonthFixture>>;

type WriterDefinition = {
  name: string;
  write: (fixture: MonthFixture, ports: MonthlyCyclePorts) => Promise<unknown>;
};

type FailureDetail = {
  name: string;
  message: string;
  code?: string;
  statusCode?: number;
};

type MatrixOutcome = {
  writer: string;
  status: "passed" | "failed";
  error?: FailureDetail;
};

type CleanupOutcome = {
  writer: string;
  status: "passed" | "failed" | "not-required";
  error?: FailureDetail;
};

class CloseFirstMatrixAggregateError extends Error {
  constructor(
    readonly writerOutcomes: MatrixOutcome[],
    readonly cleanupOutcomes: CleanupOutcome[],
  ) {
    super(`Close-first matrix reported failures: ${[
      ...writerOutcomes.filter(({ status }) => status === "failed"),
      ...cleanupOutcomes.filter(({ status }) => status === "failed"),
    ].map(({ writer, error }) => `${writer}: ${error?.name ?? "Error"}: ${error?.message ?? "unknown failure"}`).join("; ")}`);
  }
}

const describeFailure = (failure: unknown): FailureDetail => {
  if (!failure || typeof failure !== "object") return { name: "Error", message: String(failure) };

  const error = failure as { name?: unknown; message?: unknown; code?: unknown; statusCode?: unknown };
  return {
    name: typeof error.name === "string" ? error.name : "Error",
    message: typeof error.message === "string" ? error.message : String(failure),
    ...(typeof error.code === "string" ? { code: error.code } : {}),
    ...(typeof error.statusCode === "number" ? { statusCode: error.statusCode } : {}),
  };
};

const createLockSignalRunner = (onLock: () => Promise<void>) => {
  const real = createMonthlyCyclePrismaTransactionRunner(prisma as never);
  return {
    run: <T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) =>
      real.run((ports) => work({ ...ports, months: { ...ports.months, async lockForMutation(monthId) { const month = await ports.months.lockForMutation(monthId); await onLock(); return month; } } })),
    runSerializable: <T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) =>
      real.runSerializable((ports) => work({ ...ports, months: { ...ports.months, async lockForMutation(monthId) { const month = await ports.months.lockForMutation(monthId); await onLock(); return month; } } })),
  };
};

const createLockAttemptSignalRunner = (onLockAttempt: (writerPid: number) => void) => {
  const instrument = <T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) => async (tx: Prisma.TransactionClient) => {
    const ports = createMonthlyCyclePrismaAdapters(tx as never);
    const [{ writerPid }] = await tx.$queryRaw<Array<{ writerPid: number }>>`SELECT pg_backend_pid()::int AS "writerPid"`;
    return work({ ...ports, months: { ...ports.months, async lockForMutation(monthId) { onLockAttempt(writerPid); return ports.months.lockForMutation(monthId); } } });
  };

  return {
    run: <T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) => prisma.$transaction(instrument(work)),
    async runSerializable<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          return await prisma.$transaction(instrument(work), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        } catch (error) {
          const serializationFailure = Boolean(
            error
            && typeof error === "object"
            && "code" in error
            && "meta" in error
            && error.code === "P2010"
            && error.meta
            && typeof error.meta === "object"
            && "code" in error.meta
            && error.meta.code === "40001",
          );
          if (!serializationFailure || attempt === 3) throw error;
        }
      }

      throw new Error("Unreachable serializable transaction retry exhaustion.");
    },
  };
};

const readBlockedMonthMutation = async (writerPid: number) =>
  prisma.$queryRaw<Array<{ writerPid: number; closePid: number }>>`
    SELECT waiter.pid::int AS "writerPid", blocker.pid::int AS "closePid"
    FROM pg_locks AS waiter
    JOIN pg_locks AS blocker
      ON blocker.locktype = 'transactionid'
      AND blocker.transactionid = waiter.transactionid
      AND blocker.granted
    JOIN pg_locks AS heldMonthRelation
      ON heldMonthRelation.pid = blocker.pid
      AND heldMonthRelation.locktype = 'relation'
      AND heldMonthRelation.relation = '"Month"'::regclass
      AND heldMonthRelation.mode = 'RowShareLock'
      AND heldMonthRelation.granted
    JOIN pg_locks AS waitingMonthRelation
      ON waitingMonthRelation.pid = waiter.pid
      AND waitingMonthRelation.locktype = 'relation'
      AND waitingMonthRelation.relation = '"Month"'::regclass
      AND waitingMonthRelation.mode = 'RowShareLock'
      AND waitingMonthRelation.granted
    WHERE waiter.pid = ${writerPid}
      AND waiter.locktype = 'transactionid'
      AND NOT waiter.granted
  `;

const waitForBlockedMonthMutation = async (writer: WriterDefinition, writerPid: number, competingWriter: Promise<unknown>) => {
  for (;;) {
    const blockedWriters = await readBlockedMonthMutation(writerPid);
    if (blockedWriters.length > 0) return blockedWriters;

    const writerState = await Promise.race([
      competingWriter.then(() => "settled" as const, () => "settled" as const),
      new Promise<"pending">((resolve) => setImmediate(() => resolve("pending"))),
    ]);
    assert.equal(writerState, "pending", `${writer.name} completed before PostgreSQL blocked it on the held Month lock`);
  }
};

const closeFirstWriterFactories: WriterDefinition[] = [
  { name: "recordExpense", write: (fixture, ports) => createMovementUseCases(ports).recordExpense({ monthId: fixture.month.id, sourceSubcategoryId: fixture.subcategoryId, amount: 1, occurredAt: fixture.occurredAt.toISOString(), paymentMethod: "NON_CASH" }) },
  { name: "updateExpense", write: (fixture, ports) => createMovementUseCases(ports).updateExpense({ monthId: fixture.month.id, expenseId: fixture.expense.id, sourceSubcategoryId: fixture.subcategoryId, amount: 1, occurredAt: fixture.occurredAt.toISOString(), paymentMethod: "NON_CASH" }) },
  { name: "deleteExpense", write: (fixture, ports) => createMovementUseCases(ports).deleteExpense(fixture.month.id, fixture.expense.id) },
  { name: "compatibilityDepositToPocket", write: (fixture, ports) => createMovementService(ports).depositToPocket({ sourceKind: "SUBCATEGORY", monthId: fixture.month.id, sourceSubcategoryId: fixture.subcategoryId, targetPocketId: fixture.pocket.id, amount: 1, occurredAt: fixture.occurredAt.toISOString() }) },
  { name: "strictDepositToPocket", write: (fixture, ports) => createStrictDepositToPocketUseCase(ports)({ sourceKind: "SUBCATEGORY", monthId: fixture.month.id, sourceSubcategoryId: fixture.subcategoryId, targetPocketId: fixture.pocket.id, amount: 1, occurredAt: "2026-01-10T00:00:00.000Z" }) },
  { name: "createMonthlyIncome", write: (fixture, ports) => createIncomeUseCases(ports).createMonthlyIncome({ monthId: fixture.month.id, sourceName: "late", amount: 1, receivedAt: fixture.occurredAt.toISOString() }) },
  { name: "updateMonthlyIncome", write: (fixture, ports) => createIncomeUseCases(ports).updateMonthlyIncome({ monthId: fixture.month.id, incomeId: fixture.income.id, sourceName: "late" }) },
  { name: "deleteMonthlyIncome", write: (fixture, ports) => createIncomeUseCases(ports).deleteMonthlyIncome(fixture.month.id, fixture.income.id) },
  { name: "withdrawCash", write: (fixture, ports) => createCashUseCases(ports).withdrawCash({ monthId: fixture.month.id, amount: 1, occurredAt: fixture.occurredAt.toISOString() }) },
  { name: "createMonthCategory", write: (fixture, ports) => createMonthStructureUseCases(ports).createMonthCategory({ monthId: fixture.month.id, name: "late", addToTemplate: false }) },
  { name: "updateMonthCategory", write: (fixture, ports) => createMonthStructureUseCases(ports).updateMonthCategory({ monthId: fixture.month.id, categoryId: fixture.emptyCategoryId, name: "late" }) },
  { name: "deleteMonthCategory", write: (fixture, ports) => createMonthStructureUseCases(ports).deleteMonthCategory(fixture.month.id, fixture.emptyCategoryId) },
  { name: "createMonthSubcategory", write: (fixture, ports) => createMonthStructureUseCases(ports).createMonthSubcategory({ monthId: fixture.month.id, categoryId: fixture.emptyCategoryId, name: "late", plannedAmount: 0, addToTemplate: false }) },
  { name: "updateMonthSubcategory", write: (fixture, ports) => createMonthStructureUseCases(ports).updateMonthSubcategory({ monthId: fixture.month.id, subcategoryId: fixture.emptySubcategoryId, name: "late", plannedAmount: 0 }) },
  { name: "deleteMonthSubcategory", write: (fixture, ports) => createMonthStructureUseCases(ports).deleteMonthSubcategory(fixture.month.id, fixture.emptySubcategoryId) },
  { name: "applyClosureAction", write: (fixture, ports) => createClosureUseCases(ports).applyClosureAction({ monthId: fixture.month.id, type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE, sourceSubcategoryId: fixture.subcategoryId, targetPocketId: fixture.pocket.id }) },
];

const runCloseFirstWriterMatrix = async ({
  afterWriter,
  afterCleanup,
}: {
  afterWriter?: (writer: WriterDefinition, index: number) => void | Promise<void>;
  afterCleanup?: (writer: WriterDefinition, index: number) => void | Promise<void>;
} = {}) => {
  const writerOutcomes: MatrixOutcome[] = [];
  const cleanupOutcomes: CleanupOutcome[] = [];

  for (const [index, writer] of closeFirstWriterFactories.entries()) {
    let fixture: MonthFixture | undefined;
    const releaseClose = deferred();
    let closing: Promise<unknown> | undefined;
    let competingWriter: Promise<unknown> | undefined;

    try {
      const currentFixture = await createMonthFixture(`rm026-close-first-${index}-${Date.now()}`);
      fixture = currentFixture;
      const closeLocked = deferred();
      const base = createMonthlyCyclePrismaAdapters(prisma as never);
      const close = createClosureUseCases({ ...base, transactionRunner: createLockSignalRunner(async () => { closeLocked.resolve(); await releaseClose.promise; }) });
      closing = close.closeMonth(currentFixture.month.id);
      await closeLocked.promise;
      let resolveLockAttempt!: (writerPid: number) => void;
      const lockAttempted = new Promise<number>((resolve) => { resolveLockAttempt = resolve; });
      const ports = { ...base, transactionRunner: createLockAttemptSignalRunner(resolveLockAttempt) } as MonthlyCyclePorts;
      const writerPromise = Promise.resolve().then(() => writer.write(currentFixture, ports));
      competingWriter = writerPromise;
      let settled = false;
      void writerPromise.then(() => { settled = true; }, () => { settled = true; });
      const lockAttempt = await Promise.race([
        lockAttempted.then((writerPid) => ({ state: "attempted" as const, writerPid })),
        writerPromise.then(() => ({ state: "settled" as const }), () => ({ state: "settled" as const })),
      ]);
      assert.equal(lockAttempt.state, "attempted", `${writer.name} bypassed the Month lock before close released it`);
      assert.equal(settled, false, `${writer.name} completed before PostgreSQL could block it on the held Month lock`);
      if (lockAttempt.state !== "attempted") throw new Error(`${writer.name} did not expose a PostgreSQL writer PID.`);
      const blockedWriters = await waitForBlockedMonthMutation(writer, lockAttempt.writerPid, writerPromise);
      assert.equal(blockedWriters.length, 1, `${writer.name} must be the only session blocked by close's Month lock`);
      assert.notEqual(blockedWriters[0]?.writerPid, blockedWriters[0]?.closePid);
      releaseClose.resolve();
      await closing;
      const reason = await writerPromise.then(
        () => { throw new Error("Expected closed-month writer rejection."); },
        (reason) => reason,
      );
      assert.equal(reason.code, "MONTH_NOT_ACTIVE", `${writer.name} must observe the closed month after locking`);
      assert.equal(reason.statusCode, 409);
      assert.equal((await prisma.month.findUniqueOrThrow({ where: { id: currentFixture.month.id } })).status, "CLOSED");
      assert.equal(await prisma.movement.count({ where: { monthId: currentFixture.month.id } }), 1);
      assert.equal(await prisma.monthlyIncome.count({ where: { monthId: currentFixture.month.id } }), 1);
      await afterWriter?.(writer, index);
      writerOutcomes.push({ writer: writer.name, status: "passed" });
    } catch (error) {
      writerOutcomes.push({ writer: writer.name, status: "failed", error: describeFailure(error) });
    } finally {
      releaseClose.resolve();
      await Promise.allSettled([closing, competingWriter].filter((operation): operation is Promise<unknown> => operation !== undefined));
      if (!fixture) {
        cleanupOutcomes.push({ writer: writer.name, status: "not-required" });
      } else {
        try {
          await prisma.month.deleteMany({ where: { id: fixture.month.id } });
          await prisma.savingsPocket.deleteMany({ where: { id: fixture.pocket.id } });
          await afterCleanup?.(writer, index);
          cleanupOutcomes.push({ writer: writer.name, status: "passed" });
        } catch (error) {
          cleanupOutcomes.push({ writer: writer.name, status: "failed", error: describeFailure(error) });
        }
      }
    }
  }

  if (writerOutcomes.some(({ status }) => status === "failed") || cleanupOutcomes.some(({ status }) => status === "failed")) {
    throw new CloseFirstMatrixAggregateError(writerOutcomes, cleanupOutcomes);
  }

  return { writerOutcomes, cleanupOutcomes };
};

test("close-first serializes every month mutator behind the real PostgreSQL row lock", async () => {
  if (!process.env.DATABASE_URL?.includes("appfinanzas_dev")) throw new Error("This integration test requires the dev PostgreSQL profile.");
  const { writerOutcomes, cleanupOutcomes } = await runCloseFirstWriterMatrix();
  assert.deepEqual(writerOutcomes, closeFirstWriterFactories.map(({ name }) => ({ writer: name, status: "passed" })));
  assert.deepEqual(cleanupOutcomes, closeFirstWriterFactories.map(({ name }) => ({ writer: name, status: "passed" })));
});

test("close-first matrix aggregates injected writer and cleanup failures after executing every writer", async () => {
  if (!process.env.DATABASE_URL?.includes("appfinanzas_dev")) throw new Error("This integration test requires the dev PostgreSQL profile.");
  const injectedWriter = "deleteExpense";
  const injectedCleanup = "compatibilityDepositToPocket";

  const error = await runCloseFirstWriterMatrix({
    afterWriter(writer) {
      if (writer.name === injectedWriter) throw new Error("injected writer failure");
    },
    afterCleanup(writer) {
      if (writer.name === injectedCleanup) throw new Error("injected cleanup failure");
    },
  }).then(
    () => { throw new Error("Expected aggregated close-first matrix failure."); },
    (reason) => reason,
  );

  assert.ok(error instanceof CloseFirstMatrixAggregateError);
  assert.equal(error.writerOutcomes.length, 16);
  assert.equal(error.cleanupOutcomes.length, 16);
  assert.deepEqual(error.writerOutcomes.find(({ writer }) => writer === injectedWriter), {
    writer: injectedWriter,
    status: "failed",
    error: { name: "Error", message: "injected writer failure" },
  });
  assert.deepEqual(error.cleanupOutcomes.find(({ writer }) => writer === injectedCleanup), {
    writer: injectedCleanup,
    status: "failed",
    error: { name: "Error", message: "injected cleanup failure" },
  });
  assert.deepEqual(error.writerOutcomes.map(({ writer }) => writer), closeFirstWriterFactories.map(({ name }) => name));
  assert.deepEqual(error.cleanupOutcomes.map(({ writer }) => writer), closeFirstWriterFactories.map(({ name }) => name));
});

test("expense-first makes close reread the committed expense before rejecting an invalid closure", async () => {
  if (!process.env.DATABASE_URL?.includes("appfinanzas_dev")) throw new Error("This integration test requires the dev PostgreSQL profile.");
  const fixture = await createMonthFixture(`rm026-expense-first-${Date.now()}`);
  const writerLocked = deferred();
  const releaseWriter = deferred();
  const closeAttempted = deferred();
  const base = createMonthlyCyclePrismaAdapters(prisma as never);
  const writer = createMovementUseCases({ ...base, transactionRunner: createLockSignalRunner(async () => { writerLocked.resolve(); await releaseWriter.promise; }) });
  const real = createMonthlyCyclePrismaTransactionRunner(prisma as never);
  const close = createClosureUseCases({
    ...base,
    transactionRunner: {
      run: <T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) => real.run((ports) => work({ ...ports, months: { ...ports.months, async lockForMutation(monthId) { closeAttempted.resolve(); return ports.months.lockForMutation(monthId); } } })),
      runSerializable: real.runSerializable,
    },
  });

  try {
    const updatingExpense = writer.updateExpense({ monthId: fixture.month.id, expenseId: fixture.expense.id, sourceSubcategoryId: fixture.subcategoryId, amount: 101, occurredAt: fixture.occurredAt.toISOString(), paymentMethod: "NON_CASH" });
    await writerLocked.promise;
    const closing = close.closeMonth(fixture.month.id);
    await closeAttempted.promise;
    releaseWriter.resolve();
    await updatingExpense;
    await assert.rejects(closing, (error: unknown) => Boolean(error && typeof error === "object" && "statusCode" in error && error.statusCode === 409));
    assert.equal((await prisma.month.findUniqueOrThrow({ where: { id: fixture.month.id } })).status, "ACTIVE");
    assert.equal((await prisma.movement.findUniqueOrThrow({ where: { id: fixture.expense.id } })).amount.toString(), "101");
  } finally {
    await prisma.month.deleteMany({ where: { id: fixture.month.id } });
    await prisma.savingsPocket.deleteMany({ where: { id: fixture.pocket.id } });
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
    }
  }
});
