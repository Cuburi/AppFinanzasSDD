DO $$
DECLARE
  eligible_rows BIGINT;
  null_month_external_rows BIGINT;
  available_rows_before BIGINT;
  available_rows_after BIGINT;
  updated_rows BIGINT;
  remaining_eligible_rows BIGINT;
  null_month_external_rows_after BIGINT;
BEGIN
  CREATE TABLE IF NOT EXISTS "MonthlyLedgerBackfillControl" (
    "id" TEXT PRIMARY KEY,
    "writersQuiesced" BOOLEAN NOT NULL,
    "activeDepositWriters" INTEGER NOT NULL CHECK ("activeDepositWriters" >= 0),
    "writersEnabled" BOOLEAN NOT NULL DEFAULT FALSE
  );
  ALTER TABLE "MonthlyLedgerBackfillControl" ADD COLUMN IF NOT EXISTS "writersEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

  CREATE TABLE IF NOT EXISTS "MonthlyLedgerBackfillRow" (
    "movementId" TEXT PRIMARY KEY
  );

  LOCK TABLE "Movement" IN SHARE ROW EXCLUSIVE MODE;

  SELECT COUNT(*) INTO eligible_rows
  FROM "Movement"
  WHERE "type" = 'POCKET_DEPOSIT_EXTERNAL'
    AND "monthId" IS NOT NULL;

  IF eligible_rows > 0 AND NOT EXISTS (
    SELECT 1
    FROM "MonthlyLedgerBackfillControl"
    WHERE "id" = 'pocket-deposit-from-available'
      AND "writersQuiesced" = TRUE
      AND "activeDepositWriters" = 0
      AND "writersEnabled" = FALSE
  ) THEN
    RAISE EXCEPTION 'backfill requires explicitly quiesced deposit writers';
  END IF;

  SELECT COUNT(*) INTO null_month_external_rows
  FROM "Movement"
  WHERE "type" = 'POCKET_DEPOSIT_EXTERNAL'
    AND "monthId" IS NULL;

  SELECT COUNT(*) INTO available_rows_before
  FROM "Movement"
  WHERE "type" = 'POCKET_DEPOSIT_FROM_AVAILABLE';

  CREATE OR REPLACE FUNCTION "abortLegacyMonthLinkedExternalDeposit"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
  BEGIN
    IF NEW."type"::text IN ('POCKET_DEPOSIT_EXTERNAL', 'POCKET_DEPOSIT_FROM_SUBCATEGORY') AND NOT EXISTS (
      SELECT 1 FROM "MonthlyLedgerBackfillControl"
      WHERE "id" = 'pocket-deposit-from-available' AND "writersEnabled" = TRUE
    ) THEN
      RAISE EXCEPTION 'legacy pocket deposits are disabled during backfill';
    END IF;

    RETURN NEW;
  END;
  $function$;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = '"Movement"'::regclass AND tgname = 'abortLegacyMonthLinkedExternalDeposit'
  ) THEN
    CREATE TRIGGER "abortLegacyMonthLinkedExternalDeposit"
    BEFORE INSERT OR UPDATE ON "Movement"
    FOR EACH ROW EXECUTE FUNCTION "abortLegacyMonthLinkedExternalDeposit"();
  END IF;

  INSERT INTO "MonthlyLedgerBackfillRow" ("movementId")
  SELECT "id" FROM "Movement"
  WHERE "type" = 'POCKET_DEPOSIT_EXTERNAL' AND "monthId" IS NOT NULL;

  UPDATE "Movement"
  SET "type" = 'POCKET_DEPOSIT_FROM_AVAILABLE'
  WHERE "type" = 'POCKET_DEPOSIT_EXTERNAL'
    AND "monthId" IS NOT NULL;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  SELECT COUNT(*) INTO remaining_eligible_rows
  FROM "Movement"
  WHERE "type" = 'POCKET_DEPOSIT_EXTERNAL'
    AND "monthId" IS NOT NULL;

  SELECT COUNT(*) INTO null_month_external_rows_after
  FROM "Movement"
  WHERE "type" = 'POCKET_DEPOSIT_EXTERNAL'
    AND "monthId" IS NULL;

  SELECT COUNT(*) INTO available_rows_after
  FROM "Movement"
  WHERE "type" = 'POCKET_DEPOSIT_FROM_AVAILABLE';

  IF updated_rows <> eligible_rows
    OR remaining_eligible_rows <> 0
    OR null_month_external_rows_after <> null_month_external_rows
    OR available_rows_after <> available_rows_before + eligible_rows THEN
    RAISE EXCEPTION 'backfill postcondition failed';
  END IF;

END $$;
