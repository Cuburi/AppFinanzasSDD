import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";
import { createMovementUseCases, createStrictDepositToPocketUseCase, MOVEMENT_USE_CASE_NAMES, type StrictDepositToPocketInput } from "./movement-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";
import { parseDepositToPocketInput } from "../../dto/pockets.dto.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const strictDepositInputs = [
  { sourceKind: "SUBCATEGORY", monthId: "month-1", sourceSubcategoryId: "sub-market", targetPocketId: "pocket", amount: 1, occurredAt: "2026-05-10" },
  { sourceKind: "MONTH_AVAILABLE", monthId: "month-1", targetPocketId: "pocket", amount: 1, occurredAt: "2026-05-10" },
  { sourceKind: "EXTERNAL", externalSourceLabel: "Bonus", targetPocketId: "pocket", amount: 1, occurredAt: "2026-05-10" },
  // @ts-expect-error EXTERNAL deposits require provenance.
  { sourceKind: "EXTERNAL", targetPocketId: "pocket", amount: 1, occurredAt: "2026-05-10" },
  // @ts-expect-error MONTH_AVAILABLE cannot name a subcategory.
  { sourceKind: "MONTH_AVAILABLE", monthId: "month-1", sourceSubcategoryId: "sub-market", targetPocketId: "pocket", amount: 1, occurredAt: "2026-05-10" },
  // @ts-expect-error SUBCATEGORY cannot carry external provenance.
  { sourceKind: "SUBCATEGORY", monthId: "month-1", sourceSubcategoryId: "sub-market", externalSourceLabel: "Bonus", targetPocketId: "pocket", amount: 1, occurredAt: "2026-05-10" },
] satisfies StrictDepositToPocketInput[];

const month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-01T00:00:00.000Z"),
  closedAt: null,
  incomes: [{
    id: "income-1",
    monthId: "month-1",
    sourceName: "Salary",
    amount: amount(1000),
    receivedAt: new Date("2026-05-01T00:00:00.000Z"),
    notes: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  }],
  categories: [
    {
      id: "cat-food",
      name: "Food",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        { id: "sub-market", name: "Market", plannedAmount: amount(250), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 0 },
      ],
    },
  ],
  movements: [],
};

const createMovementPorts = () => {
  const calls: unknown[] = [], created: unknown[] = [];
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
    },
    movements: {
      async findById(movementId: string) {
        calls.push(["tx.movements.findById", movementId]);
        return { id: movementId, type: MovementType.EXPENSE, monthId: month.id };
      },
      async create(args: { type: MovementType; amount: Prisma.Decimal; targetPocketId?: string | null; creditCardId?: string | null }) {
        created.push(args); calls.push(["tx.movements.create", args.type, args.amount.toString(), args.targetPocketId ?? null, args.creditCardId ?? null]);
      },
      async updateExpense(input: { expenseId: string; amount: Prisma.Decimal; creditCardId?: string | null }) {
        calls.push(["tx.movements.updateExpense", input.expenseId, input.amount.toString(), input.creditCardId ?? null]);
      },
      async delete(movementId: string) {
        calls.push(["tx.movements.delete", movementId]);
      },
    },
    pockets: {
      async ensurePocketIsActive(pocketId: string, label: string) {
        calls.push(["tx.pockets.ensurePocketIsActive", pocketId, label]);
      },
    },
    creditCards: {
      async ensureCreditCardIsActive(ownerId: string, creditCardId: string) {
        calls.push(["tx.creditCards.ensureCreditCardIsActive", ownerId, creditCardId]);
      },
    },
    depositWriterGate: {
      async isEnabled() {
        calls.push(["tx.depositWriterGate.isEnabled"]);
        return true;
      },
    },
  };
  const ports = {
    months: {},
    templates: {},
    movements: {},
    incomes: {},
    structure: {},
    pockets: {},
    transactionRunner: {
      async run<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push(["transactionRunner.run"]);
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
      async runSerializable<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push(["transactionRunner.runSerializable"]);
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
    },
  } as unknown as MonthlyCyclePorts;

  return { calls, created, ports };
};

test("movement use cases expose only the expense and pocket-deposit public surface", () => {
  assert.deepEqual(MOVEMENT_USE_CASE_NAMES, ["recordExpense", "updateExpense", "deleteExpense", "depositToPocket"]);
  assert.deepEqual(Object.keys(createMovementUseCases(createMovementPorts().ports)), ["recordExpense", "updateExpense", "deleteExpense", "depositToPocket"]);
});

test("recordExpense persists an expense inside the transaction runner and returns the mapped month", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.recordExpense({
    monthId: "month-1",
    sourceSubcategoryId: "sub-market",
    amount: 75,
    description: "Market",
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });

  assert.equal(updated.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.create", "EXPENSE", "75", null, null],
    ["tx.months.findById", "month-1"],
  ]);
});

