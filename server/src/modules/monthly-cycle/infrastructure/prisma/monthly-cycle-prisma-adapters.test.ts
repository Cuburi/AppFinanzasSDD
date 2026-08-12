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
