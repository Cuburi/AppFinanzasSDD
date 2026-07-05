import test from "node:test";
import assert from "node:assert/strict";
import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../lib/prisma-client.js";

import { createMonthlyCycleService } from "./monthly-cycle.service.js";
import { DomainError } from "./shared/service-errors.js";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

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
    templateCategory: {
      async findMany() {
        return cloneTemplate(templateCategories);
      },
      async deleteMany() {
        templateCategories = [];
        return { count: 0 };
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
        const categoryId = `template-category-${nextId++}`;
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
      async findFirst(args: { where?: { status?: MonthStatus }; select?: unknown }) {
        const found = months.find((month) => !args.where?.status || month.status === args.where.status) ?? null;
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
      async update(args: { where: { id: string }; data: { status: MonthStatus; closedAt: Date } }) {
        const found = months.find((month) => month.id === args.where.id);
        if (!found) throw new Error("Month missing in integration stub.");

        found.status = args.data.status;
        found.closedAt = args.data.closedAt;
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
  };

  return { db, getCapturedMovements: () => capturedMovements };
};

test("service integration: opening a month snapshots the template and later template edits do not mutate it", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);

  const openedMonth = await service.openMonth({ year: 2026, month: 5 });

  await service.updateTemplate({
    categories: [
      {
        name: "Base editada",
        subcategories: [{ name: "Comida editada", plannedAmount: 999, defaultPocketId: "pocket-buffer" }],
      },
    ],
  });

  const activeMonth = await service.getActiveMonth();

  assert.equal(openedMonth.categories[0]?.name, "Base");
  assert.equal(activeMonth?.categories[0]?.name, "Base");
  assert.equal(activeMonth?.categories[0]?.subcategories[0]?.name, "Comida");
  assert.equal(activeMonth?.categories[0]?.subcategories[0]?.plannedAmount, 300);
});

test("service integration: promoted subcategory relinks stale parent template ids after a template rewrite", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);

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
  const service = createMonthlyCycleService(db);

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
  const service = createMonthlyCycleService(db);

  await service.openMonth({ year: 2026, month: 5 });

  await assert.rejects(() => service.openMonth({ year: 2026, month: 6 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /already an active month/i);
    return true;
  });
});

test("service integration: closed months are immutable", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });

  await service.applyClosureAction({
    monthId: month.id,
    type: "SURPLUS_TO_POCKET_ON_CLOSE",
    sourceSubcategoryId: subcategoryId,
  });
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
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );
});

test("service integration: rejects cash withdrawal for closed months", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  await service.applyClosureAction({
    monthId: month.id,
    type: "SURPLUS_TO_POCKET_ON_CLOSE",
    sourceSubcategoryId: subcategoryId,
  });
  await service.closeMonth(month.id);

  await assert.rejects(
    () => service.withdrawCash({ monthId: month.id, amount: 20, occurredAt: "2026-05-10T00:00:00.000Z" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );
});

test("service integration: rejects reopening a previously closed month", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  await service.applyClosureAction({
    monthId: month.id,
    type: "SURPLUS_TO_POCKET_ON_CLOSE",
    sourceSubcategoryId: subcategoryId,
  });
  await service.closeMonth(month.id);

  await assert.rejects(() => service.openMonth({ year: 2026, month: 5 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /already exists/i);
    return true;
  });
});

test("service integration: rejects unknown month and subcategory references for expenses and history", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  await assert.rejects(
    () => service.listExpenseHistory({ monthId: "missing-month" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /month was not found/i);
      return true;
    },
  );

  await assert.rejects(
    () => service.listExpenseHistory({ monthId: month.id, subcategoryId: "missing-subcategory" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /subcategory was not found/i);
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
      assert.match(error.message, /subcategory was not found/i);
      return true;
    },
  );
});

test("service integration: closing is rejected while closure review has pending balances", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  await assert.rejects(() => service.closeMonth(month.id), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /pending subcategory balances or available money/i);
    return true;
  });
});

