import test from "node:test";
import assert from "node:assert/strict";
import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../lib/prisma-client.js";

import { createMonthlyCycleModule } from "./monthly-cycle.module.js";
import { DomainError } from "./shared/service-errors.js";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));
const createMonthlyCycleTestService = (db: unknown) => createMonthlyCycleModule({ db: db as never }).service;
const recordUncategorizedExpense = (service: ReturnType<typeof createMonthlyCycleTestService>, monthId: string, amount: number) =>
  service.recordExpense({
    monthId,
    sourceSubcategoryId: null,
    amount,
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });

type TemplateCategoryState = {
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

type MonthState = {
  id: string;
  year: number;
  month: number;
  status: MonthStatus;
  openedAt: Date;
  closedAt: Date | null;
  openingBalance?: Prisma.Decimal;
  openingSourceMonthId?: string | null;
  closureCarryAmount?: Prisma.Decimal | null;
  closureExcludedAmount?: Prisma.Decimal | null;
  incomes: Array<{
    id: string;
    monthId: string;
    sourceName: string;
    amount: Prisma.Decimal;
    receivedAt: Date;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
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
    type: MovementType;
    amount: Prisma.Decimal;
    monthId?: string | null;
    description?: string | null;
    sourceSubcategoryId: string | null;
    targetSubcategoryId: string | null;
    sourcePocketId: string | null;
    targetPocketId: string | null;
    creditCardId?: string | null;
    externalSourceLabel?: string | null;
    occurredAt?: Date;
    paymentMethod?: PaymentMethod | null;
    id?: string;
  }>;
};

const cloneTemplate = (categories: TemplateCategoryState[]): TemplateCategoryState[] =>
  categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) => ({
      ...subcategory,
      plannedAmount: money(Number(subcategory.plannedAmount.toString())),
    })),
  }));

const cloneMonth = (month: MonthState): MonthState => ({
  ...month,
  openedAt: new Date(month.openedAt),
  closedAt: month.closedAt ? new Date(month.closedAt) : null,
  incomes: month.incomes.map((income) => ({
    ...income,
    amount: money(Number(income.amount.toString())),
    receivedAt: new Date(income.receivedAt),
    createdAt: new Date(income.createdAt),
    updatedAt: new Date(income.updatedAt),
  })),
  categories: month.categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) => ({
      ...subcategory,
      plannedAmount: money(Number(subcategory.plannedAmount.toString())),
    })),
  })),
  movements: month.movements.map((movement) => ({
    ...movement,
    amount: money(Number(movement.amount.toString())),
    occurredAt: movement.occurredAt ? new Date(movement.occurredAt) : undefined,
  })),
});

