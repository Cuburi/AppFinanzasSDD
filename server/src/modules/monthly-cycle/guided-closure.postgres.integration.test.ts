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
  assert.match(url.searchParams.get("schema") ?? "", /^guided_closure_t1_[a-z0-9_]+$/);
};
test.after(() => prisma.$disconnect());

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
