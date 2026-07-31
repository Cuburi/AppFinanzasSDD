import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "../lib/prisma-client.js";
import { rollbackBackfill } from "../../../scripts/backfill-pocket-deposit-from-available.mjs";

const prisma = new PrismaClient();
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const migrationPath = path.join(
  projectRoot,
  "prisma",
  "migrations",
  "20260728220000_add_pocket_deposit_from_available",
  "migration.sql",
);
const backfillMigrationPath = path.join(
  projectRoot,
  "prisma",
  "migrations",
  "20260729190000_backfill_pocket_deposit_from_available",
  "migration.sql",
);

const createFixture = async () => {
  const schema = `migration_fixture_${randomUUID().replaceAll("-", "")}`;
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TYPE "MovementType" AS ENUM (\'EXPENSE\', \'POCKET_DEPOSIT_EXTERNAL\')');
      await tx.$executeRawUnsafe('CREATE TABLE "Movement" ("id" TEXT PRIMARY KEY, "type" "MovementType" NOT NULL, "monthId" TEXT)');
      await tx.$executeRawUnsafe(`
        INSERT INTO "Movement" ("id", "type", "monthId")
        VALUES
          ('month-linked-external', 'POCKET_DEPOSIT_EXTERNAL', 'month-1'),
          ('month-linked-external-2', 'POCKET_DEPOSIT_EXTERNAL', 'month-2'),
          ('true-external', 'POCKET_DEPOSIT_EXTERNAL', NULL),
          ('expense', 'EXPENSE', 'month-1')
      `);
    });
  } catch (error) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    throw error;
  }

  return schema;
};

const withFixture = async (assertion: (schema: string) => Promise<void>) => {
  const schema = await createFixture();
  try {
    await assertion(schema);
  } finally {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
};

const applyMigration = async (schema: string, filePath = migrationPath) => {
  const sql = await readFile(filePath, "utf8");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    await tx.$executeRawUnsafe(sql);
  });
  return sql;
};

const allowBackfill = async (schema: string, activeDepositWriters = 0) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "${schema}"."MonthlyLedgerBackfillControl" (
      "id" TEXT PRIMARY KEY,
      "writersQuiesced" BOOLEAN NOT NULL,
      "activeDepositWriters" INTEGER NOT NULL,
      "writersEnabled" BOOLEAN NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schema}"."MonthlyLedgerBackfillControl" ("id", "writersQuiesced", "activeDepositWriters", "writersEnabled")
    VALUES ('pocket-deposit-from-available', TRUE, ${activeDepositWriters}, FALSE)
  `);
};

const countRows = async (schema: string) =>
  prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS "count" FROM "${schema}"."Movement"`);

const countRowsUsingType = async (schema: string, type: string) =>
  prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS "count" FROM "${schema}"."Movement" WHERE "type"::text = '${type}'`,
  );

const countLegacyExternalRows = async (schema: string, monthPredicate: "IS NULL" | "IS NOT NULL") =>
  prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS "count" FROM "${schema}"."Movement" WHERE "type"::text = 'POCKET_DEPOSIT_EXTERNAL' AND "monthId" ${monthPredicate}`,
  );

test("enum-only migration preserves mixed legacy rows and leaves the new value unused", async () => {
  await withFixture(async (schema) => {
    const baselineRows = await countRows(schema);
    const baselineLegacyRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_EXTERNAL");

    const sql = await applyMigration(schema);
    const totalRows = await countRows(schema);
    const legacyRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_EXTERNAL");
    const newTypeRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_FROM_AVAILABLE");

    assert.match(sql, /ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'POCKET_DEPOSIT_FROM_AVAILABLE'/);
    assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE)\b/i);
    assert.equal(totalRows[0]?.count, baselineRows[0]?.count);
    assert.equal(legacyRows[0]?.count, baselineLegacyRows[0]?.count);
    assert.equal(newTypeRows[0]?.count, 0n);
  });
});

test("enum-only migration is rerunnable without changing baseline counts or creating new-type rows", async () => {
  await withFixture(async (schema) => {
    const baselineRows = await countRows(schema);

    await applyMigration(schema);
    await applyMigration(schema);

    const totalRows = await countRows(schema);
    const newTypeRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_FROM_AVAILABLE");

    assert.equal(totalRows[0]?.count, baselineRows[0]?.count);
    assert.equal(newTypeRows[0]?.count, 0n);
  });
});

test("backfill aborts when deposit writers have not been explicitly quiesced", async () => {
  await withFixture(async (schema) => {
    await applyMigration(schema);

    await assert.rejects(
      applyMigration(schema, backfillMigrationPath),
      /requires explicitly quiesced deposit writers/,
    );

    const legacyRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_EXTERNAL");
    const availableRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_FROM_AVAILABLE");
    assert.equal(legacyRows[0]?.count, 3n);
    assert.equal(availableRows[0]?.count, 0n);
  });
});

test("backfill replays on an empty schema without an operational attestation", async () => {
  await withFixture(async (schema) => {
    await prisma.$executeRawUnsafe(`DELETE FROM "${schema}"."Movement"`);
    await applyMigration(schema);

    await applyMigration(schema, backfillMigrationPath);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe(`INSERT INTO "Movement" ("id", "type", "monthId") VALUES ('compatibility-deposit-after-empty-replay', 'POCKET_DEPOSIT_EXTERNAL', 'month-1')`);
    });

    const remainingEligibleRows = await countLegacyExternalRows(schema, "IS NOT NULL");
    assert.equal(remainingEligibleRows[0]?.count, 1n);
  });
});

