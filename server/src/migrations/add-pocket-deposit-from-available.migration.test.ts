import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "../lib/prisma-client.js";

const prisma = new PrismaClient();
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const migrationPath = path.join(
  projectRoot,
  "prisma",
  "migrations",
  "20260728220000_add_pocket_deposit_from_available",
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

const applyMigration = async (schema: string) => {
  const sql = await readFile(migrationPath, "utf8");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    await tx.$executeRawUnsafe(sql);
  });
  return sql;
};

const countRows = async (schema: string) =>
  prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS "count" FROM "${schema}"."Movement"`);

const countRowsUsingType = async (schema: string, type: string) =>
  prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS "count" FROM "${schema}"."Movement" WHERE "type"::text = '${type}'`,
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

test.after(async () => {
  await prisma.$disconnect();
});
