-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('NON_CASH', 'CASH');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'CASH_WITHDRAWAL';
ALTER TYPE "MovementType" ADD VALUE 'CASH_CARRYOVER_IN';

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN "paymentMethod" "PaymentMethod";

-- Backfill existing expense movements as non-cash; future app validation requires explicit paymentMethod.
UPDATE "Movement"
SET "paymentMethod" = 'NON_CASH'
WHERE "type" = 'EXPENSE' AND "paymentMethod" IS NULL;

-- CreateIndex
CREATE INDEX "Movement_monthId_type_occurredAt_idx" ON "Movement"("monthId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "Movement_paymentMethod_idx" ON "Movement"("paymentMethod");
