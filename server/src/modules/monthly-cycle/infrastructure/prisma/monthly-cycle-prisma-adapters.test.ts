import assert from "node:assert/strict";
import test from "node:test";
import { MonthStatus, Prisma } from "../../../../lib/prisma-client.js";

import { DomainError, SemanticError } from "../../shared/service-errors.js";
import { monthInclude } from "../../shared/service-types.js";
import { createMonthlyCyclePrismaAdapters, createMonthlyCyclePrismaTransactionRunner } from "./monthly-cycle-prisma-adapters.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

test("monthly-cycle Prisma adapters expose template reads and pocket validation through explicit ports", async () => {
  const templateCategories = [
    {
      id: "template-category-1",
      name: "Fixed",
      sortOrder: 0,
      subcategories: [
        {
          id: "template-subcategory-1",
          name: "Rent",
          plannedAmount: amount(250),
          defaultPocketId: "pocket-home",
          active: true,
          sortOrder: 0,
        },
      ],
    },
  ];
  const calls: unknown[] = [];
  const db: any = {
    templateCategory: {
      async findMany(args: unknown) {
        calls.push(args);
        return templateCategories;
      },
    },
    savingsPocket: {
      async findUnique(args: unknown) {
        calls.push(args);
        return { id: "pocket-home", active: true };
      },
    },
  };

  const ports = createMonthlyCyclePrismaAdapters(db);

  assert.deepEqual(await ports.templates.readCategories(), templateCategories);
  await ports.pockets.ensurePocketIsActive("pocket-home", "Default pocket");
  assert.deepEqual(calls, [
    { orderBy: { sortOrder: "asc" }, include: { subcategories: { orderBy: { sortOrder: "asc" } } } },
    { where: { id: "pocket-home" }, select: { id: true, active: true } },
  ]);
});

test("monthly-cycle Prisma adapters expose active owned credit-card validation through an explicit port", async () => {
  const calls: unknown[] = [];
  const db: any = {
    creditCard: {
      async findFirst(args: unknown) {
        calls.push(args);
        return { id: "card-1", ownerId: "single-user", active: true };
      },
    },
  };
  const ports = createMonthlyCyclePrismaAdapters(db);

  await ports.creditCards.ensureCreditCardIsActive("single-user", "card-1");

  assert.deepEqual(calls, [
    {
      where: {
        id: "card-1",
        ownerId: "single-user",
        active: true,
      },
      select: { id: true },
    },
  ]);
});

test("monthly-cycle Prisma ledger adapter isolates two month reads", async () => {
  const calls: unknown[] = [];
  const records = { "month-1": { id: "month-1", movements: [{ id: "movement-1" }] }, "month-2": { id: "month-2", movements: [{ id: "movement-2" }] } };
  const ports = createMonthlyCyclePrismaAdapters({ month: { async findUnique(args: { where: { id: keyof typeof records } }) { calls.push(args); return records[args.where.id]; } } } as any);

  const [first, second] = await Promise.all([ports.ledger.read("month-1"), ports.ledger.read("month-2")]);

  assert.deepEqual([first.id, first.movements.map(({ id }) => id), second.id, second.movements.map(({ id }) => id)], ["month-1", ["movement-1"], "month-2", ["movement-2"]]);
  assert.deepEqual(calls, [{ where: { id: "month-1" }, include: monthInclude }, { where: { id: "month-2" }, include: monthInclude }]);
});

test("monthly-cycle Prisma credit-card validation rejects missing inactive or unowned cards", async () => {
  const db: any = {
    creditCard: {
      async findFirst() {
        return null;
      },
    },
  };
  const ports = createMonthlyCyclePrismaAdapters(db);

  await assert.rejects(() => ports.creditCards.ensureCreditCardIsActive("single-user", "missing-card"), {
    name: "DomainError",
    statusCode: 400,
    message: "Credit card must exist, be owned by the current user, and be active.",
  } as DomainError);
});

