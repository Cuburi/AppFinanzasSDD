import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createClosureUseCases } from "./closure-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";
import type { MonthRecord } from "../../shared/service-types.js";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const fixture = (openingBalance: number, expense = 60) => {
  let row = {
    id: "month-ack", year: 2026, month: 11, status: "ACTIVE",
    openedAt: new Date("2026-11-01T00:00:00Z"), closedAt: null,
    openingBalance, incomes: [],
    categories: [{
      id: "category", name: "Travel", sortOrder: 0,
      subcategories: [{ id: "transport", name: "Transporte", plannedAmount: 50, sortOrder: 0, defaultPocketId: null }],
    }],
    movements: [{
      id: "expense", type: "EXPENSE", amount: expense, paymentMethod: "NON_CASH",
      sourceSubcategoryId: "transport", targetSubcategoryId: null, sourcePocketId: null, targetPocketId: null,
    }],
  } as unknown as MonthRecord;
  let writes = 0;
  const months = {
    async findById() { return row; },
    async lockForMutation() { return row; },
    async close(_id: string, allocation: { carryAmount: number; excludedAmount: number; shortfallAmount?: number }) {
      writes++;
      row = {
        ...row, status: "CLOSED", closedAt: new Date("2026-11-30T00:00:00Z"),
        closureCarryAmount: allocation.carryAmount,
        closureExcludedAmount: allocation.excludedAmount,
        closureShortfallAmount: allocation.shortfallAmount ?? 0,
      } as unknown as MonthRecord;
      return row;
    },
  };
  const ports = {
    months,
    transactionRunner: { async run(work: (p: unknown) => Promise<unknown>) { return work({ months }); } },
  } as unknown as MonthlyCyclePorts;
  return {
    service: createClosureUseCases(ports),
    row: () => row,
    replace: (next: MonthRecord) => { row = next; },
    writes: () => writes,
  };
};

test("warnings (positive, zero and negative availability) close once after acknowledgement without changing financial data", async () => {
  for (const opening of [560, 60, 0]) {
    const f = fixture(opening);
    const review = await f.service.getClosureReview("month-ack");
    assert.equal(review.availableMoney, opening - 60);
    assert.equal(review.requiresAcknowledgement, true);
    const financial = hash([f.row().categories, f.row().movements]);
    const before = hash(f.row());
    const input = { carryAmount: Math.max(0, opening - 60), excludedAmount: 0, shortfallAmount: Math.max(0, 60 - opening) };
    await assert.rejects(() => f.service.closeMonth("month-ack", input), {
      statusCode: 409,
      message: "Debe confirmar que entiende los avisos antes de cerrar el mes.",
    });
    assert.equal(hash(f.row()), before);
    const closed = await f.service.closeMonth("month-ack", { ...input, acknowledgedWarningsKey: review.warningsKey! });
    assert.equal(hash([f.row().categories, f.row().movements]), financial);
    assert.deepEqual(await f.service.closeMonth("month-ack", input), closed);
    assert.equal(f.writes(), 1);
  }
});

test("close validates the locked state, not the earlier review", async () => {
  const f = fixture(560);
  const review = await f.service.getClosureReview("month-ack");
  assert.equal(review.availableMoney, 500);
  f.replace({ ...f.row(), openingBalance: 559 } as unknown as MonthRecord);
  const before = hash(f.row());
  await assert.rejects(
    () => f.service.closeMonth("month-ack", { carryAmount: 500, excludedAmount: 0, acknowledgedWarningsKey: review.warningsKey! }),
    { statusCode: 409, message: "La distribución del cierre debe ser igual al dinero disponible actual. Actualice la revisión del cierre." },
  );
  assert.equal(hash(f.row()), before);
  assert.equal(f.writes(), 0);
});

test("warning-only changes invalidate acknowledgement without changing availability", async () => {
  const f = fixture(560);
  const review = await f.service.getClosureReview("month-ack");
  const row = f.row();
  f.replace({ ...row, categories: row.categories.map(category => ({ ...category, subcategories: category.subcategories.map(sub => ({ ...sub, plannedAmount: 40 })) })) } as unknown as MonthRecord);
  const before = hash(f.row());
  assert.equal((await f.service.getClosureReview("month-ack")).availableMoney, review.availableMoney);
  await assert.rejects(() => f.service.closeMonth("month-ack", { carryAmount: 500, excludedAmount: 0, acknowledgedWarningsKey: review.warningsKey! }), {
    statusCode: 409, message: "Los avisos del cierre cambiaron. Actualice la revisión del cierre.",
  });
  assert.equal((await f.service.getMonth("month-ack")).status, "ACTIVE");
  assert.equal(hash(f.row()), before);
  assert.equal(f.writes(), 0);
});

test("an acknowledgement for warnings that have since cleared is rejected as stale", async () => {
  const f = fixture(560);
  const review = await f.service.getClosureReview("month-ack");
  assert.equal(review.requiresAcknowledgement, true);
  const row = f.row();
  f.replace({ ...row, categories: row.categories.map(category => ({ ...category, subcategories: category.subcategories.map(sub => ({ ...sub, plannedAmount: 60 })) })) } as unknown as MonthRecord);
  const cleared = await f.service.getClosureReview("month-ack");
  assert.equal(cleared.requiresAcknowledgement, false);
  assert.equal(cleared.availableMoney, review.availableMoney);
  const before = hash(f.row());
  await assert.rejects(() => f.service.closeMonth("month-ack", { carryAmount: 500, excludedAmount: 0, acknowledgedWarningsKey: review.warningsKey! }), {
    statusCode: 409, message: "Los avisos del cierre cambiaron. Actualice la revisión del cierre.",
  });
  assert.equal((await f.service.getMonth("month-ack")).status, "ACTIVE");
  assert.equal(hash(f.row()), before);
  assert.equal(f.writes(), 0);
});

test("a legacy closure with NULL shortfall maps and retries as zero shortfall", async () => {
  const f = fixture(560);
  f.replace({ ...f.row(), status: "CLOSED", closureCarryAmount: 500, closureExcludedAmount: 0, closureShortfallAmount: null } as unknown as MonthRecord);
  const before = hash(f.row());
  const closed = await f.service.closeMonth("month-ack", { carryAmount: 500, excludedAmount: 0, shortfallAmount: 0 });
  assert.equal(closed.closureAllocation?.shortfallAmount, 0);
  assert.equal(hash(f.row()), before);
  assert.equal(f.writes(), 0);
});