const createIntegrationDb = (
  initialTemplate?: TemplateCategoryState[],
  options: { failTemplateSubcategoryNames?: string[] } = {},
) => {
  let nextId = 1;
  let templateCategories: TemplateCategoryState[] = initialTemplate ?? [
    {
      id: "template-category-1",
      name: "Base",
      sortOrder: 0,
      subcategories: [
        {
          id: "template-subcategory-food",
          name: "Comida",
          plannedAmount: money(300),
          defaultPocketId: "pocket-buffer",
          active: true,
          sortOrder: 0,
        },
      ],
    },
  ];
  const months: MonthState[] = [];
  const pockets = new Map([["pocket-buffer", { id: "pocket-buffer", active: true }]]);
  const creditCards = new Map([
    ["card-active", { id: "card-active", ownerId: "single-user", active: true }],
    ["card-inactive", { id: "card-inactive", ownerId: "single-user", active: false }],
    ["card-foreign", { id: "card-foreign", ownerId: "other-user", active: true }],
  ]);
  const capturedMovements: MonthState["movements"] = [];

  const db: any = {
    async $transaction<T>(callback: (tx: typeof db) => Promise<T>) {
      const templateSnapshot = cloneTemplate(templateCategories);
      const monthSnapshot = months.map(cloneMonth);
      const movementSnapshot = capturedMovements.map((movement) => ({ ...movement, amount: money(Number(movement.amount.toString())) }));

      try {
        return await callback(db);
      } catch (error) {
        templateCategories = templateSnapshot;
        months.splice(0, months.length, ...monthSnapshot);
        capturedMovements.splice(0, capturedMovements.length, ...movementSnapshot);
        throw error;
      }
    },
    async $queryRawUnsafe() {
      return [{ exists: false }];
    },
    async $queryRaw() {
      return [];
    },
    templateCategory: {
      async findMany() {
        return cloneTemplate(templateCategories);
      },
      async deleteMany(args: { where: { id: { notIn: string[] } } }) {
        const removed = templateCategories.filter((category) => !args.where.id.notIn.includes(category.id));
        const removedSubcategoryIds = removed.flatMap((category) => category.subcategories.map((subcategory) => subcategory.id));
        for (const category of months.flatMap((month) => month.categories)) {
          if (removed.some((candidate) => candidate.id === category.templateCategoryId)) category.templateCategoryId = null;
          for (const subcategory of category.subcategories) {
            if (removedSubcategoryIds.includes(subcategory.templateSubcategoryId ?? "")) subcategory.templateSubcategoryId = null;
          }
        }
        templateCategories = templateCategories.filter((category) => args.where.id.notIn.includes(category.id));
        return { count: removed.length };
      },
      async update(args: { where: { id: string }; data: { name: string; sortOrder: number } }) {
        const category = templateCategories.find((candidate) => candidate.id === args.where.id);
        if (!category) throw new Error("Template category missing in integration stub.");
        Object.assign(category, args.data);
        return category;
      },
      async create(args: {
        data: {
          name: string;
          sortOrder: number;
          subcategories: {
            create: Array<{ name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number }>;
          };
        };
      }) {
        const categoryId = `created-template-category-${nextId++}`;
        templateCategories.push({
          id: categoryId,
          name: args.data.name,
          sortOrder: args.data.sortOrder,
          subcategories: args.data.subcategories.create.map((subcategory) => ({
            id: `template-subcategory-${nextId++}`,
            name: subcategory.name,
            plannedAmount: subcategory.plannedAmount,
            defaultPocketId: subcategory.defaultPocketId,
            active: true,
            sortOrder: subcategory.sortOrder,
          })),
        });

        return cloneTemplate([templateCategories[templateCategories.length - 1]!])[0]!;
      },
    },
    templateSubcategory: {
      async update(args: { where: { id: string }; data: { name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number } }) {
        const subcategory = templateCategories.flatMap((category) => category.subcategories).find((candidate) => candidate.id === args.where.id);
        if (!subcategory) throw new Error("Template subcategory missing in integration stub.");
        Object.assign(subcategory, args.data);
        return subcategory;
      },
      async deleteMany(args: { where: { categoryId: string; id: { in: string[] } } }) {
        const category = templateCategories.find((candidate) => candidate.id === args.where.categoryId);
        if (!category) throw new Error("Template category missing in integration stub.");
        category.subcategories = category.subcategories.filter((subcategory) => !args.where.id.in.includes(subcategory.id));
        for (const subcategory of months.flatMap((month) => month.categories).flatMap((category) => category.subcategories)) {
          if (args.where.id.in.includes(subcategory.templateSubcategoryId ?? "")) subcategory.templateSubcategoryId = null;
        }
        return { count: args.where.id.in.length };
      },
      async create(args: {
        data: { categoryId: string; name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number };
      }) {
        if (options.failTemplateSubcategoryNames?.includes(args.data.name)) {
          throw new Error("Template subcategory persistence failed.");
        }

        const category = templateCategories.find((candidate) => candidate.id === args.data.categoryId);
        if (!category) throw new Error("Template category missing in integration stub.");
        const subcategory = {
          id: `template-subcategory-${nextId++}`,
          name: args.data.name,
          plannedAmount: args.data.plannedAmount,
          defaultPocketId: args.data.defaultPocketId,
          active: true,
          sortOrder: args.data.sortOrder,
        };
        category.subcategories.push(subcategory);
        return subcategory;
      },
    },
    month: {
      async findFirst(args: { where?: { status?: MonthStatus; OR?: [{ year: { lt: number } }, { year: number; month: { lt: number } }]; openingSourceMonthId?: string }; select?: unknown; orderBy?: unknown }) {
        const candidates = months.filter((month) => (!args.where?.status || month.status === args.where.status) &&
          (!args.where?.openingSourceMonthId || month.openingSourceMonthId === args.where.openingSourceMonthId) &&
          (!args.where?.OR || month.year < args.where.OR[0].year.lt || (month.year === args.where.OR[1].year && month.month < args.where.OR[1].month.lt)));
        if (args.orderBy) candidates.sort((a, b) => b.year - a.year || b.month - a.month);
        const found = candidates[0] ?? null;
        if (!found) return null;

        if (args.select) {
          return { id: found.id, year: found.year, month: found.month };
        }

        return cloneMonth(found);
      },
      async findUnique(args: { where?: { id?: string; year_month?: { year: number; month: number } } }) {
        if (args.where?.id) {
          const found = months.find((month) => month.id === args.where?.id);
          return found ? cloneMonth(found) : null;
        }

        if (args.where?.year_month) {
          return months.find((month) => month.year === args.where?.year_month?.year && month.month === args.where?.year_month?.month) ?? null;
        }

        return null;
      },
      async create(args: {
        data: {
          year: number;
          month: number;
          status: MonthStatus;
          openingBalance?: Prisma.Decimal;
          openingSourceMonthId?: string | null;
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
      }) {
        const month: MonthState = {
          id: `month-${nextId++}`,
          year: args.data.year,
          month: args.data.month,
          status: args.data.status,
          openingBalance: args.data.openingBalance ?? money(0),
          openingSourceMonthId: args.data.openingSourceMonthId ?? null,
          closureCarryAmount: null,
          closureExcludedAmount: null,
          openedAt: new Date("2026-05-01T00:00:00.000Z"),
          closedAt: null,
          incomes: [],
          categories: args.data.categories.create.map((category) => ({
            id: `month-category-${nextId++}`,
            name: category.name,
            sortOrder: category.sortOrder,
            templateCategoryId: category.templateCategoryId,
            subcategories: category.subcategories.create.map((subcategory) => ({
              id: `month-subcategory-${nextId++}`,
              name: subcategory.name,
              plannedAmount: subcategory.plannedAmount,
              defaultPocketId: subcategory.defaultPocketId,
              templateSubcategoryId: subcategory.templateSubcategoryId,
              sortOrder: subcategory.sortOrder,
            })),
          })),
          movements: [],
        };

        months.push(month);
        return cloneMonth(month);
      },
      async update(args: { where: { id: string }; data: { status: MonthStatus; closedAt: Date; closureCarryAmount?: Prisma.Decimal; closureExcludedAmount?: Prisma.Decimal } }) {
        const found = months.find((month) => month.id === args.where.id);
        if (!found) throw new Error("Month missing in integration stub.");

        Object.assign(found, args.data);
        return cloneMonth(found);
      },
    },
    movement: {
      async findUnique(args: { where: { id: string } }) {
        return capturedMovements.find((movement) => movement.id === args.where.id) ?? null;
      },
      async findMany(args: {
        where?: {
          monthId?: string;
          type?: MovementType | { in: MovementType[] };
          paymentMethod?: PaymentMethod;
          sourceSubcategoryId?: string;
          creditCardId?: string;
          occurredAt?: { gte?: Date; lte?: Date };
        };
      }) {
        const typeMatches = (movement: MonthState["movements"][number]) => {
          const typeFilter = args.where?.type;
          if (!typeFilter) return true;
          if (typeof typeFilter === "object" && "in" in typeFilter) return typeFilter.in.includes(movement.type);
          return movement.type === typeFilter;
        };

        return capturedMovements.filter((movement) => {
          const occurredAt = movement.occurredAt ?? new Date("2026-05-01T00:00:00.000Z");
          return (
            (!args.where?.monthId || movement.monthId === args.where.monthId) &&
            typeMatches(movement) &&
            (!args.where?.paymentMethod || movement.paymentMethod === args.where.paymentMethod) &&
            (!args.where?.sourceSubcategoryId || movement.sourceSubcategoryId === args.where.sourceSubcategoryId) &&
            (!args.where?.creditCardId || movement.creditCardId === args.where.creditCardId) &&
            (!args.where?.occurredAt?.gte || occurredAt >= args.where.occurredAt.gte) &&
            (!args.where?.occurredAt?.lte || occurredAt <= args.where.occurredAt.lte)
          );
        });
      },
      async create(args: {
        data: {
          type: MovementType;
          amount: Prisma.Decimal;
          description?: string | null;
          occurredAt?: Date;
          paymentMethod?: PaymentMethod | null;
          monthId?: string | null;
          sourceSubcategoryId?: string | null;
          targetSubcategoryId?: string | null;
          sourcePocketId?: string | null;
          targetPocketId?: string | null;
          creditCardId?: string | null;
          externalSourceLabel?: string | null;
        };
      }) {
        const movementId = `movement-${nextId++}`;
        const movement = {
          id: movementId,
          type: args.data.type,
          amount: args.data.amount,
          monthId: args.data.monthId ?? null,
          description: args.data.description ?? null,
          occurredAt: args.data.occurredAt ?? new Date("2026-05-01T00:00:00.000Z"),
          paymentMethod: args.data.paymentMethod ?? null,
          sourceSubcategoryId: args.data.sourceSubcategoryId ?? null,
          targetSubcategoryId: args.data.targetSubcategoryId ?? null,
          sourcePocketId: args.data.sourcePocketId ?? null,
          targetPocketId: args.data.targetPocketId ?? null,
          creditCardId: args.data.creditCardId ?? null,
          externalSourceLabel: args.data.externalSourceLabel ?? null,
        };
        capturedMovements.push(movement);

        const month = args.data.monthId ? months.find((candidate) => candidate.id === args.data.monthId) : null;
        if (month) {
          month.movements.push(movement);
        }

        return { id: movementId };
      },
      async update(args: {
        where: { id: string };
        data: {
          amount?: Prisma.Decimal;
          description?: string | null;
          occurredAt?: Date;
          paymentMethod?: PaymentMethod;
          sourceSubcategoryId?: string;
          creditCardId?: string | null;
        };
      }) {
        const movement = capturedMovements.find((candidate) => candidate.id === args.where.id);
        if (!movement) throw new Error("Movement missing in integration stub.");
        Object.assign(movement, args.data);
        return movement;
      },
      async delete(args: { where: { id: string } }) {
        const index = capturedMovements.findIndex((movement) => movement.id === args.where.id);
        if (index >= 0) capturedMovements.splice(index, 1);
        for (const month of months) {
          month.movements = month.movements.filter((movement) => movement.id !== args.where.id);
        }
        return {};
      },
    },
    monthCategory: {
      async create(args: { data: { monthId: string; name: string; sortOrder: number; templateCategoryId: string | null } }) {
        const month = months.find((candidate) => candidate.id === args.data.monthId);
        if (!month) throw new Error("Month missing in integration stub.");
        const category = {
          id: `month-category-${nextId++}`,
          name: args.data.name,
          sortOrder: args.data.sortOrder,
          templateCategoryId: args.data.templateCategoryId,
          subcategories: [],
        };
        month.categories.push(category);
        return category;
      },
      async update(args: { where: { id: string }; data: { name?: string; templateCategoryId?: string | null } }) {
        const category = months.flatMap((month) => month.categories).find((candidate) => candidate.id === args.where.id);
        if (!category) throw new Error("Month category missing in integration stub.");
        Object.assign(category, args.data);
        return category;
      },
      async delete(args: { where: { id: string } }) {
        for (const month of months) {
          month.categories = month.categories.filter((category) => category.id !== args.where.id);
        }
        return {};
      },
    },
    monthSubcategory: {
      async create(args: {
        data: {
          monthCategoryId: string;
          name: string;
          plannedAmount: Prisma.Decimal;
          defaultPocketId: string | null;
          templateSubcategoryId: string | null;
          sortOrder: number;
        };
      }) {
        const category = months.flatMap((month) => month.categories).find((candidate) => candidate.id === args.data.monthCategoryId);
        if (!category) throw new Error("Month category missing in integration stub.");
        const subcategory = {
          id: `month-subcategory-${nextId++}`,
          name: args.data.name,
          plannedAmount: args.data.plannedAmount,
          defaultPocketId: args.data.defaultPocketId,
          templateSubcategoryId: args.data.templateSubcategoryId,
          sortOrder: args.data.sortOrder,
        };
        category.subcategories.push(subcategory);
        return subcategory;
      },
      async update(args: {
        where: { id: string };
        data: { name?: string; plannedAmount?: Prisma.Decimal; defaultPocketId?: string | null; templateSubcategoryId?: string | null };
      }) {
        const subcategory = months
          .flatMap((month) => month.categories)
          .flatMap((category) => category.subcategories)
          .find((candidate) => candidate.id === args.where.id);
        if (!subcategory) throw new Error("Month subcategory missing in integration stub.");
        Object.assign(subcategory, args.data);
        return subcategory;
      },
      async delete(args: { where: { id: string } }) {
        for (const month of months) {
          for (const category of month.categories) {
            category.subcategories = category.subcategories.filter((subcategory) => subcategory.id !== args.where.id);
          }
        }
        return {};
      },
    },
    monthlyIncome: {
      async findUnique(args: { where: { id: string } }) {
        return months.flatMap((month) => month.incomes).find((income) => income.id === args.where.id) ?? null;
      },
      async create(args: {
        data: { monthId: string; sourceName: string; amount: Prisma.Decimal; receivedAt: Date; notes: string | null };
      }) {
        const month = months.find((candidate) => candidate.id === args.data.monthId);
        if (!month) throw new Error("Month missing in integration stub.");
        const income = {
          id: `income-${nextId++}`,
          monthId: args.data.monthId,
          sourceName: args.data.sourceName,
          amount: args.data.amount,
          receivedAt: args.data.receivedAt,
          notes: args.data.notes,
          createdAt: new Date("2026-05-01T00:00:00.000Z"),
          updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        };
        month.incomes.push(income);
        return income;
      },
      async update(args: { where: { id: string }; data: Partial<MonthState["incomes"][number]> }) {
        const income = months.flatMap((month) => month.incomes).find((candidate) => candidate.id === args.where.id);
        if (!income) throw new Error("Income missing in integration stub.");
        Object.assign(income, args.data, { updatedAt: new Date("2026-05-02T00:00:00.000Z") });
        return income;
      },
      async delete(args: { where: { id: string } }) {
        for (const month of months) {
          month.incomes = month.incomes.filter((income) => income.id !== args.where.id);
        }
        return {};
      },
    },
    savingsPocket: {
      async findUnique(args: { where: { id: string } }) {
        return pockets.get(args.where.id) ?? null;
      },
    },
    creditCard: {
      async findFirst(args: { where: { id: string; ownerId: string; active: boolean } }) {
        const card = creditCards.get(args.where.id) ?? null;
        if (!card || card.ownerId !== args.where.ownerId || card.active !== args.where.active) return null;
        return { id: card.id };
      },
    },
  };

  return { db, getCapturedMovements: () => capturedMovements };
};

test("service integration: explicit month edits update linked Template fields and retain identities", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const opened = await service.openMonth({ year: 2026, month: 5 });
  const category = opened.categories[0]!;
  const subcategory = category.subcategories[0]!;
  await service.updateMonthCategory({ monthId: opened.id, categoryId: category.id, name: "Food", updateTemplate: true });
  const updated = await service.updateMonthSubcategory({ monthId: opened.id, subcategoryId: subcategory.id, name: "Market", plannedAmount: 125, defaultPocketId: null, updateTemplate: true });
  const template = await service.getTemplate();
  assert.equal(template.categories[0]!.id, category.templateCategoryId);
  assert.equal(template.categories[0]!.name, "Food");
  assert.equal(template.categories[0]!.subcategories[0]!.id, subcategory.templateSubcategoryId);
  assert.equal(template.categories[0]!.subcategories[0]!.name, "Market");
  assert.equal(template.categories[0]!.subcategories[0]!.plannedAmount, 125);
  assert.equal(template.categories[0]!.subcategories[0]!.defaultPocketId, null);
  assert.equal(updated.categories[0]!.subcategories[0]!.plannedAmount, 125);
});