test("monthly-cycle Prisma movements persist and filter nullable credit-card references", async () => {
  const calls: unknown[] = [];
  const db: any = {
    movement: {
      async create(args: unknown) {
        calls.push(["create", args]);
      },
      async update(args: unknown) {
        calls.push(["update", args]);
      },
      async findMany(args: unknown) {
        calls.push(["findMany", args]);
        return [];
      },
    },
  };
  const ports = createMonthlyCyclePrismaAdapters(db);

  await ports.movements.create({ type: "EXPENSE", amount: amount(75), monthId: "month-1", sourceSubcategoryId: "sub-1", creditCardId: "card-1" });
  await ports.movements.updateExpense({ expenseId: "expense-1", amount: amount(90), occurredAt: new Date("2026-05-11T00:00:00.000Z"), paymentMethod: "NON_CASH", sourceSubcategoryId: "sub-1", creditCardId: null });
  await ports.movements.findExpenseHistory({ monthId: "month-1", creditCardId: "card-1" });

  assert.deepEqual(calls, [
    ["create", { data: { type: "EXPENSE", amount: amount(75), monthId: "month-1", sourceSubcategoryId: "sub-1", creditCardId: "card-1" } }],
    ["update", { where: { id: "expense-1" }, data: { amount: amount(90), description: undefined, occurredAt: new Date("2026-05-11T00:00:00.000Z"), paymentMethod: "NON_CASH", sourceSubcategoryId: "sub-1", creditCardId: null } }],
    ["findMany", { where: { monthId: "month-1", type: "EXPENSE", creditCardId: "card-1" }, orderBy: { occurredAt: "desc" } }],
  ]);
});

test("monthly-cycle Prisma pocket validation preserves existing domain error semantics", async () => {
  const db: any = {
    savingsPocket: {
      async findUnique() {
        return { id: "pocket-home", active: false };
      },
    },
  };
  const ports = createMonthlyCyclePrismaAdapters(db);

  await assert.rejects(() => ports.pockets.ensurePocketIsActive("pocket-home", "Target pocket"), {
    name: "DomainError",
    statusCode: 400,
    message: "Target pocket must exist and be active.",
  } as DomainError);
});

test("monthly-cycle transaction runner preserves default Prisma transaction options and binds tx ports", async () => {
  const transactionCalls: unknown[] = [];
  const tx: any = {
    month: {
      async findFirst() {
        return { id: "month-1", year: 2026, month: 5 };
      },
    },
    savingsPocket: {
      async findUnique() {
        return { id: "pocket-home", active: true };
      },
    },
  };
  const db: any = {
    async $transaction<T>(work: (txClient: typeof tx) => Promise<T>, options?: unknown) {
      transactionCalls.push(options);
      return work(tx);
    },
  };

  const runner = createMonthlyCyclePrismaTransactionRunner(db);
  const result = await runner.run(async (ports) => {
    await ports.pockets.ensurePocketIsActive("pocket-home", "Target pocket");
    return ports.months.findActiveSummary(MonthStatus.ACTIVE);
  });

  assert.deepEqual(transactionCalls, [undefined]);
  assert.deepEqual(result, { id: "month-1", year: 2026, month: 5 });
});

test("monthly-cycle Prisma adapters expose missing and inactive strict resources as NOT_FOUND", async () => {
  const missingMonthPorts = createMonthlyCyclePrismaAdapters({
    month: { async findUnique() { return null; } },
  } as any);
  const inactivePocketPorts = createMonthlyCyclePrismaAdapters({
    savingsPocket: { async findUnique() { return { id: "pocket-home", active: false }; } },
  } as any);

  await assert.rejects(() => missingMonthPorts.months.findById("missing-month"), {
    name: "SemanticError",
    code: "NOT_FOUND",
    statusCode: 404,
  } as SemanticError);
  await assert.rejects(() => inactivePocketPorts.pockets.ensureStrictDepositTargetPocketIsActive!("pocket-home"), {
    name: "SemanticError",
    code: "NOT_FOUND",
    statusCode: 404,
  } as SemanticError);
});

test("monthly-cycle serializable runner retries only P2034 exactly three times and exposes deterministic exhaustion", async () => {
  let attempts = 0;
  const runner = createMonthlyCyclePrismaTransactionRunner({
    async $transaction() {
      attempts += 1;
      throw Object.assign(new Error("write conflict"), { code: "P2034" });
    },
  } as never);

  await assert.rejects(() => runner.runSerializable(async () => "unreachable"), { code: "CONCURRENT_MODIFICATION", statusCode: 409 });
  assert.equal(attempts, 3);
});

test("monthly-cycle serializable runner succeeds after a retry and does not retry non-conflict failures", async () => {
  let attempts = 0;
  const retryingRunner = createMonthlyCyclePrismaTransactionRunner({
    async $transaction(work: (tx: unknown) => Promise<unknown>) {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error("write conflict"), { code: "P2034" });
      return work({});
    },
  } as never);
  const infrastructureFailure = new Error("database unavailable");
  const failingRunner = createMonthlyCyclePrismaTransactionRunner({
    async $transaction() {
      throw infrastructureFailure;
    },
  } as never);

  assert.equal(await retryingRunner.runSerializable(async () => "posted"), "posted");
  await assert.rejects(() => failingRunner.runSerializable(async () => "unreachable"), (error) => error === infrastructureFailure);
  assert.equal(attempts, 2);
});

