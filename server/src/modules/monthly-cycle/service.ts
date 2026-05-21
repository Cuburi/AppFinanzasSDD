import { MonthStatus, MovementType } from "../../lib/prisma-client.js";

import { prisma } from "../../lib/prisma.js";
import {
  type ClosureActionInput,
  type ClosureReviewView,
  type CreateMonthlyIncomeInput,
  type MonthView,
  type OpenMonthInput,
  type DepositToPocketInput,
  type RecordExpenseInput,
  type TemplateInput,
  type TemplateView,
  type UpdateMonthlyIncomeInput,
} from "./dto/index.js";
import { calculateMonthBalances } from "./balance-calculator.js";
import { DomainError } from "./service-errors.js";
import { decimal, decimalToNumber, isZero } from "./money.js";
import { mapMonth, mapTemplate } from "./monthly-cycle-mappers.js";
import { readMonthById, readTemplateCategories } from "./month-queries.js";
import { monthInclude, type MonthRecord, type MonthlyCycleDb, type MonthlyIncomeRecord } from "./service-types.js";

export { DomainError } from "./service-errors.js";

const assertTemplateHasSubcategories = (input: TemplateInput) => {
  const count = input.categories.reduce((total, category) => total + category.subcategories.length, 0);

  if (count === 0) {
    throw new DomainError(400, "Template must contain at least one subcategory before opening a month.");
  }
};

const assertMonthIsMutable = (month: MonthRecord) => {
  if (month.status === MonthStatus.CLOSED) {
    throw new DomainError(409, "Closed months are immutable.");
  }
};

const parseReceivedAt = (receivedAt: string) => {
  const date = new Date(receivedAt);

  if (Number.isNaN(date.getTime())) {
    throw new DomainError(400, "Income received date must be a valid ISO date.");
  }

  return date;
};

