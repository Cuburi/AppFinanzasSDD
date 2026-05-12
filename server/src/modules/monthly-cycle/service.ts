import { MonthStatus, MovementType, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import {
  type MonthView,
  type OpenMonthInput,
  type DepositToPocketInput,
  type RecordExpenseInput,
  type TemplateInput,
  type TemplateView,
} from "./dto.js";
import { calculateMonthBalances } from "./balance-calculator.js";

export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

const decimal = (value: number) => new Prisma.Decimal(value.toFixed(2));
const decimalToNumber = (value: Prisma.Decimal) => Number(value.toString());

type TemplateCategoryRecord = {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: Array<{
    id: string;
    name: string;
    plannedAmount: Prisma.Decimal;
    defaultPocketId: string | null;
    active: boolean;
    sortOrder: number;
  }>;
};

type MonthRecord = {
  id: string;
  year: number;
  month: number;
  status: MonthStatus;
  openedAt: Date;
  closedAt: Date | null;
  categories: Array<{
    id: string;
    name: string;
    sortOrder: number;
    templateCategoryId: string | null;
    subcategories: Array<{
      id: string;
      name: string;
      plannedAmount: Prisma.Decimal;
      defaultPocketId: string | null;
      templateSubcategoryId: string | null;
      sortOrder: number;
    }>;
  }>;
  movements: Array<{
    type: import("@prisma/client").MovementType;
    amount: Prisma.Decimal;
    sourceSubcategoryId: string | null;
    targetSubcategoryId: string | null;
    sourcePocketId: string | null;
    targetPocketId: string | null;
  }>;
};

type MonthlyCycleDb = {
  $transaction<T>(callback: (tx: MonthlyCycleDb) => Promise<T>): Promise<T>;
  templateCategory: {
    findMany(args: { orderBy: { sortOrder: "asc" }; include: typeof templateInclude }): Promise<TemplateCategoryRecord[]>;
    deleteMany(): Promise<unknown>;
    create(args: {
      data: {
        name: string;
        sortOrder: number;
        subcategories: {
          create: Array<{
            name: string;
            plannedAmount: Prisma.Decimal;
            defaultPocketId: string | null;
            sortOrder: number;
          }>;
        };
      };
    }): Promise<unknown>;
  };
  month: {
    findFirst(args: {
      where: { status: MonthStatus.ACTIVE };
      select?: { id: true; year: true; month: true };
      orderBy?: { openedAt: "desc" };
      include?: typeof monthInclude;
    }): Promise<MonthRecord | { id: string; year: number; month: number } | null>;
    findUnique(args: unknown): Promise<unknown>;
    create(args: {
      data: {
        year: number;
        month: number;
        status: MonthStatus.ACTIVE;
        categories: {
          create: Array<{
            name: string;
            sortOrder: number;
            templateCategoryId: string;
            subcategories: {
              create: Array<{
                name: string;
                plannedAmount: Prisma.Decimal;
                defaultPocketId: string | null;
                templateSubcategoryId: string;
                sortOrder: number;
              }>;
            };
          }>;
        };
      };
      include: typeof monthInclude;
    }): Promise<MonthRecord>;
  };
  movement: {
    create(args: {
      data: {
        type: MovementType;
        amount: Prisma.Decimal;
        description?: string | null;
        monthId?: string | null;
        sourceSubcategoryId?: string | null;
        targetPocketId?: string | null;
        externalSourceLabel?: string | null;
      };
    }): Promise<unknown>;
  };
  savingsPocket: {
    findUnique(args: { where: { id: string }; select: { id: true; active: true } }): Promise<{ id: string; active: boolean } | null>;
  };
};

const templateInclude = {
  subcategories: {
    orderBy: { sortOrder: "asc" as const },
  },
};

const monthInclude = {
  categories: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      subcategories: {
        orderBy: { sortOrder: "asc" as const },
      },
    },
  },
  movements: {
    orderBy: { occurredAt: "asc" as const },
  },
};

const mapTemplate = (categories: TemplateCategoryRecord[]): TemplateView => ({
  categories: categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    subcategories: category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      plannedAmount: decimalToNumber(subcategory.plannedAmount),
      defaultPocketId: subcategory.defaultPocketId,
      active: subcategory.active,
      sortOrder: subcategory.sortOrder,
    })),
  })),
});

const mapMonth = (month: MonthRecord): MonthView => {
  const balances = calculateMonthBalances(month);

  return {
    id: month.id,
    year: month.year,
    month: month.month,
    status: month.status,
    openedAt: month.openedAt.toISOString(),
    closedAt: month.closedAt ? month.closedAt.toISOString() : null,
    categories: month.categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      templateCategoryId: category.templateCategoryId,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        plannedAmount: decimalToNumber(subcategory.plannedAmount),
        available: balances.subcategoryBalances.get(subcategory.id) ?? decimalToNumber(subcategory.plannedAmount),
        defaultPocketId: subcategory.defaultPocketId,
        templateSubcategoryId: subcategory.templateSubcategoryId,
        sortOrder: subcategory.sortOrder,
      })),
    })),
  };
};

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

const findMonthSubcategory = (month: MonthRecord, subcategoryId: string) =>
  month.categories.flatMap((category) => category.subcategories).find((subcategory) => subcategory.id === subcategoryId);

const readMonthById = async (db: MonthlyCycleDb, monthId: string): Promise<MonthRecord> => {
  const month = await db.month.findUnique({
    where: { id: monthId },
    include: monthInclude,
  });

  if (!month) {
    throw new DomainError(404, "Month was not found.");
  }

  return month as MonthRecord;
};

const readTemplateCategories = async (db: MonthlyCycleDb) =>
  db.templateCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: templateInclude,
  });

export const createMonthlyCycleService = (db: MonthlyCycleDb) => ({
  async getTemplate(): Promise<TemplateView> {
    const categories = await readTemplateCategories(db);
    return mapTemplate(categories);
  },

  async updateTemplate(input: TemplateInput): Promise<TemplateView> {
    const categories = await db.$transaction(async (tx) => {
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
                defaultPocketId: subcategory.defaultPocketId,
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
      assertTemplateHasSubcategories({
        categories: template.map((category) => ({
          name: category.name,
          subcategories: category.subcategories.map((subcategory) => ({
            name: subcategory.name,
            plannedAmount: decimalToNumber(subcategory.plannedAmount),
            defaultPocketId: subcategory.defaultPocketId,
          })),
        })),
      });

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
});

const monthlyCycleService = createMonthlyCycleService(prisma as unknown as MonthlyCycleDb);

export const getTemplate = () => monthlyCycleService.getTemplate();
export const updateTemplate = (input: TemplateInput) => monthlyCycleService.updateTemplate(input);
export const openMonth = (input: OpenMonthInput) => monthlyCycleService.openMonth(input);
export const getActiveMonth = () => monthlyCycleService.getActiveMonth();
export const recordExpense = (input: RecordExpenseInput) => monthlyCycleService.recordExpense(input);
export const depositToPocket = (input: DepositToPocketInput) => monthlyCycleService.depositToPocket(input);