test("monthly-cycle serializable runner retries only direct P2010 PostgreSQL 40001 conflicts", async () => {
  let attempts = 0;
  const runner = createMonthlyCyclePrismaTransactionRunner({
    async $transaction(work: (tx: unknown) => Promise<unknown>) {
      attempts += 1;
      if (attempts === 1) throw { code: "P2010", meta: { code: "40001" } };
      return work({ attempt: attempts });
    },
  } as never);

  assert.equal(await runner.runSerializable(async () => "recovered"), "recovered");
  assert.equal(attempts, 2);

  for (const error of [
    { code: "P2010" },
    { code: "P2010", meta: null },
    { code: "P2010", meta: { code: "other" } },
    { code: "P2010", meta: { cause: { code: "40001" } } },
    { code: "P2010", meta: "40001" },
    { code: "P2011", meta: { code: "40001" } },
  ]) {
    let rejectedAttempts = 0;
    const rejectingRunner = createMonthlyCyclePrismaTransactionRunner({
      async $transaction() {
        rejectedAttempts += 1;
        throw error;
      },
    } as never);

    await assert.rejects(() => rejectingRunner.runSerializable(async () => "unreachable"), (actual) => actual === error);
    assert.equal(rejectedAttempts, 1);
  }
});

test("monthly-cycle serializable runner shares three fresh Serializable attempts across P2010 and P2034", async () => {
  const transactionClients = [
    { month: { async findFirst() { return { id: "month-1", year: 2026, month: 1 }; } } },
    { month: { async findFirst() { return { id: "month-2", year: 2026, month: 2 }; } } },
    { month: { async findFirst() { return { id: "month-3", year: 2026, month: 3 }; } } },
  ];
  const options: unknown[] = [];
  const seenMonthIds: string[] = [];
  let attempts = 0;
  const runner = createMonthlyCyclePrismaTransactionRunner({
    async $transaction(work: (tx: (typeof transactionClients)[number]) => Promise<unknown>, transactionOptions?: unknown) {
      const transactionClient = transactionClients[attempts];
      attempts += 1;
      options.push(transactionOptions);
      await work(transactionClient);
      if (attempts === 1) throw { code: "P2010", meta: { code: "40001" } };
      if (attempts === 2) throw { code: "P2034" };
      return "committed";
    },
  } as never);

  const result = await runner.runSerializable(async (ports) => {
    const month = await ports.months.findActiveSummary(MonthStatus.ACTIVE);
    seenMonthIds.push(month!.id);
    return "callback-result";
  });

  assert.equal(result, "committed");
  assert.deepEqual(seenMonthIds, ["month-1", "month-2", "month-3"]);
  assert.deepEqual(options, [
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  ]);
});

test("monthly-cycle serializable runner exhausts P2010 PostgreSQL 40001 conflicts after three total attempts", async () => {
  let attempts = 0;
  const runner = createMonthlyCyclePrismaTransactionRunner({
    async $transaction() {
      attempts += 1;
      throw { code: "P2010", meta: { code: "40001" } };
    },
  } as never);

  await assert.rejects(() => runner.runSerializable(async () => "unreachable"), {
    code: "CONCURRENT_MODIFICATION",
    statusCode: 409,
  });
  assert.equal(attempts, 3);
});

test("monthly-cycle serializable runner emits immutable sanitized retry and recovery events", async () => {
  const events: unknown[] = [];
  let attempts = 0;
  const rawQueryFailure = { code: "P2010", meta: { code: "40001", query: "UPDATE pocket SET balance = 200" }, message: "account-123" };
  const runner = createMonthlyCyclePrismaTransactionRunner(
    {
      async $transaction(work: (tx: unknown) => Promise<unknown>) {
        attempts += 1;
        if (attempts === 1) throw rawQueryFailure;
        return work({});
      },
    } as never,
    (event) => events.push(event),
  );

  assert.equal(await runner.runSerializable(async () => "committed"), "committed");
  assert.deepEqual(events, [
    { attempt: 1, maxAttempts: 3, classification: "P2010_40001", outcome: "retrying" },
    { attempt: 2, maxAttempts: 3, classification: "P2010_40001", outcome: "recovered" },
  ]);
  for (const event of events) {
    assert.deepEqual(Object.keys(event as object), ["attempt", "maxAttempts", "classification", "outcome"]);
    assert.equal(Object.isFrozen(event), true);
  }
});

