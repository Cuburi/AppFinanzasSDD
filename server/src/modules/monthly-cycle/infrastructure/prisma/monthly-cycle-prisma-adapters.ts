import { MonthStatus, type MovementType, type PaymentMethod, type Prisma } from "../../../../lib/prisma-client.js";
import type { MonthlyCyclePorts } from "../../application/ports/monthly-cycle-ports.js";
import { decimal } from "../../shared/money.js";
import { DomainError } from "../../shared/service-errors.js";
import { monthInclude, templateInclude, type MonthRecord, type MonthlyCycleDb } from "../../shared/service-types.js";
import type { TemplateInput } from "../../dto/index.js";

export type MonthlyCyclePrismaPortSet = Omit<MonthlyCyclePorts, "transactionRunner">;

const readMonthById = async (db: MonthlyCycleDb, monthId: string): Promise<MonthRecord> => {
  const month = await db.month.findUnique({ where: { id: monthId }, include: monthInclude });

  if (!month) {
    throw new DomainError(404, "Month was not found.");
  }

  return month as MonthRecord;
};

const ensurePocketIsActive = async (db: MonthlyCycleDb, pocketId: string, label: string) => {
  const pocket = await db.savingsPocket.findUnique({
    where: { id: pocketId },
    select: { id: true, active: true },
  });

  if (!pocket || !pocket.active) {
    throw new DomainError(400, `${label} must exist and be active.`);
  }
};

export const createMonthlyCyclePrismaAdapters = (db: MonthlyCycleDb): MonthlyCyclePrismaPortSet => ({
  months: {
    async findActive() {
      const month = await db.month.findFirst({
        where: { status: MonthStatus.ACTIVE },
        orderBy: { openedAt: "desc" },
        include: monthInclude,
      });

      return month ? (month as MonthRecord) : null;
    },
    async findActiveSummary(status) {
      return (await db.month.findFirst({
        where: { status },
        select: { id: true, year: true, month: true },
      })) as { id: string; year: number; month: number } | null;
    },
    findById(monthId) {
      return readMonthById(db, monthId);
    },
    async findByYearMonth(year, month) {
      return (await db.month.findUnique({
        where: { year_month: { year, month } },
        select: { id: true },
      })) as { id: string } | null;
    },
    async findPriorClosedBefore(year, month) {
      const priorClosedMonth = await db.month.findFirst({
        where: {
          status: MonthStatus.CLOSED,
          OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        include: monthInclude,
      });

      return priorClosedMonth && "categories" in priorClosedMonth ? (priorClosedMonth as MonthRecord) : null;
    },
    createFromTemplate(input) {
      return db.month.create({
        data: {
          year: input.year,
          month: input.month,
          status: input.status,
          categories: {
            create: input.template.map((category, categoryIndex) => ({
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
    },
    close(monthId) {
      return db.month.update({
        where: { id: monthId },
        data: { status: MonthStatus.CLOSED, closedAt: new Date() },
        include: monthInclude,
      });
    },
  },
  templates: {
    readCategories() {
      return db.templateCategory.findMany({ orderBy: { sortOrder: "asc" }, include: templateInclude });
    },
    async replaceCategories(input: TemplateInput) {
      await db.templateCategory.deleteMany();

      for (const [categoryIndex, category] of input.categories.entries()) {
        await db.templateCategory.create({
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
    },
  },
  movements: {
    findById(movementId) {
      return db.movement.findUnique({ where: { id: movementId } });
    },
    async create(args: {
      type: MovementType;
      amount: Prisma.Decimal;
      description?: string | null;
      occurredAt?: Date;
      paymentMethod?: PaymentMethod | null;
      monthId?: string | null;
      sourceSubcategoryId?: string | null;
      targetSubcategoryId?: string | null;
      targetPocketId?: string | null;
      externalSourceLabel?: string | null;
    }) {
      await db.movement.create({ data: args });
    },
    async updateExpense(input) {
      await db.movement.update({
        where: { id: input.expenseId },
        data: {
          amount: input.amount,
          description: input.description,
          occurredAt: input.occurredAt,
          paymentMethod: input.paymentMethod,
          sourceSubcategoryId: input.sourceSubcategoryId,
        },
      });
    },
    async delete(movementId) {
      await db.movement.delete({ where: { id: movementId } });
    },
  },
  incomes: {},
  structure: {},
  pockets: {
    ensurePocketIsActive(pocketId, label) {
      return ensurePocketIsActive(db, pocketId, label);
    },
    async ensureTemplateDefaultPocketsAreActive(input) {
      const defaultPocketIds = new Set(
        input.categories
          .flatMap((category) => category.subcategories)
          .map((subcategory) => subcategory.defaultPocketId)
          .filter((defaultPocketId): defaultPocketId is string => Boolean(defaultPocketId)),
      );

      for (const defaultPocketId of defaultPocketIds) {
        await ensurePocketIsActive(db, defaultPocketId, "Default pocket");
      }
    },
  },
});

type PrismaClientLike = {
  $transaction<T>(work: (tx: MonthlyCycleDb) => Promise<T>, options?: unknown): Promise<T>;
};

export const createMonthlyCyclePrismaTransactionRunner = (db: PrismaClientLike): MonthlyCyclePorts["transactionRunner"] => ({
  run(work) {
    return db.$transaction((tx) => work(createMonthlyCyclePrismaAdapters(tx)));
  },
});
