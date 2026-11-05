import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "../../lib/prisma-client.js";
import { createMonthlyCycleModule } from "./monthly-cycle.module.js";

const prisma = new PrismaClient();
const assertIsolatedDev = () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.port, "5433");
  assert.equal(url.pathname, "/appfinanzas_dev");
  // These tests reset the Template, so locally they need a disposable schema; CI uses an ephemeral database.
  const schema = url.searchParams.get("schema") ?? "";
  if (process.env.CI === "true" && schema === "public") return;
  assert.match(schema, /^guided_closure_t1_[a-z0-9_]+$/);
};
test.after(() => prisma.$disconnect());

test("guided closure PostgreSQL persists decisions and serializes close/open retries without duplicate funding", async () => {
  assertIsolatedDev();
  const service = createMonthlyCycleModule({ db: prisma }).service;
  const ids: string[] = [];
  try {
    await service.updateTemplate({ categories: [{ name: "Guided fixture", subcategories: [{ name: "Budget", plannedAmount: 100 }] }] });
    const december = await service.openMonth({ year: 2098, month: 12 });
    ids.push(december.id);
    await service.createMonthlyIncome({ monthId: december.id, sourceName: "Salary", amount: 1_000_000.3, receivedAt: "2098-12-01" });
    await service.withdrawCash({ monthId: december.id, amount: 100, occurredAt: "2098-12-02" });
    await service.recordExpense({ monthId: december.id, sourceSubcategoryId: null, amount: 700_000, occurredAt: "2098-12-03", paymentMethod: "NON_CASH" });
    const before = await service.recordExpense({ monthId: december.id, sourceSubcategoryId: null, amount: 20, occurredAt: "2098-12-03", paymentMethod: "CASH" });
    const allocation = { carryAmount: 100_000.1, excludedAmount: 199_900.2 };
    await assert.rejects(() => service.closeMonth(december.id, { ...allocation, excludedAmount: 199_900.19 }), { statusCode: 409 });
    assert.deepEqual(await service.getMonth(december.id), before);
    const [first, retry] = await Promise.all([service.closeMonth(december.id, allocation), service.closeMonth(december.id, allocation)]);
    assert.deepEqual(first, retry);
    assert.equal(first.availableMoney, 299_900.3);
    assert.equal(first.cashBalance, 80);
    assert.deepEqual(first.incomes, before.incomes);
    assert.deepEqual(first.categories, before.categories);
    const reloaded = createMonthlyCycleModule({ db: prisma }).service;
    assert.deepEqual(await reloaded.getMonth(december.id), first);
    assert.deepEqual(await reloaded.getLatestClosedMonth(), first);
    await assert.rejects(() => reloaded.closeMonth(december.id, { carryAmount: 0, excludedAmount: 299_900.3 }), { statusCode: 409 });
    const opens = await Promise.allSettled([service.openMonth({ year: 2099, month: 1 }), service.openMonth({ year: 2099, month: 1 })]);
    const successes = opens.filter((result) => result.status === "fulfilled");
    assert.equal(successes.length, 1);
    const january = successes[0]!.value;
    ids.push(january.id);
    const rejected = opens.find((result) => result.status === "rejected");
    assert.equal(rejected?.reason.statusCode, 409);
    assert.equal(january.openingBalance, 100_000.1);
    assert.equal(january.openingSourceMonthId, december.id);
    assert.equal(january.monthlyIncomeTotal, 0);
    assert.equal(january.cashBalance, 80);
    assert.equal((await service.getCashSummary(january.id)).events.length, 1);
    await assert.rejects(() => service.openMonth({ year: 2099, month: 1 }), { statusCode: 409 });
    const funded = await service.withdrawCash({ monthId: january.id, amount: 0.1, occurredAt: "2099-01-02" });
    assert.equal(funded.month.availableMoney, 100_000);
    assert.equal(funded.month.monthlyIncomeTotal, 0);
    const report = await service.getBasicReport(january.id);
    const ledger = await service.getMonthlyLedger({ monthId: january.id, includeSystemEvents: true });
    assert.equal(report.summary.availableMoney, 100_000);
    assert.equal(report.summary.totalPlanned, 100);
    assert.equal(ledger.entries.reduce((sum, entry) => sum + entry.balanceEffects.availableMoney, 0), 100_000);
    assert.equal(ledger.entries.filter((entry) => entry.eventType === "OPENING_BALANCE").length, 1);
    assert.equal((await service.getMonthlyLedger({ monthId: january.id, includeSystemEvents: false })).entries.some((entry) => entry.eventType === "OPENING_BALANCE"), false);
    await service.closeMonth(january.id, { carryAmount: 0, excludedAmount: 100_000 });
  } finally {
    // Only fixture IDs in the caller's new isolated schema, recipients before sources.
    for (const id of ids.reverse()) {
      await prisma.movement.deleteMany({ where: { monthId: id } });
      await prisma.month.delete({ where: { id } });
    }
    await service.updateTemplate({ categories: [] });
  }
});

test("guided closure additive migration preserves preexisting closed rows with zero opening and legacy metadata", async () => {
  assertIsolatedDev();
  const schema = `guided_migration_${randomUUID().replaceAll("-", "")}`;
  const sql = await readFile(new URL("../../../../prisma/migrations/20261104030000_guided_monthly_closure/migration.sql", import.meta.url), "utf8");
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe(`CREATE TYPE "MonthStatus" AS ENUM ('ACTIVE', 'CLOSED')`);
      await tx.$executeRawUnsafe(`CREATE TABLE "Month" ("id" TEXT PRIMARY KEY, "status" "MonthStatus" NOT NULL, "closedAt" TIMESTAMP)`);
      await tx.$executeRawUnsafe(`INSERT INTO "Month" VALUES ('legacy', 'CLOSED', '2026-01-31')`);
      for (const statement of sql.split(";").filter((part) => part.trim())) await tx.$executeRawUnsafe(statement);
      const rows = await tx.$queryRawUnsafe<Array<{ id: string; status: string; openingBalance: { toString(): string }; openingSourceMonthId: string | null; closureCarryAmount: unknown; closureExcludedAmount: unknown }>>('SELECT * FROM "Month"');
      assert.equal(rows.length, 1);
      assert.equal(rows[0]!.id, "legacy");
      assert.equal(rows[0]!.status, "CLOSED");
      assert.equal(rows[0]!.openingBalance.toString(), "0");
      assert.equal(rows[0]!.openingSourceMonthId, null);
      assert.equal(rows[0]!.closureCarryAmount, null);
      assert.equal(rows[0]!.closureExcludedAmount, null);
    });
  } finally {
    await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  }
});