test("service integration: propagation rolls back Template and month when the second write fails", async () => {
  for (const kind of ["category", "subcategory"] as const) {
    const { db } = createIntegrationDb();
    const service = createMonthlyCycleTestService(db);
    const opened = await service.openMonth({ year: 2026, month: 5 });
    const beforeTemplate = await service.getTemplate();
    const repository = kind === "category" ? db.monthCategory : db.monthSubcategory;
    const originalUpdate = repository.update.bind(repository);
    repository.update = async (args: unknown) => {
      await originalUpdate(args);
      throw new Error("Month persistence failed.");
    };
    await assert.rejects(() => kind === "category"
      ? service.updateMonthCategory({ monthId: opened.id, categoryId: opened.categories[0]!.id, name: "Food", updateTemplate: true })
      : service.updateMonthSubcategory({ monthId: opened.id, subcategoryId: opened.categories[0]!.subcategories[0]!.id, name: "Market", plannedAmount: 125, defaultPocketId: null, updateTemplate: true }), /Month persistence failed/);
    assert.deepEqual(await service.getTemplate(), beforeTemplate);
    assert.deepEqual(await service.getActiveMonth(), opened);
  }
});

test("service integration: opening a month snapshots the template and later template edits do not mutate it", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);

  const openedMonth = await service.openMonth({ year: 2026, month: 5 });

  const originalTemplate = await service.getTemplate();
  const savedTemplate = await service.updateTemplate({
    categories: [
      {
        id: originalTemplate.categories[0]!.id,
        name: "Base editada",
        subcategories: [{ id: originalTemplate.categories[0]!.subcategories[0]!.id, name: "Comida editada", plannedAmount: 999, defaultPocketId: "pocket-buffer" }],
      },
    ],
  });

  const activeMonth = await service.getActiveMonth();

  assert.equal(openedMonth.categories[0]?.name, "Base");
  assert.equal(activeMonth?.categories[0]?.name, "Base");
  assert.equal(activeMonth?.categories[0]?.subcategories[0]?.name, "Comida");
  assert.equal(activeMonth?.categories[0]?.subcategories[0]?.plannedAmount, 300);
  assert.equal(activeMonth?.categories[0]?.subcategories[0]?.defaultPocketId, openedMonth.categories[0]?.subcategories[0]?.defaultPocketId);
  assert.equal(savedTemplate.categories[0]?.id, originalTemplate.categories[0]?.id);
  assert.equal(savedTemplate.categories[0]?.subcategories[0]?.id, originalTemplate.categories[0]?.subcategories[0]?.id);
  assert.equal(activeMonth?.categories[0]?.templateCategoryId, originalTemplate.categories[0]?.id);
  assert.equal(activeMonth?.categories[0]?.subcategories[0]?.templateSubcategoryId, originalTemplate.categories[0]?.subcategories[0]?.id);
});