test("recordExpense validates an active owned credit card before persisting the linked expense", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.recordExpense({
    monthId: "month-1",
    sourceSubcategoryId: "sub-market",
    amount: 75,
    description: "Market",
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
    creditCardId: "card-1",
  });

  assert.equal(updated.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.creditCards.ensureCreditCardIsActive", "single-user", "card-1"],
    ["tx.movements.create", "EXPENSE", "75", null, "card-1"],
    ["tx.months.findById", "month-1"],
  ]);
});

test("recordExpense rejects inactive or unowned credit-card links before creating an expense", async () => {
  const { calls, ports } = createMovementPorts();
  const txPorts = await new Promise<Omit<MonthlyCyclePorts, "transactionRunner">>((resolve) => {
    void ports.transactionRunner.run(async (resolvedPorts) => {
      resolve(resolvedPorts);
      return undefined;
    });
  });
  txPorts.creditCards.ensureCreditCardIsActive = async (ownerId: string, creditCardId: string) => {
    calls.push(["tx.creditCards.ensureCreditCardIsActive", ownerId, creditCardId]);
    throw new Error("Credit card must exist, be owned by the current user, and be active.");
  };
  calls.splice(0, calls.length);
  const useCases = createMovementUseCases(ports);

  await assert.rejects(
    () =>
      useCases.recordExpense({
        monthId: "month-1",
        sourceSubcategoryId: "sub-market",
        amount: 75,
        occurredAt: "2026-05-10T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
        creditCardId: "inactive-card",
      }),
    /credit card must exist/i,
  );
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.creditCards.ensureCreditCardIsActive", "single-user", "inactive-card"],
  ]);
});

test("updateExpense and deleteExpense operate on the transaction-scoped expense ledger", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.updateExpense({
    monthId: "month-1",
    expenseId: "expense-1",
    sourceSubcategoryId: "sub-market",
    amount: 90,
    occurredAt: "2026-05-11T00:00:00.000Z",
      paymentMethod: PaymentMethod.NON_CASH,
      creditCardId: "card-1",
    });
  const deleted = await useCases.deleteExpense("month-1", "expense-1");

  assert.equal(updated.id, "month-1");
  assert.equal(deleted.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.findById", "expense-1"],
    ["tx.creditCards.ensureCreditCardIsActive", "single-user", "card-1"],
    ["tx.movements.updateExpense", "expense-1", "90", "card-1"],
    ["tx.months.findById", "month-1"],
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.findById", "expense-1"],
    ["tx.movements.delete", "expense-1"],
    ["tx.months.findById", "month-1"],
  ]);
});

test("depositToPocket validates the target pocket and preserves the external deposit response", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.depositToPocket({ amount: 25, targetPocketId: "pocket-safe", externalSourceLabel: "Bonus" });

  assert.equal(updated, null);
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.depositWriterGate.isEnabled"],
    ["tx.pockets.ensurePocketIsActive", "pocket-safe", "Target pocket"],
    ["tx.movements.create", "POCKET_DEPOSIT_EXTERNAL", "25", "pocket-safe", null],
  ]);
});

test("depositToPocket stores compatible month-available input with the legacy external movement type", async () => {
  const { calls, ports } = createMovementPorts();
  const useCases = createMovementUseCases(ports);

  const updated = await useCases.depositToPocket(
    parseDepositToPocketInput({
      sourceKind: "MONTH_AVAILABLE",
      monthId: "month-1",
      targetPocketId: "pocket-safe",
      amount: 25,
    }),
  );

  assert.equal(updated?.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.depositWriterGate.isEnabled"],
    ["tx.pockets.ensurePocketIsActive", "pocket-safe", "Target pocket"],
    ["tx.months.findById", "month-1"],
    ["tx.movements.create", "POCKET_DEPOSIT_EXTERNAL", "25", "pocket-safe", null],
    ["tx.months.findById", "month-1"],
  ]);
});

test("depositToPocket fails closed when the durable legacy-writer gate is disabled", async () => {
  const { calls, ports } = createMovementPorts();
  const txPorts = await new Promise<Omit<MonthlyCyclePorts, "transactionRunner">>((resolve) => {
    void ports.transactionRunner.run(async (resolvedPorts) => {
      resolve(resolvedPorts);
      return undefined;
    });
  });
  txPorts.depositWriterGate.isEnabled = async () => {
    calls.push(["tx.depositWriterGate.isEnabled"]);
    return false;
  };
  calls.splice(0, calls.length);

  await assert.rejects(
    () => createMovementUseCases(ports).depositToPocket({ amount: 25, targetPocketId: "pocket-safe", externalSourceLabel: "Bonus" }),
    { message: "Pocket deposits are temporarily disabled." },
  );
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.depositWriterGate.isEnabled"],
  ]);
});

