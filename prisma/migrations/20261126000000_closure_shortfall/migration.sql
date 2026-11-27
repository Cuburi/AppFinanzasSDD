ALTER TABLE "Month" ADD COLUMN "closureShortfallAmount" DECIMAL(12,2);
ALTER TABLE "Month" DROP CONSTRAINT "Month_closure_allocation_check";
ALTER TABLE "Month" ADD CONSTRAINT "Month_closure_allocation_check" CHECK (
  "openingBalance" >= 0 AND
  ("closureShortfallAmount" IS NULL OR "closureShortfallAmount" >= 0) AND (
    ("closureCarryAmount" IS NULL AND "closureExcludedAmount" IS NULL AND "closureShortfallAmount" IS NULL) OR
    ("status" = 'CLOSED' AND "closureCarryAmount" IS NOT NULL AND "closureExcludedAmount" IS NOT NULL
      AND "closureCarryAmount" >= 0 AND "closureExcludedAmount" >= 0
      AND (COALESCE("closureShortfallAmount", 0) = 0 OR ("closureCarryAmount" = 0 AND "closureExcludedAmount" = 0)))
  )
);
