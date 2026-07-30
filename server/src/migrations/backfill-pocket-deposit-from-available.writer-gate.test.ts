import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaClient } from "../lib/prisma-client.js";
import { quiesceDepositWriters, reenableDepositWriters } from "../../../scripts/backfill-pocket-deposit-from-available.mjs";

const prisma = new PrismaClient();

const withFixture = async (assertion: (schema: string) => Promise<void>) => {
  const schema = `writer_gate_${randomUUID().replaceAll("-", "")}`;
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  await prisma.$executeRawUnsafe(`CREATE TYPE "${schema}"."MovementType" AS ENUM ('POCKET_DEPOSIT_EXTERNAL', 'POCKET_DEPOSIT_FROM_SUBCATEGORY')`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "${schema}"."Movement" ("id" TEXT PRIMARY KEY, "type" "${schema}"."MovementType" NOT NULL, "monthId" TEXT)`);
  try { await assertion(schema); } finally { await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
};

const inSchema = async <T>(client: PrismaClient, schema: string, work: (tx: PrismaClient) => Promise<T>) =>
  client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    return work(tx as PrismaClient);
  });

test("quiescence durably blocks legacy deposits across new database clients", async () => {
  await withFixture(async (schema) => {
    await quiesceDepositWriters(prisma, schema);
    const restartedClient = new PrismaClient();
    try {
      await assert.rejects(
        inSchema(restartedClient, schema, (tx) => tx.$executeRawUnsafe(`INSERT INTO "Movement" ("id", "type", "monthId") VALUES ('legacy', 'POCKET_DEPOSIT_EXTERNAL', 'month-1')`)),
        /legacy pocket deposits are disabled/,
      );
    } finally { await restartedClient.$disconnect(); }
  });
});

test("explicit recovery reenables legacy deposits after quiescence", async () => {
  await withFixture(async (schema) => {
    await quiesceDepositWriters(prisma, schema);
    await reenableDepositWriters(prisma, schema);
    await inSchema(prisma, schema, (tx) => tx.$executeRawUnsafe(`INSERT INTO "Movement" ("id", "type", "monthId") VALUES ('recovered', 'POCKET_DEPOSIT_EXTERNAL', 'month-1')`));
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS "count" FROM "${schema}"."Movement"`);
    assert.equal(rows[0]?.count, 1n);
  });
});

test.after(async () => {
  await prisma.$disconnect();
});
