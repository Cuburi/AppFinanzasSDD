-- CreateTable
CREATE TABLE "MonthlyIncome" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyIncome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyIncome_monthId_receivedAt_idx" ON "MonthlyIncome"("monthId", "receivedAt");

-- AddForeignKey
ALTER TABLE "MonthlyIncome" ADD CONSTRAINT "MonthlyIncome_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "Month"("id") ON DELETE CASCADE ON UPDATE CASCADE;