const assertReceivedAtBelongsToMonth = (month: MonthRecord, receivedAt: Date) => {
  const monthStart = new Date(Date.UTC(month.year, month.month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(month.year, month.month, 1));

  if (receivedAt < monthStart || receivedAt >= nextMonthStart) {
    throw new DomainError(400, "Income received date must be inside the linked month period.");
  }
};

const assertIncomeBelongsToMonth = (income: MonthlyIncomeRecord | null, monthId: string): MonthlyIncomeRecord => {
  if (!income || income.monthId !== monthId) {
    throw new DomainError(404, "Monthly income was not found for this month.");
  }

  return income;
};

const findMonthSubcategory = (month: MonthRecord, subcategoryId: string) =>
  month.categories.flatMap((category) => category.subcategories).find((subcategory) => subcategory.id === subcategoryId);

const listMonthSubcategories = (month: MonthRecord) => month.categories.flatMap((category) => category.subcategories);

const buildClosureReview = (month: MonthRecord): ClosureReviewView => {
  const balances = calculateMonthBalances(month);
  const pendingSurpluses = [];
  const pendingDeficits = [];

  for (const subcategory of listMonthSubcategories(month)) {
    const available = balances.subcategoryBalances.get(subcategory.id) ?? decimalToNumber(subcategory.plannedAmount);

    if (available > 0 && !isZero(available)) {
      pendingSurpluses.push({
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        amount: Number(available.toFixed(2)),
        defaultPocketId: subcategory.defaultPocketId,
        requiresPocketSelection: !subcategory.defaultPocketId,
      });
    }

    if (available < 0 && !isZero(available)) {
      pendingDeficits.push({
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        amount: Number(Math.abs(available).toFixed(2)),
      });
    }
  }

  return {
    monthId: month.id,
    status: month.status,
    pendingSurpluses,
    pendingDeficits,
    availableMoney: balances.availableMoney,
    availableMoneyBlocker:
      balances.availableMoney > 0 && !isZero(balances.availableMoney)
        ? "SURPLUS"
        : balances.availableMoney < 0 && !isZero(balances.availableMoney)
          ? "DEFICIT"
          : null,
    canClose:
      month.status === MonthStatus.ACTIVE &&
      pendingSurpluses.length === 0 &&
      pendingDeficits.length === 0 &&
      isZero(balances.availableMoney),
  };
};

const assertPocketIsActive = async (db: MonthlyCycleDb, pocketId: string, label: string) => {
  const pocket = await db.savingsPocket.findUnique({
    where: { id: pocketId },
    select: { id: true, active: true },
  });

  if (!pocket || !pocket.active) {
    throw new DomainError(400, `${label} must exist and be active.`);
  }
};

const assertTemplateDefaultPocketsAreActive = async (db: MonthlyCycleDb, input: TemplateInput) => {
  const defaultPocketIds = new Set(
    input.categories
      .flatMap((category) => category.subcategories)
      .map((subcategory) => subcategory.defaultPocketId)
      .filter((defaultPocketId): defaultPocketId is string => Boolean(defaultPocketId)),
  );

  for (const defaultPocketId of defaultPocketIds) {
    await assertPocketIsActive(db, defaultPocketId, "Default pocket");
  }
};

const readActionAmount = (requestedAmount: number | null | undefined, pendingAmount: number) => {
  const amount = requestedAmount ?? pendingAmount;

  if (amount <= 0) {
    throw new DomainError(400, "Closure action amount must be greater than zero.");
  }

  if (amount - pendingAmount > 0.005) {
    throw new DomainError(400, "Closure action amount cannot exceed the pending amount.");
  }

  return amount;
};

export const createMonthlyCycleService = (db: MonthlyCycleDb) => ({
  async getTemplate(): Promise<TemplateView> {
    const categories = await readTemplateCategories(db);
    return mapTemplate(categories);
  },

  async updateTemplate(input: TemplateInput): Promise<TemplateView> {
    const categories = await db.$transaction(async (tx) => {
      await assertTemplateDefaultPocketsAreActive(tx, input);
      await tx.templateCategory.deleteMany();

      for (const [categoryIndex, category] of input.categories.entries()) {
        await tx.templateCategory.create({
          data: {
            name: category.name,
            sortOrder: categoryIndex,
            subcategories: {
              create: category.subcategories.map((subcategory, subcategoryIndex) => ({
                name: subcategory.name,
                plannedAmount: decimal(subcategory.plannedAmount),
                defaultPocketId: subcategory.defaultPocketId ?? null,
                sortOrder: subcategoryIndex,
              })),
            },
          },
        });
      }

      return readTemplateCategories(tx);
    });

    return mapTemplate(categories);
  },

  async openMonth(input: OpenMonthInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const activeMonth = await tx.month.findFirst({
        where: { status: MonthStatus.ACTIVE },
        select: { id: true, year: true, month: true },
      });

      if (activeMonth) {
        throw new DomainError(409, `There is already an active month (${activeMonth.year}-${String(activeMonth.month).padStart(2, "0")}).`);
      }

      const existingTargetMonth = await tx.month.findUnique({
        where: {
          year_month: {
            year: input.year,
            month: input.month,
          },
        },
        select: { id: true },
      });

      if (existingTargetMonth) {
        throw new DomainError(409, "That month already exists.");
      }

      const template = await readTemplateCategories(tx);
      const templateInput = {
        categories: template.map((category) => ({
          name: category.name,
          subcategories: category.subcategories.map((subcategory) => ({
            name: subcategory.name,
            plannedAmount: decimalToNumber(subcategory.plannedAmount),
            defaultPocketId: subcategory.defaultPocketId,
          })),
        })),
      };
      assertTemplateHasSubcategories(templateInput);
      await assertTemplateDefaultPocketsAreActive(tx, templateInput);

      const createdMonth = await tx.month.create({
        data: {
          year: input.year,
          month: input.month,
          status: MonthStatus.ACTIVE,
          categories: {
            create: template.map((category, categoryIndex) => ({
              name: category.name,
              sortOrder: categoryIndex,
              templateCategoryId: category.id,
              subcategories: {
                create: category.subcategories.map((subcategory, subcategoryIndex) => ({
                  name: subcategory.name,
                  plannedAmount: subcategory.plannedAmount,
                  defaultPocketId: subcategory.defaultPocketId,
                  templateSubcategoryId: subcategory.id,
                  sortOrder: subcategoryIndex,
                })),
              },
            })),
          },
        },
        include: monthInclude,
      });

      return createdMonth;
    });

    return mapMonth(month);
  },

  async getActiveMonth(): Promise<MonthView | null> {
    const month = await db.month.findFirst({
      where: { status: MonthStatus.ACTIVE },
      orderBy: { openedAt: "desc" },
      include: monthInclude,
    });

    if (!month) {
      return null;
    }

    return mapMonth(month as MonthRecord);
  },

  async recordExpense(input: RecordExpenseInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);

      if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
        throw new DomainError(400, "Source subcategory does not belong to this month.");
      }

      await tx.movement.create({
        data: {
          type: MovementType.EXPENSE,
          amount: decimal(input.amount),
          description: input.description,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
        },
      });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async depositToPocket(input: DepositToPocketInput): Promise<MonthView | null> {
    const month = await db.$transaction(async (tx) => {
      const targetPocket = await tx.savingsPocket.findUnique({
        where: { id: input.targetPocketId },
        select: { id: true, active: true },
      });

      if (!targetPocket || !targetPocket.active) {
        throw new DomainError(400, "Target pocket must exist and be active.");
      }

      const existingMonth = input.monthId ? await readMonthById(tx, input.monthId) : null;

      if (existingMonth) {
        assertMonthIsMutable(existingMonth);
      }

      if (input.sourceSubcategoryId) {
        if (!existingMonth) {
          throw new DomainError(400, "Month id is required when depositing from a subcategory.");
        }

        if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
          throw new DomainError(400, "Source subcategory does not belong to this month.");
        }
      }

      await tx.movement.create({
        data: {
          type: input.sourceSubcategoryId ? MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY : MovementType.POCKET_DEPOSIT_EXTERNAL,
          amount: decimal(input.amount),
          description: input.description,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
          targetPocketId: input.targetPocketId,
          externalSourceLabel: input.sourceSubcategoryId ? null : input.externalSourceLabel,
        },
      });

      return input.monthId ? readMonthById(tx, input.monthId) : null;
    });

    return month ? mapMonth(month) : null;
  },

  async createMonthlyIncome(input: CreateMonthlyIncomeInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      const receivedAt = parseReceivedAt(input.receivedAt);
      assertReceivedAtBelongsToMonth(existingMonth, receivedAt);

      await tx.monthlyIncome.create({
        data: {
          monthId: input.monthId,
          sourceName: input.sourceName,
          amount: decimal(input.amount),
          receivedAt,
          notes: input.notes ?? null,
        },
      });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async updateMonthlyIncome(input: UpdateMonthlyIncomeInput): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);
      assertIncomeBelongsToMonth(await tx.monthlyIncome.findUnique({ where: { id: input.incomeId } }), input.monthId);

      const data: Parameters<MonthlyCycleDb["monthlyIncome"]["update"]>[0]["data"] = {};

      if (input.sourceName !== undefined) data.sourceName = input.sourceName;
      if (input.amount !== undefined) data.amount = decimal(input.amount);
      if (input.receivedAt !== undefined) {
        const receivedAt = parseReceivedAt(input.receivedAt);
        assertReceivedAtBelongsToMonth(existingMonth, receivedAt);
        data.receivedAt = receivedAt;
      }
      if (input.notes !== undefined) data.notes = input.notes;

      await tx.monthlyIncome.update({ where: { id: input.incomeId }, data });

      return readMonthById(tx, input.monthId);
    });

    return mapMonth(month);
  },

  async deleteMonthlyIncome(monthId: string, incomeId: string): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, monthId);
      assertMonthIsMutable(existingMonth);
      assertIncomeBelongsToMonth(await tx.monthlyIncome.findUnique({ where: { id: incomeId } }), monthId);

      await tx.monthlyIncome.delete({ where: { id: incomeId } });

      return readMonthById(tx, monthId);
    });

    return mapMonth(month);
  },

  async getClosureReview(monthId: string): Promise<ClosureReviewView> {
    const month = await readMonthById(db, monthId);
    return buildClosureReview(month);
  },

  async applyClosureAction(input: ClosureActionInput): Promise<ClosureReviewView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, input.monthId);
      assertMonthIsMutable(existingMonth);

      const balances = calculateMonthBalances(existingMonth);

      if (input.type === MovementType.SURPLUS_TO_POCKET_ON_CLOSE) {
        const sourceSubcategoryId = input.sourceSubcategoryId;

        if (!sourceSubcategoryId) {
          throw new DomainError(400, "Source subcategory is required for surplus transfer.");
        }

        const sourceSubcategory = findMonthSubcategory(existingMonth, sourceSubcategoryId);

        if (!sourceSubcategory) {
          throw new DomainError(400, "Source subcategory does not belong to this month.");
        }

        const pendingSurplus = balances.subcategoryBalances.get(sourceSubcategory.id) ?? decimalToNumber(sourceSubcategory.plannedAmount);

        if (pendingSurplus <= 0 || isZero(pendingSurplus)) {
          throw new DomainError(400, "Source subcategory does not have pending surplus.");
        }

        const targetPocketId = input.targetPocketId ?? sourceSubcategory.defaultPocketId;

        if (!targetPocketId) {
          throw new DomainError(400, "Target pocket is required because this subcategory has no default pocket.");
        }

        await assertPocketIsActive(tx, targetPocketId, "Target pocket");
        await tx.movement.create({
          data: {
            type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE,
            amount: decimal(readActionAmount(input.amount, pendingSurplus)),
            description: input.description,
            monthId: input.monthId,
            sourceSubcategoryId: sourceSubcategory.id,
            targetPocketId,
          },
        });
      }

      if (input.type === MovementType.DEFICIT_COVER_FROM_SUBCATEGORY) {
        const sourceSubcategoryId = input.sourceSubcategoryId;
        const targetSubcategoryId = input.targetSubcategoryId;

        if (!sourceSubcategoryId || !targetSubcategoryId) {
          throw new DomainError(400, "Source and target subcategories are required for deficit coverage.");
        }

        if (sourceSubcategoryId === targetSubcategoryId) {
          throw new DomainError(400, "Source and target subcategories must be different.");
        }

        const sourceSubcategory = findMonthSubcategory(existingMonth, sourceSubcategoryId);
        const targetSubcategory = findMonthSubcategory(existingMonth, targetSubcategoryId);

        if (!sourceSubcategory || !targetSubcategory) {
          throw new DomainError(400, "Source and target subcategories must belong to this month.");
        }

        const sourceAvailable = balances.subcategoryBalances.get(sourceSubcategory.id) ?? decimalToNumber(sourceSubcategory.plannedAmount);
        const targetAvailable = balances.subcategoryBalances.get(targetSubcategory.id) ?? decimalToNumber(targetSubcategory.plannedAmount);

        if (targetAvailable >= 0 || isZero(targetAvailable)) {
          throw new DomainError(400, "Target subcategory does not have a pending deficit.");
        }

        const amount = readActionAmount(input.amount, Math.abs(targetAvailable));

        if (sourceAvailable - amount < -0.005) {
          throw new DomainError(400, "Source subcategory does not have enough available balance.");
        }

        await tx.movement.create({
          data: {
            type: MovementType.DEFICIT_COVER_FROM_SUBCATEGORY,
            amount: decimal(amount),
            description: input.description,
            monthId: input.monthId,
            sourceSubcategoryId: sourceSubcategory.id,
            targetSubcategoryId: targetSubcategory.id,
          },
        });
      }

      if (input.type === MovementType.DEFICIT_COVER_FROM_POCKET) {
        const sourcePocketId = input.sourcePocketId;
        const targetSubcategoryId = input.targetSubcategoryId;

        if (!sourcePocketId || !targetSubcategoryId) {
          throw new DomainError(400, "Source pocket and target subcategory are required for deficit coverage.");
        }

        const targetSubcategory = findMonthSubcategory(existingMonth, targetSubcategoryId);

        if (!targetSubcategory) {
          throw new DomainError(400, "Target subcategory must belong to this month.");
        }

        const targetAvailable = balances.subcategoryBalances.get(targetSubcategory.id) ?? decimalToNumber(targetSubcategory.plannedAmount);

        if (targetAvailable >= 0 || isZero(targetAvailable)) {
          throw new DomainError(400, "Target subcategory does not have a pending deficit.");
        }

        await assertPocketIsActive(tx, sourcePocketId, "Source pocket");
        await tx.movement.create({
          data: {
            type: MovementType.DEFICIT_COVER_FROM_POCKET,
            amount: decimal(readActionAmount(input.amount, Math.abs(targetAvailable))),
            description: input.description,
            monthId: input.monthId,
            sourcePocketId,
            targetSubcategoryId: targetSubcategory.id,
          },
        });
      }

      return readMonthById(tx, input.monthId);
    });

    return buildClosureReview(month);
  },

  async closeMonth(monthId: string): Promise<MonthView> {
    const month = await db.$transaction(async (tx) => {
      const existingMonth = await readMonthById(tx, monthId);
      assertMonthIsMutable(existingMonth);

      const review = buildClosureReview(existingMonth);

      if (!review.canClose) {
        throw new DomainError(409, "Month cannot be closed while pending subcategory balances or available money remain unresolved.");
      }

      return tx.month.update({
        where: { id: monthId },
        data: { status: MonthStatus.CLOSED, closedAt: new Date() },
        include: monthInclude,
      });
    });

    return mapMonth(month);
  },
});