test("service integration: promoted subcategory relinks stale parent template ids after a template rewrite", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);

  const openedMonth = await service.openMonth({ year: 2026, month: 5 });
  const snapshotCategory = openedMonth.categories[0];
  if (!snapshotCategory?.templateCategoryId) throw new Error("Missing template-linked snapshot category.");

  await service.updateTemplate({
    categories: [
      {
        name: "Base",
        subcategories: [{ name: "Comida editada", plannedAmount: 999, defaultPocketId: "pocket-buffer" }],
      },
    ],
  });

  const updatedMonth = await service.createMonthSubcategory({
    monthId: openedMonth.id,
    categoryId: snapshotCategory.id,
    name: "Taxi",
    plannedAmount: 50,
    addToTemplate: true,
  });
  const updatedCategory = updatedMonth.categories.find((category) => category.id === snapshotCategory.id);
  const newSubcategory = updatedCategory?.subcategories.find((subcategory) => subcategory.name === "Taxi");
  const template = await service.getTemplate();
  const baseCategories = template.categories.filter((category) => category.name === "Base");
  const currentTemplateCategory = baseCategories[0];

  assert.equal(baseCategories.length, 1);
  assert.notEqual(updatedCategory?.templateCategoryId, snapshotCategory.templateCategoryId);
  assert.equal(updatedCategory?.templateCategoryId, currentTemplateCategory?.id);
  assert.equal(currentTemplateCategory?.subcategories.some((subcategory) => subcategory.name === "Comida editada"), true);
  assert.equal(currentTemplateCategory?.subcategories.some((subcategory) => subcategory.name === "Taxi"), true);
  assert.equal(
    currentTemplateCategory?.subcategories.some((subcategory) => subcategory.id === newSubcategory?.templateSubcategoryId),
    true,
  );
});

test("service integration: promoted subcategory recreates a missing template parent after a template rewrite", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);

  const openedMonth = await service.openMonth({ year: 2026, month: 5 });
  const snapshotCategory = openedMonth.categories[0];
  if (!snapshotCategory?.templateCategoryId) throw new Error("Missing template-linked snapshot category.");

  await service.updateTemplate({
    categories: [
      {
        name: "Renombrada",
        subcategories: [{ name: "Movida", plannedAmount: 999, defaultPocketId: "pocket-buffer" }],
      },
    ],
  });

  const updatedMonth = await service.createMonthSubcategory({
    monthId: openedMonth.id,
    categoryId: snapshotCategory.id,
    name: "Taxi",
    plannedAmount: 50,
    addToTemplate: true,
  });
  const updatedCategory = updatedMonth.categories.find((category) => category.id === snapshotCategory.id);
  const newSubcategory = updatedCategory?.subcategories.find((subcategory) => subcategory.name === "Taxi");
  const template = await service.getTemplate();
  const rewrittenTemplateCategory = template.categories.find((category) => category.name === "Renombrada");
  const recreatedParentCategories = template.categories.filter((category) => category.name === snapshotCategory.name);
  const recreatedParentCategory = recreatedParentCategories[0];

  assert.equal(recreatedParentCategories.length, 1);
  assert.notEqual(updatedCategory?.templateCategoryId, snapshotCategory.templateCategoryId);
  assert.equal(updatedCategory?.templateCategoryId, recreatedParentCategory?.id);
  assert.equal(rewrittenTemplateCategory?.subcategories.some((subcategory) => subcategory.name === "Movida"), true);
  assert.equal(recreatedParentCategory?.subcategories.length, 1);
  assert.equal(recreatedParentCategory?.subcategories[0]?.name, "Taxi");
  assert.equal(recreatedParentCategory?.subcategories[0]?.plannedAmount, 50);
  assert.equal(recreatedParentCategory?.subcategories[0]?.id, newSubcategory?.templateSubcategoryId);
});

test("service integration: opening a second active month is rejected", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);

  await service.openMonth({ year: 2026, month: 5 });

  await assert.rejects(() => service.openMonth({ year: 2026, month: 6 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /Ya existe un mes activo/i);
    return true;
  });
});

test("service integration: closed months are immutable", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  await recordUncategorizedExpense(service, month.id, 300);

  await service.closeMonth(month.id);

  await assert.rejects(
    () =>
      service.recordExpense({
        monthId: month.id,
        sourceSubcategoryId: subcategoryId,
        amount: 10,
        occurredAt: "2026-05-10T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
      return true;
    },
  );
});

test("service integration: rejects cash withdrawal for closed months", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  await recordUncategorizedExpense(service, month.id, 300);
  await service.closeMonth(month.id);

  await assert.rejects(
    () => service.withdrawCash({ monthId: month.id, amount: 20, occurredAt: "2026-05-10T00:00:00.000Z" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
      return true;
    },
  );
});

test("service integration: rejects reopening a previously closed month", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  await recordUncategorizedExpense(service, month.id, 300);
  await service.closeMonth(month.id);

  await assert.rejects(() => service.openMonth({ year: 2026, month: 5 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /ya existe/i);
    return true;
  });
});

test("service integration: rejects unknown month and subcategory references for expenses and history", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  await assert.rejects(
    () => service.listExpenseHistory({ monthId: "missing-month" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /No se encontró el mes/i);
      return true;
    },
  );

  await assert.rejects(
    () => service.listExpenseHistory({ monthId: month.id, subcategoryId: "missing-subcategory" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /No se encontró la subcategoría/i);
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.recordExpense({
        monthId: month.id,
        sourceSubcategoryId: "missing-subcategory",
        amount: 10,
        occurredAt: "2026-05-10T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /No se encontró la subcategoría/i);
      return true;
    },
  );
});

test("service integration: closing is rejected while closure review has pending balances", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: month.categories[0]?.subcategories[0]?.id ?? "",
    amount: 350,
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });

  await assert.rejects(() => service.closeMonth(month.id), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /saldos pendientes de subcategorías o dinero disponible/i);
    return true;
  });
});

test("service integration: valid subcategory deposits persist and decrease the source balance", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  const updatedMonth = await service.depositToPocket({
    sourceKind: "SUBCATEGORY",
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    targetPocketId: "pocket-buffer",
    amount: 40,
    description: "Reserva mensual",
    occurredAt: "2026-05-10T00:00:00.000Z",
  });
  const movement = getCapturedMovements()[0];

  assert.equal(movement?.type, MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY);
  assert.equal(movement?.monthId, month.id);
  assert.equal(movement?.sourceSubcategoryId, subcategoryId);
  assert.equal(movement?.targetPocketId, "pocket-buffer");
  assert.equal(Number(movement?.amount.toString()), 40);
  assert.equal(updatedMonth?.categories[0]?.subcategories[0]?.available, 260);
});

test("service integration: valid external deposits persist without a month ledger entry", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);

  const updatedMonth = await service.depositToPocket({
    sourceKind: "EXTERNAL",
    targetPocketId: "pocket-buffer",
    amount: 75,
    externalSourceLabel: "Ingreso aislado",
    description: "Regalo",
    occurredAt: "2026-05-10T00:00:00.000Z",
  });
  const movement = getCapturedMovements()[0];

  assert.equal(updatedMonth, null);
  assert.equal(movement?.type, MovementType.POCKET_DEPOSIT_EXTERNAL);
  assert.equal(movement?.monthId, null);
  assert.equal(movement?.sourceSubcategoryId, null);
  assert.equal(movement?.targetPocketId, "pocket-buffer");
  assert.equal(movement?.externalSourceLabel, "Ingreso aislado");
  assert.equal(Number(movement?.amount.toString()), 75);
});

test("service integration: income CRUD updates month totals while active", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  const withIncome = await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 1000,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  const incomeId = withIncome.incomes[0]?.id ?? "";
  const updated = await service.updateMonthlyIncome({ monthId: month.id, incomeId, amount: 1200, notes: "net" });
  const deleted = await service.deleteMonthlyIncome(month.id, incomeId);

  assert.equal(withIncome.monthlyIncomeTotal, 1000);
  assert.equal(withIncome.availableMoney, 1000);
  assert.equal(updated.monthlyIncomeTotal, 1200);
  assert.equal(updated.incomes[0]?.notes, "net");
  assert.equal(deleted.monthlyIncomeTotal, 0);
  assert.equal(deleted.incomes.length, 0);
});

