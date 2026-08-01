import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../../../lib/prisma-client.js";
import type { MonthlyCyclePorts } from "../../application/ports/monthly-cycle-ports.js";
import { decimal } from "../../shared/money.js";
import type { MonthlyCycleMoney } from "../../shared/money.js";
import { DomainError, SemanticError } from "../../shared/service-errors.js";
import { monthInclude, templateInclude, type MonthRecord, type MonthlyCycleDb } from "../../shared/service-types.js";
import type { TemplateInput } from "../../dto/index.js";

export type MonthlyCyclePrismaPortSet = Omit<MonthlyCyclePorts, "transactionRunner">;

const readMonthById = async (db: MonthlyCycleDb, monthId: string): Promise<MonthRecord> => {
  const month = await db.month.findUnique({ where: { id: monthId }, include: monthInclude });

  if (!month) {
    throw new SemanticError("NOT_FOUND", 404, "Month was not found.");
  }

  return month as MonthRecord;
};

const ensurePocketIsActive = async (db: MonthlyCycleDb, pocketId: string, label: string, strict = false) => {
  const pocket = await db.savingsPocket.findUnique({
    where: { id: pocketId },
    select: { id: true, active: true },
  });

  if (!pocket || !pocket.active) {
    if (strict) throw new SemanticError("NOT_FOUND", 404, `${label} was not found.`);
    throw new DomainError(400, `${label} must exist and be active.`);
  }
};

const ensureCreditCardIsActive = async (db: MonthlyCycleDb, ownerId: string, creditCardId: string) => {
  const creditCard = await db.creditCard.findFirst({
    where: { id: creditCardId, ownerId, active: true },
    select: { id: true },
  });

  if (!creditCard) {
    throw new DomainError(400, "Credit card must exist, be owned by the current user, and be active.");
  }
};