test("service integration: valid subcategory deposits persist and decrease the source balance", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  const updatedMonth = await service.depositToPocket({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    targetPocketId: "pocket-buffer",
    amount: 40,
    description: "Reserva mensual",
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
  const service = createMonthlyCycleService(db);

  const updatedMonth = await service.depositToPocket({
    targetPocketId: "pocket-buffer",
    amount: 75,
    externalSourceLabel: "Ingreso aislado",
    description: "Regalo",
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
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const withIncome = await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  const incomeId = withIncome.incomes[0]?.id ?? "";
  await service.applyClosureAction({ monthId: month.id, type: "SURPLUS_TO_POCKET_ON_CLOSE", sourceSubcategoryId: subcategoryId });
  const closed = await service.closeMonth(month.id);

  await assert.rejects(
    () => service.createMonthlyIncome({ monthId: closed.id, sourceName: "Bonus", amount: 10, receivedAt: "2026-05-06T00:00:00.000Z" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateMonthlyIncome({ monthId: closed.id, incomeId, amount: 350 }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );

  await assert.rejects(
    () => service.deleteMonthlyIncome(closed.id, incomeId),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );
});

test("service integration: opening next month does not carry forward prior income", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const may = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = may.categories[0]?.subcategories[0]?.id ?? "";

  const mayWithIncome = await service.createMonthlyIncome({
    monthId: may.id,
    sourceName: "Salary",
    amount: 300,
    receivedAt: "2026-05-05T00:00:00.000Z",
  });
  await service.applyClosureAction({ monthId: may.id, type: "SURPLUS_TO_POCKET_ON_CLOSE", sourceSubcategoryId: subcategoryId });
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
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);

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
  const service = createMonthlyCycleService(db);
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

test("service integration: rejects expense dates outside the linked month", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await assert.rejects(
    () => service.recordExpense({ monthId: month.id, sourceSubcategoryId: subcategoryId, amount: 10, occurredAt: "2026-06-01T00:00:00.000Z", paymentMethod: PaymentMethod.NON_CASH }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /inside the linked month/i);
      return true;
    },
  );
});

test("service integration: withdraws cash only when available money is sufficient", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });

  await assert.rejects(
    () => service.withdrawCash({ monthId: month.id, amount: 50, occurredAt: "2026-05-10T00:00:00.000Z" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /insufficient available money/i);
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
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await assert.rejects(
    () => service.recordExpense({ monthId: month.id, sourceSubcategoryId: subcategoryId, amount: 25, occurredAt: "2026-05-11T00:00:00.000Z", paymentMethod: PaymentMethod.CASH }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /insufficient cash/i);
      return true;
    },
  );
});

test("service integration: updates active-month expenses and recalculates balances", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
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
  await service.applyClosureAction({ monthId: may.id, type: "SURPLUS_TO_POCKET_ON_CLOSE", sourceSubcategoryId: subcategoryId });
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
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );

  await assert.rejects(() => service.deleteExpense(may.id, expenseId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /closed months are immutable/i);
    return true;
  });
});

test("service integration: rejects foreign expense ids from another month", async () => {
  const { db, getCapturedMovements } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
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
  await service.applyClosureAction({ monthId: may.id, type: "SURPLUS_TO_POCKET_ON_CLOSE", sourceSubcategoryId: subcategoryId });
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
      assert.match(error.message, /expense was not found in this month/i);
      return true;
    },
  );

  await assert.rejects(() => service.deleteExpense(june.id, expenseId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /expense was not found in this month/i);
    return true;
  });
});

test("service integration: category and subcategory edits mutate only the active-month snapshot", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const categoryId = month.categories[0]?.id ?? "";
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";

  await assert.rejects(() => service.deleteMonthCategory(month.id, categoryId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /delete subcategories first/i);
    return true;
  });

  const withoutSubcategory = await service.deleteMonthSubcategory(month.id, subcategoryId);
  const withoutCategory = await service.deleteMonthCategory(month.id, categoryId);

  assert.equal(withoutSubcategory.categories[0]?.subcategories.length, 0);
  assert.equal(withoutCategory.categories.some((category) => category.id === categoryId), false);
});

test("service integration: rejects deleting movement-linked month structure nodes", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
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
    assert.match(error.message, /associated movements/i);
    return true;
  });

  await assert.rejects(() => service.deleteMonthCategory(month.id, categoryId), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /delete subcategories first/i);
    return true;
  });
});

test("service integration: month structure corrections reject closed months and missing nodes", async () => {
  const { db } = createIntegrationDb();
  const service = createMonthlyCycleService(db);
  const month = await service.openMonth({ year: 2026, month: 5 });
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  await service.createMonthlyIncome({ monthId: month.id, sourceName: "Salary", amount: 300, receivedAt: "2026-05-01T00:00:00.000Z" });
  await service.applyClosureAction({ monthId: month.id, type: "SURPLUS_TO_POCKET_ON_CLOSE", sourceSubcategoryId: subcategoryId });
  await service.closeMonth(month.id);

  await assert.rejects(
    () => service.updateMonthSubcategory({ monthId: month.id, subcategoryId, name: "Closed", plannedAmount: 300 }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );

  const nextMonth = await service.openMonth({ year: 2026, month: 6 });
  await assert.rejects(() => service.updateMonthCategory({ monthId: nextMonth.id, categoryId: "missing-category", name: "Missing" }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /category was not found/i);
    return true;
  });

  await assert.rejects(() => service.deleteMonthSubcategory(nextMonth.id, "missing-subcategory"), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /subcategory was not found/i);
    return true;
  });
});

test("service integration: filters expense history by payment method, date range, and subcategory", async () => {
  const { db } = createIntegrationDb([{ id: "template-category-1", name: "Base", sortOrder: 0, subcategories: [{ id: "template-food", name: "Comida", plannedAmount: money(300), defaultPocketId: "pocket-buffer", active: true, sortOrder: 0 }, { id: "template-transport", name: "Transporte", plannedAmount: money(200), defaultPocketId: "pocket-buffer", active: true, sortOrder: 1 }] }]);
  const service = createMonthlyCycleService(db);
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
  assert.equal(history.expenses[0]?.subcategory.id, foodId);
  assert.equal(history.expenses[0]?.category.name, "Base");
});

test("service integration: opening next month creates cash carryover from latest prior closed month", async () => {
  const { db, getCapturedMovements } = createIntegrationDb([{ id: "template-category-cash", name: "Base", sortOrder: 0, subcategories: [{ id: "template-cash-food", name: "Comida", plannedAmount: money(20), defaultPocketId: "pocket-buffer", active: true, sortOrder: 0 }] }]);
  const service = createMonthlyCycleService(db);
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
  const service = createMonthlyCycleService(db);
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
