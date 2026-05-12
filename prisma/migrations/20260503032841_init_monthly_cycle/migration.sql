-- CreateEnum
CREATE TYPE "MonthStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('EXPENSE', 'POCKET_DEPOSIT_FROM_SUBCATEGORY', 'POCKET_DEPOSIT_EXTERNAL', 'SURPLUS_TO_POCKET_ON_CLOSE', 'DEFICIT_COVER_FROM_SUBCATEGORY', 'DEFICIT_COVER_FROM_POCKET');

-- CreateTable
CREATE TABLE "TemplateCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedAmount" DECIMAL(12,2) NOT NULL,
    "defaultPocketId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsPocket" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalAmount" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsPocket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Month" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "MonthStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Month_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthCategory" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateCategoryId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthSubcategory" (
    "id" TEXT NOT NULL,
    "monthCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedAmount" DECIMAL(12,2) NOT NULL,
    "defaultPocketId" TEXT,
    "templateSubcategoryId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "monthId" TEXT,
    "sourceSubcategoryId" TEXT,
    "targetSubcategoryId" TEXT,
    "sourcePocketId" TEXT,
    "targetPocketId" TEXT,
    "externalSourceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateCategory_sortOrder_idx" ON "TemplateCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "TemplateSubcategory_categoryId_sortOrder_idx" ON "TemplateSubcategory"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsPocket_name_key" ON "SavingsPocket"("name");

-- CreateIndex
CREATE INDEX "Month_status_idx" ON "Month"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Month_year_month_key" ON "Month"("year", "month");

-- CreateIndex
CREATE INDEX "MonthCategory_monthId_sortOrder_idx" ON "MonthCategory"("monthId", "sortOrder");

-- CreateIndex
CREATE INDEX "MonthSubcategory_monthCategoryId_sortOrder_idx" ON "MonthSubcategory"("monthCategoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Movement_monthId_occurredAt_idx" ON "Movement"("monthId", "occurredAt");

-- CreateIndex
CREATE INDEX "Movement_sourceSubcategoryId_idx" ON "Movement"("sourceSubcategoryId");

-- CreateIndex
CREATE INDEX "Movement_targetSubcategoryId_idx" ON "Movement"("targetSubcategoryId");

-- CreateIndex
CREATE INDEX "Movement_sourcePocketId_idx" ON "Movement"("sourcePocketId");

-- CreateIndex
CREATE INDEX "Movement_targetPocketId_idx" ON "Movement"("targetPocketId");

-- AddForeignKey
ALTER TABLE "TemplateSubcategory" ADD CONSTRAINT "TemplateSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TemplateCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSubcategory" ADD CONSTRAINT "TemplateSubcategory_defaultPocketId_fkey" FOREIGN KEY ("defaultPocketId") REFERENCES "SavingsPocket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthCategory" ADD CONSTRAINT "MonthCategory_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "Month"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthCategory" ADD CONSTRAINT "MonthCategory_templateCategoryId_fkey" FOREIGN KEY ("templateCategoryId") REFERENCES "TemplateCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthSubcategory" ADD CONSTRAINT "MonthSubcategory_monthCategoryId_fkey" FOREIGN KEY ("monthCategoryId") REFERENCES "MonthCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthSubcategory" ADD CONSTRAINT "MonthSubcategory_defaultPocketId_fkey" FOREIGN KEY ("defaultPocketId") REFERENCES "SavingsPocket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthSubcategory" ADD CONSTRAINT "MonthSubcategory_templateSubcategoryId_fkey" FOREIGN KEY ("templateSubcategoryId") REFERENCES "TemplateSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "Month"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_sourceSubcategoryId_fkey" FOREIGN KEY ("sourceSubcategoryId") REFERENCES "MonthSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_targetSubcategoryId_fkey" FOREIGN KEY ("targetSubcategoryId") REFERENCES "MonthSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_sourcePocketId_fkey" FOREIGN KEY ("sourcePocketId") REFERENCES "SavingsPocket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_targetPocketId_fkey" FOREIGN KEY ("targetPocketId") REFERENCES "SavingsPocket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
