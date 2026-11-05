-- Existing closed months remain legacy closures with no designated carry.
ALTER TABLE "Month"
  ADD COLUMN "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "openingSourceMonthId" TEXT,
  ADD COLUMN "closureCarryAmount" DECIMAL(12,2),
  ADD COLUMN "closureExcludedAmount" DECIMAL(12,2);

CREATE UNIQUE INDEX "Month_openingSourceMonthId_key" ON "Month"("openingSourceMonthId");
ALTER TABLE "Month" ADD CONSTRAINT "Month_openingSourceMonthId_fkey"
  FOREIGN KEY ("openingSourceMonthId") REFERENCES "Month"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Month" ADD CONSTRAINT "Month_closure_allocation_check" CHECK (
  "openingBalance" >= 0 AND (
    ("closureCarryAmount" IS NULL AND "closureExcludedAmount" IS NULL) OR
    ("status" = 'CLOSED' AND "closureCarryAmount" IS NOT NULL AND "closureExcludedAmount" IS NOT NULL
      AND "closureCarryAmount" >= 0 AND "closureExcludedAmount" >= 0)
  )
);
