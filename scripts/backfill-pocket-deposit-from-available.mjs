import { fileURLToPath } from "node:url";

import { PrismaClient } from "../server/src/generated/prisma/index.js";

const controlId = "pocket-deposit-from-available";

export const validateQuiescenceInput = (environment) => {
  if (environment.MONTHLY_LEDGER_WRITERS_QUIESCED !== "true") {
    return { ok: false, message: "Set MONTHLY_LEDGER_WRITERS_QUIESCED=true before backfill." };
  }

  if (environment.MONTHLY_LEDGER_ACTIVE_DEPOSIT_WRITERS !== "0") {
    return { ok: false, message: "MONTHLY_LEDGER_ACTIVE_DEPOSIT_WRITERS must be exactly 0." };
  }

  return { ok: true };
};

const assertSchema = (schema) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error("Rollback schema is invalid.");
};

const installWriterGate = async (tx) => {
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MonthlyLedgerBackfillControl" (
      "id" TEXT PRIMARY KEY,
      "writersQuiesced" BOOLEAN NOT NULL,
      "activeDepositWriters" INTEGER NOT NULL CHECK ("activeDepositWriters" >= 0),
      "writersEnabled" BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await tx.$executeRawUnsafe(`ALTER TABLE "MonthlyLedgerBackfillControl" ADD COLUMN IF NOT EXISTS "writersEnabled" BOOLEAN NOT NULL DEFAULT FALSE`);
  await tx.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION "abortLegacyMonthLinkedExternalDeposit"() RETURNS TRIGGER LANGUAGE plpgsql AS $function$
    BEGIN
      IF NEW."type"::text IN ('POCKET_DEPOSIT_EXTERNAL', 'POCKET_DEPOSIT_FROM_SUBCATEGORY') AND NOT EXISTS (
        SELECT 1 FROM "MonthlyLedgerBackfillControl" WHERE "id" = '${controlId}' AND "writersEnabled" = TRUE
      ) THEN RAISE EXCEPTION 'legacy pocket deposits are disabled during backfill'; END IF;
      RETURN NEW;
    END;
    $function$
  `);
  await tx.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "abortLegacyMonthLinkedExternalDeposit" ON "Movement"`);
  await tx.$executeRawUnsafe(`
    CREATE TRIGGER "abortLegacyMonthLinkedExternalDeposit" BEFORE INSERT OR UPDATE ON "Movement"
    FOR EACH ROW EXECUTE FUNCTION "abortLegacyMonthLinkedExternalDeposit"()
  `);
};

export const quiesceDepositWriters = async (prisma, schema = "public") => {
  assertSchema(schema);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    await installWriterGate(tx);
    await tx.$executeRawUnsafe(`
      INSERT INTO "MonthlyLedgerBackfillControl" ("id", "writersQuiesced", "activeDepositWriters", "writersEnabled")
      VALUES ('${controlId}', TRUE, 0, FALSE)
      ON CONFLICT ("id") DO UPDATE SET "writersQuiesced" = TRUE, "activeDepositWriters" = 0, "writersEnabled" = FALSE
    `);
  });
};

export const reenableDepositWriters = async (prisma, schema = "public") => {
  assertSchema(schema);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    await tx.$executeRawUnsafe(`
      INSERT INTO "MonthlyLedgerBackfillControl" ("id", "writersQuiesced", "activeDepositWriters", "writersEnabled")
      VALUES ('${controlId}', FALSE, 0, TRUE)
      ON CONFLICT ("id") DO UPDATE SET "writersQuiesced" = FALSE, "activeDepositWriters" = 0, "writersEnabled" = TRUE
    `);
  });
};

export const rollbackBackfill = async (prisma, schema = "public") => {
  assertSchema(schema);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    await tx.$executeRawUnsafe(`
      DO $$
      DECLARE backfilled_rows BIGINT;
      BEGIN
        SELECT COUNT(*) INTO backfilled_rows FROM "MonthlyLedgerBackfillRow";
        IF backfilled_rows > 0 AND NOT EXISTS (
          SELECT 1 FROM "MonthlyLedgerBackfillControl"
          WHERE "id" = '${controlId}' AND "writersQuiesced" = TRUE AND "activeDepositWriters" = 0 AND "writersEnabled" = FALSE
        ) THEN
          RAISE EXCEPTION 'rollback requires explicitly quiesced deposit writers';
        END IF;
        DROP TRIGGER IF EXISTS "abortLegacyMonthLinkedExternalDeposit" ON "Movement";
        DROP FUNCTION IF EXISTS "abortLegacyMonthLinkedExternalDeposit"();
        UPDATE "Movement" SET "type" = 'POCKET_DEPOSIT_EXTERNAL'
        WHERE "type" = 'POCKET_DEPOSIT_FROM_AVAILABLE'
          AND "id" IN (SELECT "movementId" FROM "MonthlyLedgerBackfillRow");
        DELETE FROM "MonthlyLedgerBackfillRow";
        INSERT INTO "MonthlyLedgerBackfillControl" ("id", "writersQuiesced", "activeDepositWriters", "writersEnabled")
        VALUES ('${controlId}', FALSE, 0, TRUE)
        ON CONFLICT ("id") DO UPDATE SET "writersQuiesced" = FALSE, "activeDepositWriters" = 0, "writersEnabled" = TRUE;
      END $$;
    `);
  });
};

const recordQuiescence = async () => {
  const input = validateQuiescenceInput(process.env);
  if (!input.ok) {
    throw new Error(input.message);
  }

  const prisma = new PrismaClient();
  try {
    await quiesceDepositWriters(prisma);
  } finally {
    await prisma.$disconnect();
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const run = process.argv.includes("--rollback")
    ? async () => {
      const prisma = new PrismaClient();
      try { await rollbackBackfill(prisma); } finally { await prisma.$disconnect(); }
    }
    : process.argv.includes("--enable-writes")
      ? async () => {
        const prisma = new PrismaClient();
        try { await reenableDepositWriters(prisma); } finally { await prisma.$disconnect(); }
      }
      : recordQuiescence;
  run()
    .then(() => {
      console.log(process.argv.includes("--rollback") ? "Backfill rollback completed." : process.argv.includes("--enable-writes") ? "Deposit writers are enabled." : "Deposit writers are quiesced. Run the guarded dev migration next.");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