test("service integration: income CRUD rejects closed month mutations", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const withIncome = await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  const incomeId = withIncome.incomes[0]?.id ?? "";
  await recordUncategorizedExpense(service, month.id, 300);
  const closed = await service.closeMonth(month.id);

  await assert.rejects(
    () => service.createMonthlyIncome({ monthId: closed.id, sourceName: "Bonus", amount: 10, receivedAt: "2026-05-06T00:00:00.000Z" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateMonthlyIncome({ monthId: closed.id, incomeId, amount: 350 }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
      return true;
    },
  );

  await assert.rejects(
    () => service.deleteMonthlyIncome(closed.id, incomeId),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
      return true;
    },
  );
});

test("service integration: opening next month does not carry forward prior income", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const may = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = may.categories[0]?.subcategories[0]?.id ?? "";

  const mayWithIncome = await service.createMonthlyIncome({
    monthId: may.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  await recordUncategorizedExpense(service, may.id, 300);
  await service.closeMonth(may.id);

  const june = await service.openMonth({ year: 2026, month: 6 });

  assert.equal(mayWithIncome.incomes.length, 1);
  assert.equal(mayWithIncome.monthlyIncomeTotal, 300);
  assert.equal(june.incomes.length, 0);
  assert.equal(june.monthlyIncomeTotal, 0);
  assert.equal(june.availableMoney, 0);
});

test("service integration: overspend is persisted and recalculates the month as negative", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  const updatedMonth = await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    amount: 350,
    description: "Compra grande",
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });
  const movement = getCapturedMovements()[0];

  assert.equal(movement?.type, MovementType.EXPENSE);
  assert.equal(movement?.monthId, month.id);
  assert.equal(movement?.sourceSubcategoryId, subcategoryId);
  assert.equal(Number(movement?.amount.toString()), 350);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, -50);
});

test("service integration: deficit coverage from one subcategory persists a single coverage movement", async () => {
  const { db, getCapturedMovements } = createIntegrationDb([
    {
      id: "template-category-1",
      name: "Base",
      sortOrder: 0,
      subcategories: [
        {
          id: "template-subcategory-food",
          name: "Comida",
          plannedAmount: money(300),
          defaultPocketId: "pocket-buffer",
          active: true,
          sortOrder: 0,
        },
        {
          id: "template-subcategory-transport",
          name: "Transporte",
          plannedAmount: money(100),
          defaultPocketId: "pocket-buffer",
          active: true,
          sortOrder: 1,
        },
      ],
    },
  ]);
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const surplusSourceId = month.categories[0]?.subcategories[0]?.id ?? "";
  const deficitTargetId = month.categories[0]?.subcategories[1]?.id ?? "";

  await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: deficitTargetId,
    amount: 150,
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });
  const review = await service.applyClosureAction({
    monthId: month.id,
    type: "DEFICIT_COVER_FROM_SUBCATEGORY",
    sourceSubcategoryId: surplusSourceId,
    targetSubcategoryId: deficitTargetId,
    amount: 50,
    description: "Cobertura desde sobrante",
  });
  const coverageMovement = getCapturedMovements()[1];

  assert.equal(coverageMovement?.type, MovementType.DEFICIT_COVER_FROM_SUBCATEGORY);
  assert.equal(coverageMovement?.sourceSubcategoryId, surplusSourceId);
  assert.equal(coverageMovement?.targetSubcategoryId, deficitTargetId);
  assert.equal(Number(coverageMovement?.amount.toString()), 50);
  assert.equal(review.pendingDeficits.length, 0);
  assert.equal(review.pendingSurpluses.some((surplus) => surplus.subcategoryId === surplusSourceId && surplus.amount === 250), true);
});

test("service integration: template edits are readable after persistence", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);

  await service.updateTemplate({
    categories: [
      {
        name: "Variables",
        subcategories: [{ name: "Supermercado", plannedAmount: 450, defaultPocketId: "pocket-buffer" }],
      },
    ],
  });
  const template = await service.getTemplate();

  assert.equal(template.categories[0]?.name, "Variables");
  assert.equal(template.categories[0]?.subcategories[0]?.name, "Supermercado");
  assert.equal(template.categories[0]?.subcategories[0]?.plannedAmount, 450);
  assert.equal(template.categories[0]?.subcategories[0]?.defaultPocketId, "pocket-buffer");
});

test("service integration: records non-cash expense with occurred date and exposes cash balance", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  const updatedMonth = await service.recordExpense({ monthId: month.id, sourceSubcategoryId: subcategoryId, amount: 75, description: "Supermercado", occurredAt: "2026-05-17T00:00:00.000Z", paymentMethod: PaymentMethod.NON_CASH });
  const movement = getCapturedMovements()[0];

  assert.equal(movement?.type, MovementType.EXPENSE);
  assert.equal(movement?.paymentMethod, PaymentMethod.NON_CASH);
  assert.equal(movement?.occurredAt?.toISOString(), "2026-05-17T00:00:00.000Z");
  assert.equal(updatedMonth.availableMoney, -75);
  assert.equal(updatedMonth.cashBalance, 0);
});

test("service integration: records card-paid expenses once and exposes the credit-card reference in history", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  const updatedMonth = await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    amount: 75,
    description: "Card market",
    occurredAt: "2026-05-17T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
    creditCardId: "card-active",
  });
  const history = await service.listExpenseHistory({ monthId: month.id, creditCardId: "card-active" });
  const movement = getCapturedMovements()[0];

  assert.equal(movement?.creditCardId, "card-active");
  assert.equal(updatedMonth.availableMoney, -75);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, 225);
  assert.deepEqual(history.expenses.map((expense) => [expense.id, expense.amount, expense.creditCardId]), [[movement?.id, 75, "card-active"]]);
});

test("service integration: rejects inactive missing or unowned card expense links without changing totals", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  for (const creditCardId of ["card-inactive", "card-missing", "card-foreign"]) {
    await assert.rejects(
      () =>
        service.recordExpense({
          monthId: month.id,
          sourceSubcategoryId: subcategoryId,
          amount: 25,
          occurredAt: "2026-05-17T00:00:00.000Z",
          paymentMethod: PaymentMethod.NON_CASH,
          creditCardId,
        }),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /La tarjeta de crédito debe existir/i);
        return true;
      },
    );
  }

  const activeMonth = await service.getActiveMonth();
  assert.equal(getCapturedMovements().length, 0);
  assert.equal(activeMonth?.availableMoney, 0);
  assert.equal(activeMonth?.categories[0]?.subcategories[0]?.available, 300);
});

test("service integration: rejects expense dates outside the linked month", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await assert.rejects(
    () => service.recordExpense({ monthId: month.id, sourceSubcategoryId: subcategoryId, amount: 10, occurredAt: "2026-06-01T00:00:00.000Z", paymentMethod: PaymentMethod.NON_CASH }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /dentro del mes vinculado/i);
      return true;
    },
  );
});

test("service integration: withdraws cash only when available money is sufficient", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  await assert.rejects(
    () => service.withdrawCash({ monthId: month.id, amount: 50, occurredAt: "2026-05-10T00:00:00.000Z" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Dinero disponible insuficiente/i);
      return true;
    },
  );

  await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 100, receivedAt: "2026-05-05T00:00:00.000Z" });
  const result = await service.withdrawCash({ monthId: month.id, amount: 40, occurredAt: "2026-05-10T00:00:00.000Z", description: "ATM" });
  const withdrawal = getCapturedMovements().find((movement) => movement.type === MovementType.CASH_WITHDRAWAL);

  assert.equal(withdrawal?.type, MovementType.CASH_WITHDRAWAL);
  assert.equal(withdrawal?.description, "ATM");
  assert.equal(result.month.availableMoney, 60);
  assert.equal(result.month.cashBalance, 40);
});