const toPrismaDecimal = (value: MonthlyCycleMoney) => new Prisma.Decimal(value.toString());

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
                  plannedAmount: toPrismaDecimal(subcategory.plannedAmount),
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
                plannedAmount: toPrismaDecimal(decimal(subcategory.plannedAmount)),
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
      amount: MonthlyCycleMoney;
      description?: string | null;
      occurredAt?: Date;
      paymentMethod?: PaymentMethod | null;
      monthId?: string | null;
      sourceSubcategoryId?: string | null;
      targetSubcategoryId?: string | null;
      sourcePocketId?: string | null;
      targetPocketId?: string | null;
      externalSourceLabel?: string | null;
      creditCardId?: string | null;
    }) {
      await db.movement.create({ data: { ...args, amount: toPrismaDecimal(args.amount) } });
    },
    async updateExpense(input) {
      await db.movement.update({
        where: { id: input.expenseId },
        data: {
          amount: toPrismaDecimal(input.amount),
          description: input.description,
          occurredAt: input.occurredAt,
          paymentMethod: input.paymentMethod,
          sourceSubcategoryId: input.sourceSubcategoryId,
          creditCardId: input.creditCardId,
        },
      });
    },
    async delete(movementId) {
      await db.movement.delete({ where: { id: movementId } });
    },
    findExpenseHistory(input) {
      return db.movement.findMany({
        where: {
          monthId: input.monthId,
          type: MovementType.EXPENSE,
          ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
          ...(input.subcategoryId ? { sourceSubcategoryId: input.subcategoryId } : {}),
          ...(input.creditCardId ? { creditCardId: input.creditCardId } : {}),
          ...(input.from || input.to
            ? {
                occurredAt: {
                  ...(input.from ? { gte: new Date(input.from) } : {}),
                  ...(input.to ? { lte: new Date(input.to) } : {}),
                },
              }
            : {}),
        },
        orderBy: { occurredAt: "desc" },
      });
    },
    async findCashLedgerEvents(monthId) {
      const movements = await db.movement.findMany({
        where: { monthId, type: { in: [MovementType.CASH_WITHDRAWAL, MovementType.CASH_CARRYOVER_IN, MovementType.EXPENSE] } },
        orderBy: { occurredAt: "asc" },
      });

      return movements.filter(
        (movement) =>
          movement.type === MovementType.CASH_WITHDRAWAL || movement.type === MovementType.CASH_CARRYOVER_IN || movement.paymentMethod === PaymentMethod.CASH,
      );
    },
  },
  incomes: {
    findById(incomeId) {
      return db.monthlyIncome.findUnique({ where: { id: incomeId } });
    },
    async create(input) {
      await db.monthlyIncome.create({ data: { ...input, amount: toPrismaDecimal(input.amount) } });
    },
    async update(input) {
      const { incomeId, amount, ...data } = input;
      await db.monthlyIncome.update({ where: { id: incomeId }, data: { ...data, ...(amount ? { amount: toPrismaDecimal(amount) } : {}) } });
    },
    async delete(incomeId) {
      await db.monthlyIncome.delete({ where: { id: incomeId } });
    },
  },
  ledger: {
    read(monthId) {
      return readMonthById(db, monthId);
    },
  },
  structure: {
    createMonthCategory(input) {
      return db.monthCategory.create({ data: { monthId: input.monthId, name: input.name, sortOrder: input.sortOrder, templateCategoryId: input.templateCategoryId } });
    },
    async updateMonthCategory(input) {
      await db.monthCategory.update({ where: { id: input.categoryId }, data: { name: input.name } });
    },
    async linkMonthCategory(categoryId, templateCategoryId) {
      await db.monthCategory.update({ where: { id: categoryId }, data: { templateCategoryId } });
    },
    async deleteMonthCategory(categoryId) {
      await db.monthCategory.delete({ where: { id: categoryId } });
    },
    createMonthSubcategory(input) {
      return db.monthSubcategory.create({
        data: {
          monthCategoryId: input.categoryId,
          name: input.name,
          plannedAmount: toPrismaDecimal(input.plannedAmount),
          defaultPocketId: input.defaultPocketId,
          templateSubcategoryId: input.templateSubcategoryId,
          sortOrder: input.sortOrder,
        },
      });
    },
    async updateMonthSubcategory(input) {
      await db.monthSubcategory.update({
        where: { id: input.subcategoryId },
        data: {
          name: input.name,
          plannedAmount: toPrismaDecimal(input.plannedAmount),
          ...(input.defaultPocketId !== undefined ? { defaultPocketId: input.defaultPocketId } : {}),
        },
      });
    },
    async linkMonthSubcategory(subcategoryId, templateSubcategoryId) {
      await db.monthSubcategory.update({ where: { id: subcategoryId }, data: { templateSubcategoryId } });
    },
    async deleteMonthSubcategory(subcategoryId) {
      await db.monthSubcategory.delete({ where: { id: subcategoryId } });
    },
    createTemplateCategory(input) {
      return db.templateCategory.create({ data: { name: input.name, sortOrder: input.sortOrder, subcategories: { create: [] } } });
    },
    createTemplateSubcategory(input) {
      return db.templateSubcategory.create({
        data: {
          categoryId: input.categoryId,
          name: input.name,
          plannedAmount: toPrismaDecimal(input.plannedAmount),
          defaultPocketId: input.defaultPocketId,
          sortOrder: input.sortOrder,
        },
      });
    },
  },
  pockets: {
    ensurePocketIsActive(pocketId, label) {
      return ensurePocketIsActive(db, pocketId, label);
    },
    ensureStrictDepositTargetPocketIsActive(pocketId) {
      return ensurePocketIsActive(db, pocketId, "Target pocket", true);
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
  creditCards: {
    ensureCreditCardIsActive(ownerId, creditCardId) {
      return ensureCreditCardIsActive(db, ownerId, creditCardId);
    },
  },
  depositWriterGate: {
    async isEnabled() {
      const relation = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT to_regclass(current_schema() || '."MonthlyLedgerBackfillControl"') IS NOT NULL AS "exists"`,
      );
      if (!relation[0]?.exists) return true;

      const control = await db.$queryRawUnsafe<Array<{ writersEnabled: boolean }>>(
        `SELECT "writersEnabled" FROM "MonthlyLedgerBackfillControl" WHERE "id" = 'pocket-deposit-from-available'`,
      );
      return control[0]?.writersEnabled === true;
    },
  },
});

type PrismaClientLike = {
  $transaction<T>(work: (tx: MonthlyCycleDb) => Promise<T>, options?: unknown): Promise<T>;
};

const SERIALIZABLE_TRANSACTION_OPTIONS = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;
const MAX_SERIALIZABLE_ATTEMPTS = 3;
const isPrismaWriteConflict = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2034";

export const createMonthlyCyclePrismaTransactionRunner = (db: PrismaClientLike): MonthlyCyclePorts["transactionRunner"] => ({
  run(work) {
    return db.$transaction((tx) => work(createMonthlyCyclePrismaAdapters(tx)));
  },
  async runSerializable(work) {
    for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
      try {
        return await db.$transaction((tx) => work(createMonthlyCyclePrismaAdapters(tx)), SERIALIZABLE_TRANSACTION_OPTIONS);
      } catch (error) {
        if (!isPrismaWriteConflict(error)) throw error;
        if (attempt === MAX_SERIALIZABLE_ATTEMPTS) {
          throw new SemanticError("CONCURRENT_MODIFICATION", 409, "Concurrent modification prevented this pocket deposit.");
        }
      }
    }

    throw new Error("Unreachable serializable transaction retry exhaustion.");
  },
});
