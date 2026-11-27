import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, MovementType, Prisma } from "../../../../lib/prisma-client.js";
import { CLOSURE_USE_CASE_NAMES, createClosureUseCases } from "./closure-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";
import type { MonthRecord } from "../../shared/service-types.js";
import type { CloseMonthInput } from "../../dto/closure.dto.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

const balancedMonth = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-01T00:00:00.000Z"),
  closedAt: null,
  incomes: [
    {
      id: "income-1",
      monthId: "month-1",
      sourceName: "Salary",
      amount: amount(300),
      receivedAt: new Date("2026-05-01T00:00:00.000Z"),
      notes: null,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  ],
  categories: [
    {
      id: "cat-food",
      name: "Food",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        { id: "sub-market", name: "Market", plannedAmount: amount(100), defaultPocketId: "pocket-food", templateSubcategoryId: null, sortOrder: 0 },
        { id: "sub-rent", name: "Rent", plannedAmount: amount(200), defaultPocketId: null, templateSubcategoryId: null, sortOrder: 1 },
      ],
    },
  ],
  movements: [
    { id: "expense-market", type: MovementType.EXPENSE, amount: amount(100), sourceSubcategoryId: "sub-market", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "expense-rent", type: MovementType.EXPENSE, amount: amount(200), sourceSubcategoryId: "sub-rent", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const surplusMonth = {
  ...balancedMonth,
  movements: [
    { id: "expense-rent", type: MovementType.EXPENSE, amount: amount(200), sourceSubcategoryId: "sub-rent", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const deficitMonth = {
  ...balancedMonth,
  movements: [
    { id: "expense-market", type: MovementType.EXPENSE, amount: amount(150), sourceSubcategoryId: "sub-market", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
    { id: "expense-rent", type: MovementType.EXPENSE, amount: amount(150), sourceSubcategoryId: "sub-rent", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null },
  ],
};

const createClosurePorts = (month: MonthRecord = balancedMonth) => {
  const calls: unknown[] = [];
  let lockCalls = 0;
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
      async lockForMutation(monthId: string) {
        lockCalls += 1;
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
      async close(monthId: string) {
        calls.push(["tx.months.close", monthId]);
        return { ...month, status: MonthStatus.CLOSED, closedAt: new Date("2026-05-31T00:00:00.000Z") };
      },
    },
    movements: {
      async create(args: { type: MovementType; amount: Prisma.Decimal; sourceSubcategoryId?: string | null; targetSubcategoryId?: string | null; sourcePocketId?: string | null; targetPocketId?: string | null }) {
        calls.push([
          "tx.movements.create",
          args.type,
          args.amount.toString(),
          args.sourceSubcategoryId ?? null,
          args.targetSubcategoryId ?? null,
          args.sourcePocketId ?? null,
          args.targetPocketId ?? null,
        ]);
      },
    },
    pockets: {
      async ensurePocketIsActive(pocketId: string, label: string) {
        calls.push(["tx.pockets.ensurePocketIsActive", pocketId, label]);
      },
    },
  };
  const ports = {
    months: {
      async findById(monthId: string) {
        calls.push(["months.findById", monthId]);
        return month;
      },
    },
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
    },
  } as unknown as MonthlyCyclePorts;

  return { calls, ports, getLockCalls: () => lockCalls };
};

test("warnings require acknowledgement and permit explicit negative closure", async () => {
  const negative = { ...deficitMonth, incomes: [] };
  const { ports, calls } = createClosurePorts(negative);
  const service = createClosureUseCases(ports);
  const review = await service.getClosureReview(negative.id);
  assert.equal(review.requiresAcknowledgement, true);
  assert.equal(review.shortfallAmount, 300);
  assert.equal(review.canClose, false);
  await assert.rejects(() => service.closeMonth(negative.id, { carryAmount: 0, excludedAmount: 0, shortfallAmount: 300 }),
    { statusCode: 409, message: "Debe confirmar que entiende los avisos antes de cerrar el mes." });
  assert.equal((await service.getMonth(negative.id)).status, "ACTIVE");
  assert.equal((await service.getMonth(negative.id)).closureAllocation, null);
  assert.equal(calls.some((call) => (call as string[])[0] === "tx.months.close"), false);
  const closed = await service.closeMonth(negative.id, { carryAmount: 0, excludedAmount: 0, shortfallAmount: 300, acknowledgedWarnings: true });
  assert.equal(closed.status, "CLOSED");
});

test("closure mutations lock the owning month before evaluating mutable state", async () => {
  const closePorts = createClosurePorts();

  await createClosureUseCases(closePorts.ports).closeMonth("month-1");

  assert.equal(closePorts.getLockCalls(), 1);
});

test("closure use cases expose only the closure public surface", () => {
  assert.deepEqual(CLOSURE_USE_CASE_NAMES, ["getClosureReview", "closeMonth", "getMonth", "getLatestClosedMonth"]);
  assert.deepEqual(Object.keys(createClosureUseCases(createClosurePorts().ports)).sort(), [...CLOSURE_USE_CASE_NAMES].sort());
});

test("getClosureReview reads the month through the month repository port and reports pending balances", async () => {
  const { calls, ports } = createClosurePorts(surplusMonth);
  const useCases = createClosureUseCases(ports);

  const review = await useCases.getClosureReview("month-1");

  assert.equal(review.monthId, "month-1");
  assert.equal(review.canClose, false);
  assert.deepEqual(review.pendingSurpluses, [
    { subcategoryId: "sub-market", subcategoryName: "Market", amount: 100, defaultPocketId: "pocket-food", requiresPocketSelection: false },
  ]);
  assert.deepEqual(calls, [["months.findById", "month-1"]]);
});

test("closure keeps surplus as informational budget variance when uncategorized spending reconciles month money", () => {
  const uncategorizedExpenseMonth = {
    ...balancedMonth,
    incomes: [{ ...balancedMonth.incomes[0]!, amount: amount(10_000) }],
    categories: [{
      ...balancedMonth.categories[0]!,
      subcategories: [{ ...balancedMonth.categories[0]!.subcategories[0]!, plannedAmount: amount(10_000) }],
    }],
    movements: [{
      id: "expense-uncategorized",
      type: MovementType.EXPENSE,
      amount: amount(10_000),
      paymentMethod: "NON_CASH" as const,
      sourceSubcategoryId: null,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    }],
  };

  const review = createClosureUseCases(createClosurePorts(uncategorizedExpenseMonth).ports).getClosureReview("month-1");

  return review.then((value) => {
    assert.equal(value.availableMoney, 0);
    assert.equal(value.canClose, true);
    assert.deepEqual(value.budgetVariances, [{ subcategoryId: "sub-market", subcategoryName: "Market", amount: 10_000, kind: "SURPLUS", informational: true }]);
  });
});

test("acknowledged subcategory warnings close without creating cover movements", async () => {
  const { calls, ports } = createClosurePorts(deficitMonth);
  const service = createClosureUseCases(ports);
  assert.equal((await service.getClosureReview("month-1")).requiresAcknowledgement, true);
  await assert.rejects(() => service.closeMonth("month-1", { carryAmount: 0, excludedAmount: 0 }), { statusCode: 409, message: "Debe confirmar que entiende los avisos antes de cerrar el mes." });
  assert.equal((await service.getMonth("month-1")).status, "ACTIVE");
  assert.equal((await service.getMonth("month-1")).closureAllocation, null);
  assert.equal((await service.closeMonth("month-1", { carryAmount: 0, excludedAmount: 0, acknowledgedWarnings: true })).status, "CLOSED");
  assert.equal(calls.some(call => (call as string[])[0] === "tx.movements.create"), false);
});

test("stale confirmed amounts reject without mutating the month", async () => {
  const negativeMonth: MonthRecord = { ...deficitMonth, incomes: [] };
  const cases: Array<[MonthRecord, CloseMonthInput]> = [
    [surplusMonth, { carryAmount: 99, excludedAmount: 0 }],
    [negativeMonth, { carryAmount: 0, excludedAmount: 0, shortfallAmount: 299 }],
    [surplusMonth, { carryAmount: 101, excludedAmount: 0, shortfallAmount: 1 }],
  ];
  for (const [month, allocation] of cases) {
    const { ports, calls } = createClosurePorts(month);
    const service = createClosureUseCases(ports);
    const before = await service.getMonth("month-1");
    await assert.rejects(() => service.closeMonth("month-1", { ...allocation, acknowledgedWarnings: true }), { statusCode: 409, message: "La distribución del cierre debe ser igual al dinero disponible actual. Actualice la revisión del cierre." });
    assert.deepEqual(await service.getMonth("month-1"), before);
    assert.equal(calls.some(call => (call as string[])[0] === "tx.months.close"), false);
  }
});

test("closeMonth keeps closure validation and month close inside the transaction runner", async () => {
  const { calls, ports } = createClosurePorts();
  const useCases = createClosureUseCases(ports);

  const month = await useCases.closeMonth("month-1");

  assert.equal(month.status, "CLOSED");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.months.close", "month-1"],
  ]);
});