test("service integration: cash expense is rejected when physical cash is insufficient", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await assert.rejects(
    () => service.recordExpense({ monthId: month.id, sourceSubcategoryId: subcategoryId, amount: 25, occurredAt: "2026-05-11T00:00:00.000Z", paymentMethod: PaymentMethod.CASH }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Efectivo insuficiente/i);
      return true;
    },
  );
});

test("service integration: updates active-month expenses and recalculates balances", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 200, receivedAt: "2026-05-01T00:00:00.000Z" });
  await service.withdrawCash({ monthId: month.id, amount: 200, occurredAt: "2026-05-02T00:00:00.000Z" });
  await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    amount: 75,
    description: "Supermercado",
    occurredAt: "2026-05-17T00:00:00.000Z",
    paymentMethod: PaymentMethod.CASH,
  });
  const expenseId = getCapturedMovements().find((movement) => movement.type === MovementType.EXPENSE)?.id ?? "";

  const updatedMonth = await service.updateExpense({
    monthId: month.id,
    expenseId,
    sourceSubcategoryId: subcategoryId,
    amount: 120,
    description: "Supermercado corregido",
    occurredAt: "2026-05-18T00:00:00.000Z",
    paymentMethod: PaymentMethod.CASH,
  });
  const updatedMovement = getCapturedMovements().find((movement) => movement.id === expenseId);

  assert.equal(Number(updatedMovement?.amount.toString()), 120);
  assert.equal(updatedMovement?.description, "Supermercado corregido");
  assert.equal(updatedMovement?.occurredAt?.toISOString(), "2026-05-18T00:00:00.000Z");
  assert.equal(updatedMonth.availableMoney, 0);
  assert.equal(updatedMonth.cashBalance, 80);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, 180);
});

test("service integration: deletes active-month expenses and recalculates balances", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 100, receivedAt: "2026-05-01T00:00:00.000Z" });
  await service.withdrawCash({ monthId: month.id, amount: 100, occurredAt: "2026-05-02T00:00:00.000Z" });
  await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    amount: 75,
    occurredAt: "2026-05-17T00:00:00.000Z",
    paymentMethod: PaymentMethod.CASH,
  });
  const expenseId = getCapturedMovements().find((movement) => movement.type === MovementType.EXPENSE)?.id ?? "";

  const updatedMonth = await service.deleteExpense(month.id, expenseId);

  assert.equal(getCapturedMovements().some((movement) => movement.id === expenseId), false);
  assert.equal(updatedMonth.availableMoney, 0);
  assert.equal(updatedMonth.cashBalance, 100);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, 300);
});

test("service integration: rejects expense corrections for expenses that belong to closed months", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const may = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = may.categories[0]?.subcategories[0]?.id ?? "";
  await service.recordExpense({
    monthId: may.id,
    sourceSubcategoryId: subcategoryId,
    amount: 50,
    occurredAt: "2026-05-17T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });
  const expenseId = getCapturedMovements()[0]?.id ?? "";
  await service.createMonthlyIncome({ monthId: may.id, sourceName: "Salary", amount: 300, receivedAt: "2026-05-01T00:00:00.000Z" });
  await recordUncategorizedExpense(service, may.id, 250);
  await service.closeMonth(may.id);

  await assert.rejects(
    () =>
      service.updateExpense({
        monthId: may.id,
        expenseId,
        sourceSubcategoryId: subcategoryId,
        amount: 55,
        occurredAt: "2026-05-17T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
      return true;
    },
  );

  await assert.rejects(() => service.deleteExpense(may.id, expenseId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
    return true;
  });
});

test("service integration: rejects foreign expense ids from another month", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const may = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = may.categories[0]?.subcategories[0]?.id ?? "";
  await service.recordExpense({
    monthId: may.id,
    sourceSubcategoryId: subcategoryId,
    amount: 50,
    occurredAt: "2026-05-17T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });
  const expenseId = getCapturedMovements()[0]?.id ?? "";
  await service.createMonthlyIncome({ monthId: may.id, sourceName: "Salary", amount: 300, receivedAt: "2026-05-01T00:00:00.000Z" });
  await recordUncategorizedExpense(service, may.id, 250);
  await service.closeMonth(may.id);
  const june = await service.openMonth({ year: 2026, month: 6 });
  const juneSubcategoryId = june.categories[0]?.subcategories[0]?.id ?? "";

  await assert.rejects(
    () =>
      service.updateExpense({
        monthId: june.id,
        expenseId,
        sourceSubcategoryId: juneSubcategoryId,
        amount: 55,
        occurredAt: "2026-06-17T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /No se encontró el gasto en este mes/i);
      return true;
    },
  );

  await assert.rejects(() => service.deleteExpense(june.id, expenseId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /No se encontró el gasto en este mes/i);
    return true;
  });
});

test("service integration: category and subcategory edits mutate only the active-month snapshot", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const categoryId = month.categories[0]?.id ?? "";
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  const categoryEdited = await service.updateMonthCategory({ monthId: month.id, categoryId, name: "Variables" });
  const subcategoryEdited = await service.updateMonthSubcategory({
    monthId: month.id,
    subcategoryId,
    name: "Supermercado",
    plannedAmount: 450,
    defaultPocketId: "pocket-buffer",
  });
  const template = await service.getTemplate();

  assert.equal(categoryEdited.categories[0]?.name, "Variables");
  assert.equal(subcategoryEdited.categories[0]?.subcategories[0]?.name, "Supermercado");
  assert.equal(subcategoryEdited.categories[0]?.subcategories[0]?.plannedAmount, 450);
  assert.equal(template.categories[0]?.name, "Base");
  assert.equal(template.categories[0]?.subcategories[0]?.name, "Comida");
  assert.equal(template.categories[0]?.subcategories[0]?.plannedAmount, 300);
});

test("service integration: active-month category creation can stay snapshot-only or promote to template", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  const snapshotOnly = await service.createMonthCategory({ monthId: month.id, name: "Variables", addToTemplate: false });
  const promoted = await service.createMonthCategory({ monthId: month.id, name: "Ahorro", addToTemplate: true });
  const template = await service.getTemplate();

  assert.equal(snapshotOnly.categories.find((category) => category.name === "Variables")?.templateCategoryId, null);
  assert.equal(promoted.categories.find((category) => category.name === "Ahorro")?.sortOrder, 2);
  assert.equal(template.categories.some((category) => category.name === "Variables"), false);
  assert.equal(template.categories.find((category) => category.name === "Ahorro")?.sortOrder, 1);
});

test("service integration: promoted subcategory under a month-only parent links parent and child template records", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const withMonthOnlyCategory = await service.createMonthCategory({ monthId: month.id, name: "Mes", addToTemplate: false });
  const monthOnlyCategory = withMonthOnlyCategory.categories.find((category) => category.name === "Mes");
  if (!monthOnlyCategory) throw new Error("Missing created month-only category.");

  const updatedMonth = await service.createMonthSubcategory({
    monthId: month.id,
    categoryId: monthOnlyCategory.id,
    name: "Taxi",
    plannedAmount: 0,
    addToTemplate: true,
  });
  const updatedCategory = updatedMonth.categories.find((category) => category.id === monthOnlyCategory.id);
  const template = await service.getTemplate();
  const promotedParent = template.categories.find((category) => category.name === "Mes");

  assert.ok(updatedCategory?.templateCategoryId);
  assert.ok(updatedCategory?.subcategories[0]?.templateSubcategoryId);
  assert.equal(updatedCategory?.subcategories[0]?.plannedAmount, 0);
  assert.equal(promotedParent?.subcategories[0]?.name, "Taxi");
  assert.equal(promotedParent?.subcategories[0]?.plannedAmount, 0);
});

