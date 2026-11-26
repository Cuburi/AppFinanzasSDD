-- AlterTable
ALTER TABLE "Movement"
    ALTER COLUMN "occurredAt" DROP DEFAULT,
    ALTER COLUMN "occurredAt" TYPE DATE USING (("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota')::date;

-- AlterTable
ALTER TABLE "MonthlyIncome"
    ALTER COLUMN "receivedAt" TYPE DATE USING (("receivedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota')::date;

-- AlterTable
ALTER TABLE "Debt"
    ALTER COLUMN "originDate" TYPE DATE USING (("originDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota')::date;

-- AlterTable
ALTER TABLE "DebtPayment"
    ALTER COLUMN "paidAt" TYPE DATE USING (("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota')::date;