const monthlyCycleService = createMonthlyCycleService(prisma as unknown as MonthlyCycleDb);

export const getTemplate = () => monthlyCycleService.getTemplate();
export const updateTemplate = (input: TemplateInput) => monthlyCycleService.updateTemplate(input);
export const openMonth = (input: OpenMonthInput) => monthlyCycleService.openMonth(input);
export const getActiveMonth = () => monthlyCycleService.getActiveMonth();
export const recordExpense = (input: RecordExpenseInput) => monthlyCycleService.recordExpense(input);
export const depositToPocket = (input: DepositToPocketInput) => monthlyCycleService.depositToPocket(input);
export const createMonthlyIncome = (input: CreateMonthlyIncomeInput) => monthlyCycleService.createMonthlyIncome(input);
export const updateMonthlyIncome = (input: UpdateMonthlyIncomeInput) => monthlyCycleService.updateMonthlyIncome(input);
export const deleteMonthlyIncome = (monthId: string, incomeId: string) => monthlyCycleService.deleteMonthlyIncome(monthId, incomeId);
export const getClosureReview = (monthId: string) => monthlyCycleService.getClosureReview(monthId);
export const applyClosureAction = (input: ClosureActionInput) => monthlyCycleService.applyClosureAction(input);
export const closeMonth = (monthId: string) => monthlyCycleService.closeMonth(monthId);