test("service integration: failed template promotion rolls back snapshot and template writes", async () => {
  const { db } = createIntegrationDb(undefined, { failTemplateSubcategoryNames: ["Rollback"] });
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const withMonthOnlyCategory = await service.createMonthCategory({ monthId: month.id, name: "Temporal", addToTemplate: false });
  const monthOnlyCategory = withMonthOnlyCategory.categories.find((category) => category.name === "Temporal");
  if (!monthOnlyCategory) throw new Error("Missing created month-only category.");

  await assert.rejects(
    () =>
      service.createMonthSubcategory({
        monthId: month.id,
        categoryId: monthOnlyCategory.id,
        name: "Rollback",
        plannedAmount: 10,
        addToTemplate: true,
      }),
    /Template subcategory persistence failed/,
  );
  const activeMonth = await service.getActiveMonth();
  const template = await service.getTemplate();

  assert.equal(activeMonth?.categories.find((category) => category.id === monthOnlyCategory.id)?.templateCategoryId, null);
  assert.equal(activeMonth?.categories.find((category) => category.id === monthOnlyCategory.id)?.subcategories.length, 0);
  assert.equal(template.categories.some((category) => category.name === "Temporal"), false);
});

test("service integration: deletes empty subcategories before deleting their category", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const categoryId = month.categories[0]?.id ?? "";
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await assert.rejects(() => service.deleteMonthCategory(month.id, categoryId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /Elimine primero las subcategorías/i);
    return true;
  });

  const withoutSubcategory = await service.deleteMonthSubcategory(month.id, subcategoryId);
  const withoutCategory = await service.deleteMonthCategory(month.id, categoryId);

  assert.equal(withoutSubcategory.categories[0]?.subcategories.length, 0);
  assert.equal(withoutCategory.categories.some((category) => category.id === categoryId), false);
});

test("service integration: rejects deleting movement-linked month structure nodes", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const categoryId = month.categories[0]?.id ?? "";
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    amount: 30,
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });

  await assert.rejects(() => service.deleteMonthSubcategory(month.id, subcategoryId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /movimientos asociados/i);
    return true;
  });

  await assert.rejects(() => service.deleteMonthCategory(month.id, categoryId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /Elimine primero las subcategorías/i);
    return true;
  });
});

test("service integration: month structure corrections reject closed months and missing nodes", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 300, receivedAt: "2026-05-01T00:00:00.000Z" });
  await recordUncategorizedExpense(service, month.id, 300);
  await service.closeMonth(month.id);

  await assert.rejects(
    () => service.updateMonthSubcategory({ monthId: month.id, subcategoryId, name: "Closed", plannedAmount: 300 }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Los meses cerrados no se pueden modificar/i);
      return true;
    },
  );

  const nextMonth = await service.openMonth({ year: 2026, month: 6 });
  await assert.rejects(() => service.updateMonthCategory({ monthId: nextMonth.id, categoryId: "missing-category", name: "Missing" }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /No se encontró la categoría/i);
    return true;
  });

  await assert.rejects(() => service.deleteMonthSubcategory(nextMonth.id, "missing-subcategory"), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /No se encontró la subcategoría/i);
    return true;
  });
});

test("service integration: filters expense history by payment method, date range, and subcategory", async () => {
  const { db } = createIntegrationDb([{ id: "template-category-1", name: "Base", sortOrder: 0, subcategories: [{ id: "template-food", name: "Comida", plannedAmount: money(300), defaultPocketId: "pocket-buffer", active: true, sortOrder: 0 }, { id: "template-transport", name: "Transporte", plannedAmount: money(200), defaultPocketId: "pocket-buffer", active: true, sortOrder: 1 }] }]);
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const foodId = month.categories[0]?.subcategories[0]?.id ?? "";
  const transportId = month.categories[0]?.subcategories[1]?.id ?? "";
  await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 200, receivedAt: "2026-05-01T00:00:00.000Z" });
  await service.withdrawCash({ monthId: month.id, amount: 60, occurredAt: "2026-05-02T00:00:00.000Z" });
  await service.recordExpense({ monthId: month.id, sourceSubcategoryId: foodId, amount: 30, occurredAt: "2026-05-03T00:00:00.000Z", paymentMethod: PaymentMethod.CASH, description: "Feria" });
  await service.recordExpense({ monthId: month.id, sourceSubcategoryId: transportId, amount: 20, occurredAt: "2026-05-20T00:00:00.000Z", paymentMethod: PaymentMethod.NON_CASH, description: "Sube" });

  const history = await service.listExpenseHistory({ monthId: month.id, from: "2026-05-01T00:00:00.000Z", to: "2026-05-10T23:59:59.999Z", paymentMethod: PaymentMethod.CASH, subcategoryId: foodId });

  assert.equal(history.expenses.length, 1);
  assert.equal(history.expenses[0]?.description, "Feria");
  assert.equal(history.expenses[0]?.paymentMethod, PaymentMethod.CASH);
  assert.equal(history.expenses[0]?.subcategory?.id, foodId);
  assert.equal(history.expenses[0]?.category?.name, "Base");
});

test("service integration: opening next month creates cash carryover from latest prior closed month", async () => {
  const { db, getCapturedMovements } = createIntegrationDb([{ id: "template-category-cash", name: "Base", sortOrder: 0, subcategories: [{ id: "template-cash-food", name: "Comida", plannedAmount: money(20), defaultPocketId: "pocket-buffer", active: true, sortOrder: 0 }] }]);
  const service = createMonthlyCycleTestService(db);
  const may = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = may.categories[0]?.subcategories[0]?.id ?? "";
  await service.createMonthlyIncome({ monthId: may.id, sourceName: "Salary", amount: 50, receivedAt: "2026-05-01T00:00:00.000Z" });
  await service.withdrawCash({ monthId: may.id, amount: 50, occurredAt: "2026-05-02T00:00:00.000Z" });
  await service.recordExpense({ monthId: may.id, sourceSubcategoryId: subcategoryId, amount: 20, occurredAt: "2026-05-03T00:00:00.000Z", paymentMethod: PaymentMethod.CASH });
  await service.closeMonth(may.id);

  const june = await service.openMonth({ year: 2026, month: 6 });
  const carryover = getCapturedMovements().find((movement) => movement.type === MovementType.CASH_CARRYOVER_IN);

  assert.equal(carryover?.monthId, june.id);
  assert.equal(Number(carryover?.amount.toString()), 30);
  assert.equal(june.cashBalance, 30);
});

test("service integration: opening next month creates no cash carryover when prior closed cash is zero", async () => {
  const { db, getCapturedMovements } = createIntegrationDb([{ id: "template-category-cash", name: "Base", sortOrder: 0, subcategories: [{ id: "template-cash-food", name: "Comida", plannedAmount: money(20), defaultPocketId: "pocket-buffer", active: true, sortOrder: 0 }] }]);
  const service = createMonthlyCycleTestService(db);
  const may = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = may.categories[0]?.subcategories[0]?.id ?? "";

  await service.createMonthlyIncome({ monthId: may.id, sourceName: "Salary", amount: 20, receivedAt: "2026-05-01T00:00:00.000Z" });
  await service.withdrawCash({ monthId: may.id, amount: 20, occurredAt: "2026-05-02T00:00:00.000Z" });
  await service.recordExpense({ monthId: may.id, sourceSubcategoryId: subcategoryId, amount: 20, occurredAt: "2026-05-03T00:00:00.000Z", paymentMethod: PaymentMethod.CASH });
  await service.closeMonth(may.id);

  const june = await service.openMonth({ year: 2026, month: 6 });
  const carryovers = getCapturedMovements().filter((movement) => movement.type === MovementType.CASH_CARRYOVER_IN);

  assert.equal(carryovers.length, 0);
  assert.equal(june.cashBalance, 0);
});

