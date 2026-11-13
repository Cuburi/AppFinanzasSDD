import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Prisma, PrismaClient } from "../lib/prisma-client.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const migrationPath = path.join(projectRoot, "prisma/migrations/20261112000000_date_only_business_dates/migration.sql");
const backfillMigrationPath = path.join(projectRoot, "prisma/migrations/20260729190000_backfill_pocket_deposit_from_available/migration.sql");

const fields = [
  { table: "Movement", column: "occurredAt", amount: "amount", indexPrefix: "monthId" },
  { table: "MonthlyIncome", column: "receivedAt", amount: "amount", indexPrefix: "monthId" },
  { table: "Debt", column: "originDate", amount: "totalAmount", indexPrefix: "direction" },
  { table: "DebtPayment", column: "paidAt", amount: "amount", indexPrefix: "debtId" },
] as const;
const cases = [
  ["2026-11-01T01:14:15.250", "2026-10-31"],
  ["2026-10-31T20:00:00.000", "2026-10-31"],
  ["2026-05-10T00:00:00.000", "2026-05-09"],
  ["2026-01-01T04:59:59.999", "2025-12-31"],
  ["2026-01-01T05:00:00.000", "2026-01-01"],
] as const;

// Never load an env file or fall back to a personal/non-local database.
const createDevClient = () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, "Migration tests require an explicit dev DATABASE_URL.");
  const url = new URL(databaseUrl);
  assert.ok(
    ["postgres:", "postgresql:"].includes(url.protocol)
      && ["localhost", "127.0.0.1"].includes(url.hostname)
      && url.port === "5433"
      && url.pathname === "/appfinanzas_dev",
    "Migration tests require the local dev profile (port 5433, database appfinanzas_dev).",
  );
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
};

test("business-date migration converts all four UTC timestamps to Bogota days without changing other data", async () => {
  // Read first: before the migration exists this test fails with ENOENT, without connecting.
  const sql = await readFile(migrationPath, "utf8");
  const backfillSql = await readFile(backfillMigrationPath, "utf8");
  const prisma = createDevClient();
  const schema = `migration_fixture_${randomUUID().replaceAll("-", "")}`;
  let schemaCreated = false;

  const inSchema = async <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) =>
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'Pacific/Auckland'");
      return work(tx);
    });

  const snapshot = async () => {
    const result: Record<string, unknown> = {};
    for (const { table, column } of fields) {
      result[table] = await prisma.$queryRawUnsafe(
        `SELECT to_jsonb(t) - '${column}' AS data FROM "${schema}"."${table}" t ORDER BY "id"`,
      );
    }
    return result;
  };
  const indexes = () => prisma.$queryRawUnsafe(
    `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = '${schema}' ORDER BY indexname`,
  );

  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    // Relevant pre-migration shape, matching the existing isolated-schema fixture pattern.
    await inSchema(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE TYPE "MovementType" AS ENUM ('EXPENSE', 'POCKET_DEPOSIT_EXTERNAL', 'POCKET_DEPOSIT_FROM_SUBCATEGORY', 'POCKET_DEPOSIT_FROM_AVAILABLE')`);
      for (const { table, column, amount, indexPrefix } of fields) {
        const extras = table === "Movement"
          ? ', "type" "MovementType" NOT NULL, "monthId" TEXT'
          : table === "MonthlyIncome" ? ', "monthId" TEXT NOT NULL'
            : table === "Debt" ? ', "direction" TEXT NOT NULL' : ', "debtId" TEXT NOT NULL';
        await tx.$executeRawUnsafe(`CREATE TABLE "${table}" (
          "id" TEXT PRIMARY KEY,
          "${column}" TIMESTAMP(3) NOT NULL ${table === "Movement" ? "DEFAULT CURRENT_TIMESTAMP" : ""},
          "${amount}" DECIMAL(12,2) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          ${extras}
        )`);
        await tx.$executeRawUnsafe(`CREATE INDEX "${table}_${indexPrefix}_${column}_idx" ON "${table}" ("${indexPrefix}", "${column}")`);
      }
      await tx.$executeRawUnsafe('CREATE INDEX "Movement_monthId_type_occurredAt_idx" ON "Movement" ("monthId", "type", "occurredAt")');
      // Empty replay installs the actual existing INSERT/UPDATE trigger without an attestation.
      await tx.$executeRawUnsafe(backfillSql);
      for (const { table, column, amount, indexPrefix } of fields) {
        for (const [i, [instant]] of cases.entries()) {
          const extraColumns = table === "Movement" ? ', "type"' : "";
          const extraValues = table === "Movement" ? ", 'EXPENSE'" : "";
          await tx.$executeRawUnsafe(`INSERT INTO "${table}" ("id", "${column}", "${amount}", "createdAt", "${indexPrefix}"${extraColumns})
            VALUES ('row-${i}', TIMESTAMP '${instant}', ${100 + i}.25, TIMESTAMP '2026-11-12 12:34:56.789', 'fixture-link'${extraValues})`);
        }
      }
    });

    const before = await snapshot();
    const indexesBefore = await indexes();
    await inSchema(async (tx) => {
      // This migration contains only simple ALTER TABLE statements, not function bodies.
      for (const statement of sql.split(";").filter((part) => part.trim())) {
        await tx.$executeRawUnsafe(statement);
      }
    });

    assert.deepEqual(await snapshot(), before, "row counts and every non-business-date value must be preserved");
    assert.deepEqual(await indexes(), indexesBefore, "existing indexes must be preserved");
    for (const { table, column } of fields) {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string; day: string }>>(
        `SELECT "id", "${column}"::text AS day FROM "${schema}"."${table}" ORDER BY "id"`,
      );
      assert.deepEqual(rows, cases.map(([, day], i) => ({ id: `row-${i}`, day })), `${table}.${column}`);
      const metadata = await prisma.$queryRawUnsafe<Array<{ data_type: string; column_default: string | null; is_nullable: string }>>(
        `SELECT data_type, column_default, is_nullable FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${table}' AND column_name = '${column}'`,
      );
      assert.deepEqual(metadata, [{ data_type: "date", column_default: null, is_nullable: "NO" }]);
      const timestamps = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(
        `SELECT data_type FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${table}' AND column_name = 'createdAt'`,
      );
      assert.deepEqual(timestamps, [{ data_type: "timestamp without time zone" }]);
    }

    await assert.rejects(inSchema((tx) => tx.$executeRawUnsafe(`INSERT INTO "Movement" ("id", "type", "amount") VALUES ('missing-date', 'EXPENSE', 1)`)), /Code: `23502`/);
    assert.deepEqual(await snapshot(), before, "rejected insert must leave all stored rows unchanged");

    // The existing trigger still permits ordinary writes and rejects disabled legacy writers.
    await inSchema(async (tx) => {
      await tx.$executeRawUnsafe(`UPDATE "MonthlyLedgerBackfillControl" SET "writersEnabled" = FALSE`);
      await tx.$executeRawUnsafe(`UPDATE "Movement" SET "occurredAt" = DATE '2026-10-31' WHERE "id" = 'row-0'`);
    });
    await assert.rejects(inSchema((tx) => tx.$executeRawUnsafe(`INSERT INTO "Movement" ("id", "type", "amount", "occurredAt") VALUES ('legacy-writer', 'POCKET_DEPOSIT_EXTERNAL', 1, DATE '2026-10-31')`)), /legacy pocket deposits are disabled during backfill/);
    assert.deepEqual(await snapshot(), before, "trigger rejection must leave stored rows unchanged");
  } finally {
    try {
      if (schemaCreated) await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await prisma.$disconnect();
    }
  }
});
