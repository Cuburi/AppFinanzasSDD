ALTER TABLE "Movement" ADD COLUMN "creditCardId" TEXT;

ALTER TABLE "Movement" ADD CONSTRAINT "Movement_creditCardId_fkey"
  FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Movement_creditCardId_idx" ON "Movement"("creditCardId");