for (const [carryAmount, excludedAmount] of [[100_000, 200_000], [300_000, 0], [0, 300_000], [100_000.01, 199_999.99]]) {
  test(`guided closure persists ${carryAmount}/${excludedAmount}, reloads and funds the next year once`, async () => {
    const { db, getCapturedMovements } = createIntegrationDb();
    let service = createMonthlyCycleTestService(db);
    const opened = await service.openMonth({ year: 2026, month: 12 });
    await service.createMonthlyIncome({ monthId: opened.id, sourceName: "Salary", amount: 1_000_000, receivedAt: "2026-12-01T00:00:00.000Z" });
    const before = await service.recordExpense({ monthId: opened.id, sourceSubcategoryId: null, amount: 700_000, occurredAt: "2026-12-02T00:00:00.000Z", paymentMethod: "NON_CASH" });
    const ledgerBefore = await service.getMonthlyLedger({ monthId: opened.id, includeSystemEvents: true });
    const closed = await service.closeMonth(opened.id, { carryAmount, excludedAmount });
    assert.equal(closed.availableMoney, 300_000);
    assert.deepEqual(closed.closureAllocation, { availableMoney: 300_000, carryAmount, excludedAmount });
    assert.deepEqual(closed.incomes, before.incomes);
    assert.deepEqual(closed.categories, before.categories);
    assert.equal(closed.cashBalance, before.cashBalance);
    assert.deepEqual(await service.getMonthlyLedger({ monthId: opened.id, includeSystemEvents: true }), { ...ledgerBefore, status: "CLOSED" });
    service = createMonthlyCycleTestService(db);
    assert.deepEqual(await service.getMonth(opened.id), closed);
    assert.deepEqual(await service.getLatestClosedMonth(), closed);
    assert.deepEqual(await service.closeMonth(opened.id, { carryAmount, excludedAmount }), closed);
    await assert.rejects(() => service.closeMonth(opened.id, { carryAmount: 0, excludedAmount: 0 }), { statusCode: 409 });
    assert.deepEqual(await service.getMonth(opened.id), closed);
    const january = await service.openMonth({ year: 2027, month: 1 });
    assert.equal(january.openingBalance, carryAmount);
    assert.equal(january.openingSourceMonthId, opened.id);
    assert.equal(january.availableMoney, carryAmount);
    assert.equal(january.monthlyIncomeTotal, 0);
    assert.deepEqual(january.incomes, []);
    assert.equal(january.categories[0]!.subcategories[0]!.plannedAmount, 300);
    const report = await service.getBasicReport(january.id);
    assert.equal(report.summary.availableMoney, carryAmount);
    assert.equal(report.summary.monthlyIncomeTotal, 0);
    assert.equal(report.summary.totalPlanned, 300);
    const ledger = await service.getMonthlyLedger({ monthId: january.id, includeSystemEvents: true });
    assert.equal(ledger.entries.reduce((sum, entry) => sum + entry.balanceEffects.availableMoney, 0), carryAmount);
    assert.equal(ledger.entries.some((entry) => entry.eventType === "MONTHLY_INCOME"), false);
    await assert.rejects(() => service.openMonth({ year: 2027, month: 1 }), { statusCode: 409 });
    assert.deepEqual(await service.getActiveMonth(), january);
    assert.equal(getCapturedMovements().length, 1);
  });
}

test("guided closure rejects partial, imprecise, nonfinite and stale allocations without changing public views", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const before = await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 0.3, receivedAt: "2026-05-01T00:00:00.000Z" });
  const ledger = await service.getMonthlyLedger({ monthId: month.id, includeSystemEvents: true });
  for (const [payload, statusCode] of [
    [{ carryAmount: 0.1 }, 400], [{ carryAmount: -0.1, excludedAmount: 0.4 }, 400],
    [{ carryAmount: NaN, excludedAmount: 0.3 }, 400], [{ carryAmount: Infinity, excludedAmount: 0 }, 400],
    [{ carryAmount: 0.001, excludedAmount: 0.299 }, 400], [{ carryAmount: "0.1", excludedAmount: 0.2 }, 400],
    [{ carryAmount: 0.1, excludedAmount: 0.19 }, 409], [undefined, 409],
  ] as const) {
    await assert.rejects(() => service.closeMonth(month.id, payload as never), { statusCode });
    assert.deepEqual(await service.getActiveMonth(), before);
    assert.deepEqual(await service.getMonthlyLedger({ monthId: month.id, includeSystemEvents: true }), ledger);
  }
  const closed = await service.closeMonth(month.id, { carryAmount: 0.1, excludedAmount: 0.2 });
  assert.deepEqual(closed.closureAllocation, { availableMoney: 0.3, carryAmount: 0.1, excludedAmount: 0.2 });
});

test("guided closure keeps physical cash independent and rejects consumed predecessors", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleTestService(db);
  const may = await service.openMonth({ year: 2026, month: 5 });
  await service.createMonthlyIncome({ monthId: may.id, sourceName: "Salary", amount: 100, receivedAt: "2026-05-01T00:00:00.000Z" });
  await service.withdrawCash({ monthId: may.id, amount: 40, occurredAt: "2026-05-02T00:00:00.000Z" });
  await service.recordExpense({ monthId: may.id, sourceSubcategoryId: null, amount: 10, occurredAt: "2026-05-03T00:00:00.000Z", paymentMethod: "CASH" });
  const closed = await service.closeMonth(may.id, { carryAmount: 20, excludedAmount: 40 });
  assert.equal(closed.cashBalance, 30);
  assert.equal(closed.availableMoney, 60);
  const july = await service.openMonth({ year: 2026, month: 7 });
  assert.equal(july.cashBalance, 30);
  assert.equal(july.availableMoney, 20);
  await service.closeMonth(july.id, { carryAmount: 0, excludedAmount: 20 });
  await assert.rejects(() => service.openMonth({ year: 2026, month: 6 }), { statusCode: 409 });
  assert.equal(await service.getActiveMonth(), null);
});

test("guided closure retains zero baseline, rejects negative money and requires deficit coverage", async () => {
  for (const kind of ["zero", "negative", "deficit"] as const) {
    const { db } = createIntegrationDb();
    const service = createMonthlyCycleTestService(db);
    const month = await service.openMonth({ year: 2026, month: 5 });
    if (kind === "zero") {
      const closed = await service.closeMonth(month.id);
      assert.deepEqual(closed.closureAllocation, { availableMoney: 0, carryAmount: 0, excludedAmount: 0 });
      assert.deepEqual(await service.closeMonth(month.id), closed);
      continue;
    }
    if (kind === "deficit") await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 1000, receivedAt: "2026-05-01" });
    const before = await service.recordExpense({ monthId: month.id, sourceSubcategoryId: kind === "deficit" ? month.categories[0]!.subcategories[0]!.id : null, amount: 350, occurredAt: "2026-05-02", paymentMethod: "NON_CASH" });
    const ledger = await service.getMonthlyLedger({ monthId: month.id, includeSystemEvents: true });
    await assert.rejects(() => service.closeMonth(month.id, { carryAmount: kind === "deficit" ? 650 : 0, excludedAmount: 0 }), { statusCode: 409 });
    assert.deepEqual(await service.getActiveMonth(), before);
    assert.deepEqual(await service.getMonthlyLedger({ monthId: month.id, includeSystemEvents: true }), ledger);
    if (kind === "deficit") {
      const review = await service.applyClosureAction({ monthId: month.id, type: "DEFICIT_COVER_FROM_POCKET", sourcePocketId: "pocket-buffer", targetSubcategoryId: month.categories[0]!.subcategories[0]!.id, amount: 50 });
      assert.deepEqual(review.pendingDeficits, []);
      assert.equal((await service.closeMonth(month.id, { carryAmount: 650, excludedAmount: 0 })).status, "CLOSED");
    }
  }
});
