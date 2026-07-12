CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limit" DECIMAL(12,2),
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditCard_ownerId_name_key" ON "CreditCard"("ownerId", "name");
CREATE INDEX "CreditCard_ownerId_active_idx" ON "CreditCard"("ownerId", "active");