test("monthly-cycle serializable runner emits only immutable safe fields for exhausted telemetry", async () => {
  const events: unknown[] = [];
  let attempts = 0;
  const runner = createMonthlyCyclePrismaTransactionRunner(
    {
      async $transaction() {
        attempts += 1;
        throw {
          code: "P2010",
          meta: {
            code: "40001",
            sql: "UPDATE savings_pocket SET balance = 200.00",
            accountId: "account-123",
            availableMoney: "200.00",
          },
          message: "Failed for account-123 with balance 200.00",
        };
      },
    } as never,
    (event) => {
      events.push(event);
      throw new Error("observer failed");
    },
  );

  await assert.rejects(() => runner.runSerializable(async () => "unreachable"), {
    code: "CONCURRENT_MODIFICATION",
    statusCode: 409,
  });
  assert.equal(attempts, 3);
  assert.deepEqual(events, [
    { attempt: 1, maxAttempts: 3, classification: "P2010_40001", outcome: "retrying" },
    { attempt: 2, maxAttempts: 3, classification: "P2010_40001", outcome: "retrying" },
    { attempt: 3, maxAttempts: 3, classification: "P2010_40001", outcome: "exhausted" },
  ]);
  for (const event of events) {
    assert.deepEqual(Object.keys(event as object), ["attempt", "maxAttempts", "classification", "outcome"]);
    assert.equal(Object.isFrozen(event), true);
    assert.equal(JSON.stringify(event).includes("UPDATE savings_pocket"), false);
    assert.equal(JSON.stringify(event).includes("account-123"), false);
    assert.equal(JSON.stringify(event).includes("200.00"), false);
    assert.equal(JSON.stringify(event).includes("meta"), false);
    assert.equal(JSON.stringify(event).includes("error"), false);
  }
});

test("monthly-cycle serializable runner keeps a first-attempt success silent for observers", async () => {
  let attempts = 0;
  let observerCalls = 0;
  const runner = createMonthlyCyclePrismaTransactionRunner(
    {
      async $transaction(work: (tx: unknown) => Promise<unknown>) {
        attempts += 1;
        return work({});
      },
    } as never,
    () => {
      observerCalls += 1;
    },
  );

  assert.equal(await runner.runSerializable(async () => "committed"), "committed");
  assert.equal(attempts, 1);
  assert.equal(observerCalls, 0);
});

test("monthly-cycle serializable runner isolates observers that throw during retry, recovery, and exhaustion", async () => {
  let retryAttempts = 0;
  const retryingRunner = createMonthlyCyclePrismaTransactionRunner(
    {
      async $transaction(work: (tx: unknown) => Promise<unknown>) {
        retryAttempts += 1;
        if (retryAttempts === 1) throw { code: "P2010", meta: { code: "40001" } };
        return work({});
      },
    } as never,
    () => {
      throw new Error("observer failed");
    },
  );
  assert.equal(await retryingRunner.runSerializable(async () => "recovered"), "recovered");
  assert.equal(retryAttempts, 2);

  let recoveryAttempts = 0;
  let durableEffects = 0;
  const recoveryRunner = createMonthlyCyclePrismaTransactionRunner(
    {
      async $transaction(work: (tx: unknown) => Promise<unknown>) {
        recoveryAttempts += 1;
        const result = await work({});
        if (recoveryAttempts === 1) throw { code: "P2034" };
        durableEffects += 1;
        return result;
      },
    } as never,
    () => {
      throw new Error("observer failed");
    },
  );
  assert.equal(await recoveryRunner.runSerializable(async () => "committed"), "committed");
  assert.equal(recoveryAttempts, 2);
  assert.equal(durableEffects, 1);

  let exhaustionAttempts = 0;
  const exhaustionRunner = createMonthlyCyclePrismaTransactionRunner(
    {
      async $transaction() {
        exhaustionAttempts += 1;
        throw { code: "P2034" };
      },
    } as never,
    () => {
      throw new Error("observer failed");
    },
  );
  await assert.rejects(() => exhaustionRunner.runSerializable(async () => "unreachable"), {
    code: "CONCURRENT_MODIFICATION",
    statusCode: 409,
  });
  assert.equal(exhaustionAttempts, 3);
});