test("backfill rewrites exactly eligible legacy rows and preserves null-month external deposits", async () => {
  await withFixture(async (schema) => {
    await applyMigration(schema);
    await allowBackfill(schema);

    await applyMigration(schema, backfillMigrationPath);

    const legacyRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_EXTERNAL");
    const availableRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_FROM_AVAILABLE");
    const nullMonthExternalRows = await countLegacyExternalRows(schema, "IS NULL");
    const remainingEligibleRows = await countLegacyExternalRows(schema, "IS NOT NULL");

    assert.equal(legacyRows[0]?.count, 1n);
    assert.equal(availableRows[0]?.count, 2n);
    assert.equal(nullMonthExternalRows[0]?.count, 1n);
    assert.equal(remainingEligibleRows[0]?.count, 0n);
  });
});

test("backfill is rerun-safe after all eligible legacy rows have been rewritten", async () => {
  await withFixture(async (schema) => {
    await applyMigration(schema);
    await allowBackfill(schema);

    await applyMigration(schema, backfillMigrationPath);
    await applyMigration(schema, backfillMigrationPath);

    const availableRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_FROM_AVAILABLE");
    const remainingEligibleRows = await countLegacyExternalRows(schema, "IS NOT NULL");

    assert.equal(availableRows[0]?.count, 2n);
    assert.equal(remainingEligibleRows[0]?.count, 0n);
  });
});

test("backfill installs a writer abort for late legacy month-linked external deposits", async () => {
  await withFixture(async (schema) => {
    await applyMigration(schema);
    await allowBackfill(schema);
    await applyMigration(schema, backfillMigrationPath);

    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
        await tx.$executeRawUnsafe(`INSERT INTO "Movement" ("id", "type", "monthId") VALUES ('late-legacy-writer', 'POCKET_DEPOSIT_EXTERNAL', 'month-3')`);
      }),
      /legacy pocket deposits are disabled during backfill/,
    );

    const remainingEligibleRows = await countLegacyExternalRows(schema, "IS NOT NULL");
    assert.equal(remainingEligibleRows[0]?.count, 0n);
  });
});

test("backfill waits for an in-flight legacy writer before proving no eligible rows remain", { timeout: 5_000 }, async () => {
  await withFixture(async (schema) => {
    await applyMigration(schema);
    await allowBackfill(schema);
    const writer = new PrismaClient();
    let releaseWriter!: () => void;
    const release = new Promise<void>((resolve) => { releaseWriter = resolve; });

    const writerTransaction = writer.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe(`INSERT INTO "Movement" ("id", "type", "monthId") VALUES ('in-flight-legacy', 'POCKET_DEPOSIT_EXTERNAL', 'month-3')`);
      await release;
    });
    const waitForMovementLock = async (mode: string, granted: boolean) => { while (!(await prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int AS "count" FROM pg_locks WHERE relation = '"${schema}"."Movement"'::regclass AND mode = '${mode}' AND granted = ${granted}`))[0]?.count) await new Promise<void>((resolve) => setImmediate(resolve)); };
    await waitForMovementLock("RowExclusiveLock", true); const backfill = applyMigration(schema, backfillMigrationPath);
    await waitForMovementLock("ShareRowExclusiveLock", false);
    releaseWriter();
    await writerTransaction;
    await backfill;
    await writer.$disconnect();

    const remainingEligibleRows = await countLegacyExternalRows(schema, "IS NOT NULL");
    assert.equal(remainingEligibleRows[0]?.count, 0n);
  });
});

test("rollback restores only backfilled rows, removes the guard, and accepts compatibility writers", async () => {
  await withFixture(async (schema) => {
    await applyMigration(schema);
    await prisma.$executeRawUnsafe(`INSERT INTO "${schema}"."Movement" ("id", "type", "monthId") VALUES ('preexisting-new', 'POCKET_DEPOSIT_FROM_AVAILABLE', 'month-4')`);
    await allowBackfill(schema);
    await applyMigration(schema, backfillMigrationPath);

    await rollbackBackfill(prisma, schema);
    await prisma.$executeRawUnsafe(`INSERT INTO "${schema}"."Movement" ("id", "type", "monthId") VALUES ('compatibility-writer', 'POCKET_DEPOSIT_EXTERNAL', 'month-5')`);

    const availableRows = await countRowsUsingType(schema, "POCKET_DEPOSIT_FROM_AVAILABLE");
    const legacyRows = await countLegacyExternalRows(schema, "IS NOT NULL");
    const triggers = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS "count" FROM pg_trigger WHERE tgrelid = '"${schema}"."Movement"'::regclass AND tgname = 'abortLegacyMonthLinkedExternalDeposit'`);
    assert.equal(availableRows[0]?.count, 1n);
    assert.equal(legacyRows[0]?.count, 3n);
    assert.equal(triggers[0]?.count, 0n);
  });
});

test.after(async () => {
  await prisma.$disconnect();
});