test("strict pocket deposits persist each declared funding source only after validating current month funds", async () => {
  const cases = [
    [{ sourceKind: "SUBCATEGORY", monthId: "month-1", sourceSubcategoryId: "sub-market" }, "POCKET_DEPOSIT_FROM_SUBCATEGORY"],
    [{ sourceKind: "MONTH_AVAILABLE", monthId: "month-1" }, "POCKET_DEPOSIT_FROM_AVAILABLE"],
    [{ sourceKind: "EXTERNAL", externalSourceLabel: "  Bonus  " }, "POCKET_DEPOSIT_EXTERNAL"],
  ] as const;

  for (const [source, movementType] of cases) {
    const { calls, created, ports } = createMovementPorts();
    const result = await createStrictDepositToPocketUseCase(ports)({
      ...source,
      targetPocketId: "pocket-safe",
      amount: 25,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });

    assert.equal(result?.id ?? null, source.sourceKind === "EXTERNAL" ? null : "month-1");
    assert.deepEqual(calls.filter((call) => Array.isArray(call) && call[0] === "tx.movements.create"), [
      ["tx.movements.create", movementType, "25", "pocket-safe", null],
    ]);
    assert.equal(source.sourceKind === "EXTERNAL" ? (created[0] as { externalSourceLabel?: string | null })?.externalSourceLabel : null, source.sourceKind === "EXTERNAL" ? "Bonus" : null);
  }
});

test("strict pocket deposits reject invalid source shapes and insufficient funding before persisting a movement", async () => {
  const { calls, ports } = createMovementPorts();
  const deposit = createStrictDepositToPocketUseCase(ports);
  const uncheckedDeposit = deposit as (input: unknown) => ReturnType<typeof deposit>;

  await assert.rejects(
    () => uncheckedDeposit({ sourceKind: "MONTH_AVAILABLE", monthId: "month-1", sourceSubcategoryId: "sub-market", targetPocketId: "pocket-safe", amount: 25, occurredAt: "2026-05-10T00:00:00.000Z" }),
    { code: "INVALID_DEPOSIT_SOURCE" },
  );
  await assert.rejects(
    () => deposit({ sourceKind: "SUBCATEGORY", monthId: "month-1", sourceSubcategoryId: "sub-market", targetPocketId: "pocket-safe", amount: 300, occurredAt: "2026-05-10T00:00:00.000Z" }),
    { code: "INSUFFICIENT_FUNDS" },
  );
  for (const externalSourceLabel of [undefined, "", "   "]) await assert.rejects(
    () => uncheckedDeposit({ sourceKind: "EXTERNAL", externalSourceLabel, targetPocketId: "pocket-safe", amount: 25, occurredAt: "2026-05-10T00:00:00.000Z" }), { code: "INVALID_DEPOSIT_SOURCE" },
  );
  await assert.rejects(
    () => uncheckedDeposit({ sourceKind: "EXTERNAL", targetPocketId: "pocket-safe", amount: 25, occurredAt: "not-a-date" }),
    { code: "INVALID_DATE" },
  );
  month.status = MonthStatus.CLOSED as never;
  await assert.rejects(
    () => deposit({ sourceKind: "MONTH_AVAILABLE", monthId: "month-1", targetPocketId: "pocket-safe", amount: 25, occurredAt: "2026-05-10T00:00:00.000Z" }),
    { code: "MONTH_NOT_ACTIVE" },
  );
  month.status = MonthStatus.ACTIVE;
  assert.deepEqual(calls.filter((call) => Array.isArray(call) && call[0] === "tx.movements.create"), []);
});

test("strict pocket deposits validate and compare the normalized currency amount", async () => {
  const { calls, ports } = createMovementPorts();
  const deposit = createStrictDepositToPocketUseCase(ports);
  month.categories[0]!.subcategories[0]!.plannedAmount = amount(0.3);
  month.movements.push({
    type: MovementType.EXPENSE,
    amount: amount(0.1),
    sourceSubcategoryId: "sub-market",
    targetSubcategoryId: null,
    sourcePocketId: null,
    targetPocketId: null,
    paymentMethod: PaymentMethod.NON_CASH,
  } as never);

  try {
    await assert.rejects(
      () => (deposit as (input: unknown) => ReturnType<typeof deposit>)({ sourceKind: "EXTERNAL", targetPocketId: "pocket-safe", amount: 0.004, occurredAt: "2026-05-10T00:00:00.000Z" }),
      { code: "INVALID_AMOUNT", statusCode: 400 },
    );
    await deposit({ sourceKind: "SUBCATEGORY", monthId: "month-1", sourceSubcategoryId: "sub-market", targetPocketId: "pocket-safe", amount: 0.2, occurredAt: "2026-05-10T00:00:00.000Z" });
    assert.deepEqual(calls.filter((call) => Array.isArray(call) && call[0] === "tx.movements.create"), [
      ["tx.movements.create", "POCKET_DEPOSIT_FROM_SUBCATEGORY", "0.2", "pocket-safe", null],
    ]);
  } finally {
    month.categories[0]!.subcategories[0]!.plannedAmount = amount(250);
    month.movements.splice(0, month.movements.length);
  }
});
