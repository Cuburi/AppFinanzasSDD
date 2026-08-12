import test from "node:test";
import assert from "node:assert/strict";
import { MonthStatus, MovementType, PaymentMethod, Prisma } from "../../lib/prisma-client.js";

import { createMonthlyCycleModule } from "./monthly-cycle.module.js";
import { DomainError } from "./shared/service-errors.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));
const createMonthlyCycleTestService = (db: unknown) => createMonthlyCycleModule({ db: db as never }).service;

type TemplateFixture = Array<{
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
}>;

type MonthFixture = {
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
    id?: string;
    type: MovementType;
    monthId?: string | null;
    paymentMethod?: PaymentMethod | null;
    amount: Prisma.Decimal;
    description?: string | null;
    occurredAt?: Date;
    sourceSubcategoryId: string | null;
    targetSubcategoryId: string | null;
    sourcePocketId: string | null;
    targetPocketId: string | null;
  }>;
};

const templateFixture = (): TemplateFixture => [
  {
    id: "cat-fixed",
    name: "Fijos",
    sortOrder: 0,
    subcategories: [
      {
        id: "sub-rent",
        name: "Alquiler",
        plannedAmount: amount(250),
        defaultPocketId: "pocket-home",
        active: true,
        sortOrder: 0,
      },
    ],
  },
];

const buildCreatedMonth = (template: TemplateFixture, year: number, month: number): MonthFixture => ({
  id: "month-1",
  year,
  month,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-03T00:00:00.000Z"),
  closedAt: null,
  incomes: [],
  categories: template.map((category) => ({
    id: `${category.id}-snapshot`,
    name: category.name,
    sortOrder: category.sortOrder,
    templateCategoryId: category.id,
    subcategories: category.subcategories.map((subcategory) => ({
      id: `${subcategory.id}-snapshot`,
      name: subcategory.name,
      plannedAmount: subcategory.plannedAmount,
      defaultPocketId: subcategory.defaultPocketId,
      templateSubcategoryId: subcategory.id,
      sortOrder: subcategory.sortOrder,
    })),
  })),
  movements: [],
});

const cloneTemplateFixture = (template: TemplateFixture): TemplateFixture =>
  template.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) => ({
      ...subcategory,
      plannedAmount: amount(Number(subcategory.plannedAmount.toString())),
    })),
  }));

const createDbStub = ({
  template = templateFixture(),
  activeMonth = null,
  existingTargetMonth = null,
  monthById = null,
  targetPocket = { id: "pocket-home", active: true },
  targetPockets,
  createdMonth,
}: {
  template?: TemplateFixture;
  activeMonth?: { id: string; year: number; month: number } | null;
  existingTargetMonth?: { id: string } | null;
  monthById?: MonthFixture | null;
  targetPocket?: { id: string; active: boolean } | null;
  targetPockets?: Record<string, { id: string; active: boolean } | null>;
  createdMonth?: MonthFixture;
} = {}) => {
  let readTemplate = cloneTemplateFixture(template);
  let monthToReturn = createdMonth ?? buildCreatedMonth(readTemplate, 2026, 5);
  let capturedCreateArgs: unknown;
  const capturedMovements: unknown[] = [];
  const capturedIncomes: unknown[] = [];
  const capturedMovementUpdates: unknown[] = [];
  const capturedMovementDeletes: unknown[] = [];
  const capturedMonthCategoryUpdates: unknown[] = [];
  const capturedMonthCategoryCreates: unknown[] = [];
  const capturedMonthCategoryDeletes: unknown[] = [];
  const capturedMonthSubcategoryUpdates: unknown[] = [];
  const capturedMonthSubcategoryCreates: unknown[] = [];
  const capturedMonthSubcategoryDeletes: unknown[] = [];
  const capturedTemplateCategoryCreates: unknown[] = [];
  const capturedTemplateSubcategoryCreates: unknown[] = [];

  const db: any = {
    async $transaction<T>(callback: (tx: typeof db) => Promise<T>) {
      return callback(db);
    },
    async $queryRawUnsafe() {
      return [{ exists: false }];
    },
    templateCategory: {
      async findMany() {
        return cloneTemplateFixture(readTemplate);
      },
      async deleteMany() {
        readTemplate = [];
        return { count: 0 };
      },
      async create(args: unknown) {
        capturedCreateArgs = args;
        capturedTemplateCategoryCreates.push(args);
        const createArgs = args as {
          data: {
            name: string;
            sortOrder: number;
            subcategories?: {
              create?: Array<{ name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number }>;
            };
          };
        };
        const category = {
          id: `template-category-created-${capturedTemplateCategoryCreates.length}`,
          name: createArgs.data.name,
          sortOrder: createArgs.data.sortOrder,
          subcategories: (createArgs.data.subcategories?.create ?? []).map((subcategory, index) => ({
            id: `template-subcategory-created-${capturedTemplateCategoryCreates.length}-${index + 1}`,
            name: subcategory.name,
            plannedAmount: subcategory.plannedAmount,
            defaultPocketId: subcategory.defaultPocketId,
            active: true,
            sortOrder: subcategory.sortOrder,
          })),
        };
        readTemplate.push(category);
        return category;
      },
    },
    templateSubcategory: {
      async create(args: {
        data: { categoryId: string; name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number };
      }) {
        capturedTemplateSubcategoryCreates.push(args);
        const category = readTemplate.find((candidate) => candidate.id === args.data.categoryId);
        if (!category) throw new Error("Template category missing in stub.");
        const subcategory = {
          id: `template-subcategory-created-${capturedTemplateSubcategoryCreates.length}`,
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
      async findFirst(args: { select?: unknown; include?: unknown }) {
        if (args.select) {
          return activeMonth;
        }

        return activeMonth ? monthToReturn : null;
      },
      async findUnique(args: { where?: { id?: string; year_month?: unknown } }) {
        if (args.where?.id) {
          return monthById;
        }

        return existingTargetMonth;
      },
      async create(args: unknown) {
        capturedCreateArgs = args;
        return monthToReturn;
      },
      async update() {
        if (!monthById) {
          throw new Error("Month missing in stub.");
        }

        monthById.status = MonthStatus.CLOSED;
        monthById.closedAt = new Date("2026-05-04T00:00:00.000Z");
        return monthById;
      },
    },
    movement: {
      async findUnique(args: { where: { id: string } }) {
        return monthById?.movements.find((movement) => movement.id === args.where.id) ?? null;
      },
      async create(args: unknown) {
        capturedMovements.push(args);
        const movement = args as {
          data?: {
            type?: MovementType;
            amount?: Prisma.Decimal;
            sourceSubcategoryId?: string | null;
            targetSubcategoryId?: string | null;
            sourcePocketId?: string | null;
            targetPocketId?: string | null;
          };
        };

        if (monthById && movement.data?.type && movement.data.amount) {
          monthById.movements.push({
            id: `movement-${capturedMovements.length}`,
            type: movement.data.type,
            amount: movement.data.amount,
            monthId: monthById.id,
            sourceSubcategoryId: movement.data.sourceSubcategoryId ?? null,
            targetSubcategoryId: movement.data.targetSubcategoryId ?? null,
            sourcePocketId: movement.data.sourcePocketId ?? null,
            targetPocketId: movement.data.targetPocketId ?? null,
          });
        }

        return { id: `movement-${capturedMovements.length}` };
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
        capturedMovementUpdates.push(args);
        const movement = monthById?.movements.find((candidate) => candidate.id === args.where.id);
        if (movement) Object.assign(movement, args.data);
        return movement ?? null;
      },
      async delete(args: { where: { id: string } }) {
        capturedMovementDeletes.push(args);
        if (monthById) {
          monthById.movements = monthById.movements.filter((movement) => movement.id !== args.where.id);
        }
        return {};
      },
    },
    monthCategory: {
      async create(args: { data: { monthId: string; name: string; sortOrder: number; templateCategoryId: string | null } }) {
        capturedMonthCategoryCreates.push(args);
        if (!monthById || monthById.id !== args.data.monthId) throw new Error("Month missing in stub.");
        const category = {
          id: `month-category-created-${capturedMonthCategoryCreates.length}`,
          name: args.data.name,
          sortOrder: args.data.sortOrder,
          templateCategoryId: args.data.templateCategoryId,
          subcategories: [],
        };
        monthById.categories.push(category);
        return category;
      },
      async update(args: { where: { id: string }; data: { name?: string; templateCategoryId?: string | null } }) {
        capturedMonthCategoryUpdates.push(args);
        const category = monthById?.categories.find((candidate) => candidate.id === args.where.id);
        if (category) Object.assign(category, args.data);
        return category ?? null;
      },
      async delete(args: { where: { id: string } }) {
        capturedMonthCategoryDeletes.push(args);
        if (monthById) {
          monthById.categories = monthById.categories.filter((category) => category.id !== args.where.id);
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
        capturedMonthSubcategoryCreates.push(args);
        const category = monthById?.categories.find((candidate) => candidate.id === args.data.monthCategoryId);
        if (!category) throw new Error("Month category missing in stub.");
        const subcategory = {
          id: `month-subcategory-created-${capturedMonthSubcategoryCreates.length}`,
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
        capturedMonthSubcategoryUpdates.push(args);
        const subcategory = monthById?.categories.flatMap((category) => category.subcategories).find((candidate) => candidate.id === args.where.id);
        if (subcategory) Object.assign(subcategory, args.data);
        return subcategory ?? null;
      },
      async delete(args: { where: { id: string } }) {
        capturedMonthSubcategoryDeletes.push(args);
        if (monthById) {
          for (const category of monthById.categories) {
            category.subcategories = category.subcategories.filter((subcategory) => subcategory.id !== args.where.id);
          }
        }
        return {};
      },
    },
    monthlyIncome: {
      async findUnique(args: { where: { id: string } }) {
        return monthById?.incomes.find((income) => income.id === args.where.id) ?? null;
      },
      async create(args: {
        data: { monthId: string; sourceName: string; amount: Prisma.Decimal; receivedAt: Date; notes: string | null };
      }) {
        capturedIncomes.push(args);
        monthById?.incomes.push({
          id: `income-${capturedIncomes.length}`,
          monthId: args.data.monthId,
          sourceName: args.data.sourceName,
          amount: args.data.amount,
          receivedAt: args.data.receivedAt,
          notes: args.data.notes,
          createdAt: new Date("2026-05-03T00:00:00.000Z"),
          updatedAt: new Date("2026-05-03T00:00:00.000Z"),
        });
        return { id: `income-${capturedIncomes.length}` };
      },
      async update(args: { where: { id: string }; data: Partial<MonthFixture["incomes"][number]> }) {
        const income = monthById?.incomes.find((candidate) => candidate.id === args.where.id);
        if (income) Object.assign(income, args.data, { updatedAt: new Date("2026-05-04T00:00:00.000Z") });
        return income ?? null;
      },
      async delete(args: { where: { id: string } }) {
        if (monthById) {
          monthById.incomes = monthById.incomes.filter((income) => income.id !== args.where.id);
        }
        return {};
      },
    },
    savingsPocket: {
      async findUnique(args: { where?: { id?: string } }) {
        if (targetPockets && args.where?.id) {
          return targetPockets[args.where.id] ?? null;
        }

        return targetPocket;
      },
    },
  };

  return {
    db,
    getCapturedCreateArgs: () => capturedCreateArgs,
    getCapturedMovements: () => capturedMovements,
    getCapturedTemplateCategoryCreates: () => capturedTemplateCategoryCreates,
    getCapturedTemplateSubcategoryCreates: () => capturedTemplateSubcategoryCreates,
    getCapturedMonthCategoryCreates: () => capturedMonthCategoryCreates,
    getCapturedMovementUpdates: () => capturedMovementUpdates,
    getCapturedMovementDeletes: () => capturedMovementDeletes,
    getCapturedMonthCategoryUpdates: () => capturedMonthCategoryUpdates,
    getCapturedMonthCategoryDeletes: () => capturedMonthCategoryDeletes,
    getCapturedMonthSubcategoryUpdates: () => capturedMonthSubcategoryUpdates,
    getCapturedMonthSubcategoryCreates: () => capturedMonthSubcategoryCreates,
    getCapturedMonthSubcategoryDeletes: () => capturedMonthSubcategoryDeletes,
    getCapturedIncomes: () => capturedIncomes,
    setCreatedMonth: (value: MonthFixture) => {
      monthToReturn = value;
    },
  };
};

test("updateTemplate keeps defaultPocketId optional when saving subcategories", async () => {
  const dbStub = createDbStub();
  const service = createMonthlyCycleTestService(dbStub.db);

  await service.updateTemplate({
    categories: [
      {
        name: "Ahorro",
        subcategories: [{ name: "Emergencias", plannedAmount: 100, defaultPocketId: null }],
      },
    ],
  });
  const createArgs = dbStub.getCapturedCreateArgs() as {
    data: { subcategories: { create: Array<{ defaultPocketId: string | null }> } };
  };

  assert.equal(createArgs.data.subcategories.create[0]?.defaultPocketId, null);
});

test("updateTemplate rejects inactive or nonexistent default pockets", async () => {
  const serviceWithInactivePocket = createMonthlyCycleTestService(
    createDbStub({ targetPockets: { "pocket-inactive": { id: "pocket-inactive", active: false } } }).db,
  );
  const serviceWithMissingPocket = createMonthlyCycleTestService(createDbStub({ targetPockets: { "pocket-missing": null } }).db);

  await assert.rejects(
    () =>
      serviceWithInactivePocket.updateTemplate({
        categories: [
          {
            name: "Ahorro",
            subcategories: [{ name: "Emergencias", plannedAmount: 100, defaultPocketId: "pocket-inactive" }],
          },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 400);
      assert.match(error.message, /default pocket must exist and be active/i);
      return true;
    },
  );

  await assert.rejects(
    () =>
      serviceWithMissingPocket.updateTemplate({
        categories: [
          {
            name: "Ahorro",
            subcategories: [{ name: "Emergencias", plannedAmount: 100, defaultPocketId: "pocket-missing" }],
          },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 400);
      assert.match(error.message, /default pocket must exist and be active/i);
      return true;
    },
  );
});

test("openMonth rejects template snapshots with inactive or nonexistent default pockets", async () => {
  const template = templateFixture();
  const serviceWithInactivePocket = createMonthlyCycleTestService(
    createDbStub({
      template,
      targetPockets: { "pocket-home": { id: "pocket-home", active: false } },
      createdMonth: buildCreatedMonth(template, 2026, 6),
    }).db,
  );
  const serviceWithMissingPocket = createMonthlyCycleTestService(
    createDbStub({
      template,
      targetPockets: { "pocket-home": null },
      createdMonth: buildCreatedMonth(template, 2026, 6),
    }).db,
  );

  await assert.rejects(() => serviceWithInactivePocket.openMonth({ year: 2026, month: 6 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /default pocket must exist and be active/i);
    return true;
  });

  await assert.rejects(() => serviceWithMissingPocket.openMonth({ year: 2026, month: 6 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /default pocket must exist and be active/i);
    return true;
  });
});

test("depositToPocket rejects inactive or nonexistent target pockets", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const serviceWithInactivePocket = createMonthlyCycleTestService(
    createDbStub({ monthById: month, targetPockets: { "pocket-inactive": { id: "pocket-inactive", active: false } } }).db,
  );
  const serviceWithMissingPocket = createMonthlyCycleTestService(createDbStub({ monthById: month, targetPockets: { "pocket-missing": null } }).db);

  await assert.rejects(
    () =>
      serviceWithInactivePocket.depositToPocket({
        sourceKind: "SUBCATEGORY",
        monthId: month.id,
        sourceSubcategoryId: subcategoryId,
        targetPocketId: "pocket-inactive",
        amount: 10,
        occurredAt: "2026-05-10T00:00:00.000Z",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /target pocket was not found/i);
      return true;
    },
  );

  await assert.rejects(
    () =>
      serviceWithMissingPocket.depositToPocket({
        sourceKind: "SUBCATEGORY",
        monthId: month.id,
        sourceSubcategoryId: subcategoryId,
        targetPocketId: "pocket-missing",
        amount: 10,
        occurredAt: "2026-05-10T00:00:00.000Z",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /target pocket was not found/i);
      return true;
    },
  );
});

test("applyClosureAction rejects inactive default pockets for new surplus actions", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategory = month.categories[0]?.subcategories[0];

  if (!subcategory) {
    throw new Error("Missing subcategory fixture.");
  }

  const service = createMonthlyCycleTestService(
    createDbStub({ monthById: month, targetPockets: { "pocket-home": { id: "pocket-home", active: false } } }).db,
  );

  await assert.rejects(
    () =>
      service.applyClosureAction({
        monthId: month.id,
        type: "SURPLUS_TO_POCKET_ON_CLOSE",
        sourceSubcategoryId: subcategory.id,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /target pocket must exist and be active/i);
      return true;
    },
  );
});

test("openMonth snapshots the current template into a new active month", async () => {
  const template = templateFixture();
  const dbStub = createDbStub({
    template,
    createdMonth: buildCreatedMonth(template, 2026, 6),
  });
  const service = createMonthlyCycleTestService(dbStub.db);

  const month = await service.openMonth({ year: 2026, month: 6 });
  const createArgs = dbStub.getCapturedCreateArgs() as {
    data: {
      categories: {
        create: Array<{
          templateCategoryId: string;
          subcategories: { create: Array<{ templateSubcategoryId: string; plannedAmount: Prisma.Decimal }> };
        }>;
      };
    };
  };

  assert.equal(month.year, 2026);
  assert.equal(month.month, 6);
  assert.equal(month.categories[0]?.subcategories[0]?.plannedAmount, 250);
  assert.equal(createArgs.data.categories.create[0]?.templateCategoryId, "cat-fixed");
  assert.equal(
    createArgs.data.categories.create[0]?.subcategories.create[0]?.templateSubcategoryId,
    "sub-rent",
  );
});

test("openMonth rejects creating a second active month", async () => {
  const dbStub = createDbStub({
    activeMonth: { id: "month-active", year: 2026, month: 5 },
  });
  const service = createMonthlyCycleTestService(dbStub.db);

  await assert.rejects(() => service.openMonth({ year: 2026, month: 6 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /already an active month/i);
    return true;
  });
});

test("openMonth rejects opening a month without template subcategories", async () => {
  const dbStub = createDbStub({
    template: [
      {
        id: "cat-empty",
        name: "Vacío",
        sortOrder: 0,
        subcategories: [],
      },
    ],
  });
  const service = createMonthlyCycleTestService(dbStub.db);

  await assert.rejects(() => service.openMonth({ year: 2026, month: 6 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /at least one subcategory/i);
    return true;
  });
});

test("getActiveMonth returns null when there is no active month", async () => {
  const dbStub = createDbStub({ activeMonth: null });
  const service = createMonthlyCycleTestService(dbStub.db);

  const month = await service.getActiveMonth();

  assert.equal(month, null);
});

test("recordExpense persists an expense and returns recalculated balances", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    amount: 75,
    description: "Supermercado",
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });
  const movement = dbStub.getCapturedMovements()[0] as { data: { type: MovementType; sourceSubcategoryId: string; amount: Prisma.Decimal } };

  assert.equal(movement.data.type, MovementType.EXPENSE);
  assert.equal(movement.data.sourceSubcategoryId, subcategoryId);
  assert.equal(Number(movement.data.amount.toString()), 75);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, 175);
});

test("updateExpense persists active-month expense changes and recalculates balances", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  month.movements.push(
    {
      id: "withdrawal-1",
      type: MovementType.CASH_WITHDRAWAL,
      monthId: month.id,
      amount: amount(200),
      occurredAt: new Date("2026-05-09T00:00:00.000Z"),
      sourceSubcategoryId: null,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
    {
      id: "expense-1",
      type: MovementType.EXPENSE,
      monthId: month.id,
      amount: amount(75),
      description: "Old market",
      occurredAt: new Date("2026-05-10T00:00:00.000Z"),
      paymentMethod: PaymentMethod.CASH,
      sourceSubcategoryId: subcategoryId,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
  );
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.updateExpense({
    monthId: month.id,
    expenseId: "expense-1",
    sourceSubcategoryId: subcategoryId,
    amount: 125,
    description: "Updated market",
    occurredAt: "2026-05-11T00:00:00.000Z",
    paymentMethod: PaymentMethod.CASH,
  });
  const updateArgs = dbStub.getCapturedMovementUpdates()[0] as {
    where: { id: string };
    data: { amount: Prisma.Decimal; description: string | null; occurredAt: Date; paymentMethod: PaymentMethod; sourceSubcategoryId: string };
  };

  assert.equal(updateArgs.where.id, "expense-1");
  assert.equal(Number(updateArgs.data.amount.toString()), 125);
  assert.equal(updateArgs.data.description, "Updated market");
  assert.equal(updateArgs.data.occurredAt.toISOString(), "2026-05-11T00:00:00.000Z");
  assert.equal(updateArgs.data.paymentMethod, PaymentMethod.CASH);
  assert.equal(updateArgs.data.sourceSubcategoryId, subcategoryId);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, 125);
  assert.equal(updatedMonth.cashBalance, 75);
});

test("updateExpense rejects cash changes that would exceed physical cash", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  month.movements.push(
    {
      id: "withdrawal-1",
      type: MovementType.CASH_WITHDRAWAL,
      monthId: month.id,
      amount: amount(40),
      occurredAt: new Date("2026-05-09T00:00:00.000Z"),
      sourceSubcategoryId: null,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
    {
      id: "expense-1",
      type: MovementType.EXPENSE,
      monthId: month.id,
      amount: amount(20),
      occurredAt: new Date("2026-05-10T00:00:00.000Z"),
      paymentMethod: PaymentMethod.CASH,
      sourceSubcategoryId: subcategoryId,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
  );
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  await assert.rejects(
    () =>
      service.updateExpense({
        monthId: month.id,
        expenseId: "expense-1",
        sourceSubcategoryId: subcategoryId,
        amount: 45,
        occurredAt: "2026-05-10T00:00:00.000Z",
        paymentMethod: PaymentMethod.CASH,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /insufficient cash/i);
      return true;
    },
  );

  assert.equal(dbStub.getCapturedMovementUpdates().length, 0);
});

test("deleteExpense removes only active-month expenses and recalculates balances", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  month.movements.push(
    {
      id: "withdrawal-1",
      type: MovementType.CASH_WITHDRAWAL,
      monthId: month.id,
      amount: amount(100),
      occurredAt: new Date("2026-05-09T00:00:00.000Z"),
      sourceSubcategoryId: null,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
    {
      id: "expense-1",
      type: MovementType.EXPENSE,
      monthId: month.id,
      amount: amount(75),
      occurredAt: new Date("2026-05-10T00:00:00.000Z"),
      paymentMethod: PaymentMethod.CASH,
      sourceSubcategoryId: subcategoryId,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
  );
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.deleteExpense(month.id, "expense-1");
  const deleteArgs = dbStub.getCapturedMovementDeletes()[0] as { where: { id: string } };

  assert.equal(deleteArgs.where.id, "expense-1");
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, 250);
  assert.equal(updatedMonth.cashBalance, 100);
});

test("updateExpense and deleteExpense reject expenses that belong to closed months", async () => {
  const month = { ...buildCreatedMonth(templateFixture(), 2026, 5), status: MonthStatus.CLOSED };
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  month.movements.push({
    id: "expense-1",
    type: MovementType.EXPENSE,
    monthId: month.id,
    amount: amount(75),
    occurredAt: new Date("2026-05-10T00:00:00.000Z"),
    paymentMethod: PaymentMethod.NON_CASH,
    sourceSubcategoryId: subcategoryId,
    targetSubcategoryId: null,
    sourcePocketId: null,
    targetPocketId: null,
  });
  const service = createMonthlyCycleTestService(createDbStub({ monthById: month }).db);

  await assert.rejects(
    () =>
      service.updateExpense({
        monthId: month.id,
        expenseId: "expense-1",
        sourceSubcategoryId: subcategoryId,
        amount: 90,
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

  await assert.rejects(() => service.deleteExpense(month.id, "expense-1"), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /closed months are immutable/i);
    return true;
  });
});

test("updateExpense and deleteExpense reject movements outside the active month expense ledger", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  month.movements.push({
    id: "foreign-expense",
    type: MovementType.EXPENSE,
    monthId: "month-other",
    amount: amount(75),
    occurredAt: new Date("2026-05-10T00:00:00.000Z"),
    paymentMethod: PaymentMethod.NON_CASH,
    sourceSubcategoryId: subcategoryId,
    targetSubcategoryId: null,
    sourcePocketId: null,
    targetPocketId: null,
  });
  const service = createMonthlyCycleTestService(createDbStub({ monthById: month }).db);

  await assert.rejects(
    () =>
      service.updateExpense({
        monthId: month.id,
        expenseId: "foreign-expense",
        sourceSubcategoryId: subcategoryId,
        amount: 90,
        occurredAt: "2026-05-10T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /expense was not found in this month/i);
      return true;
    },
  );

  await assert.rejects(() => service.deleteExpense(month.id, "foreign-expense"), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /expense was not found in this month/i);
    return true;
  });
});

test("updateMonthCategory renames only the active-month snapshot category", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const categoryId = month.categories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.updateMonthCategory({ monthId: month.id, categoryId, name: "Hogar" });

  assert.equal(updatedMonth.categories[0]?.name, "Hogar");
  assert.equal(templateFixture()[0]?.name, "Fijos");
});

test("updateMonthSubcategory updates snapshot fields and validates default pocket activity", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month, targetPockets: { "pocket-savings": { id: "pocket-savings", active: true } } });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.updateMonthSubcategory({
    monthId: month.id,
    subcategoryId,
    name: "Alquiler actualizado",
    plannedAmount: 300,
    defaultPocketId: "pocket-savings",
  });

  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.name, "Alquiler actualizado");
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.plannedAmount, 300);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.defaultPocketId, "pocket-savings");
});

test("updateMonthSubcategory preserves omitted defaultPocketId and clears explicit null", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const omittedDefaultPocket = await service.updateMonthSubcategory({
    monthId: month.id,
    subcategoryId,
    name: "Alquiler sin cambio de bolsillo",
    plannedAmount: 300,
  });
  const omittedUpdateArgs = dbStub.getCapturedMonthSubcategoryUpdates()[0] as { data: { defaultPocketId?: string | null } };
  const clearedDefaultPocket = await service.updateMonthSubcategory({
    monthId: month.id,
    subcategoryId,
    name: "Alquiler sin bolsillo",
    plannedAmount: 300,
    defaultPocketId: null,
  });
  const nullUpdateArgs = dbStub.getCapturedMonthSubcategoryUpdates()[1] as { data: { defaultPocketId?: string | null } };

  assert.equal("defaultPocketId" in omittedUpdateArgs.data, false);
  assert.equal(omittedDefaultPocket.categories[0]?.subcategories[0]?.defaultPocketId, "pocket-home");
  assert.equal(nullUpdateArgs.data.defaultPocketId, null);
  assert.equal(clearedDefaultPocket.categories[0]?.subcategories[0]?.defaultPocketId, null);
});

test("updateMonthSubcategory rejects inactive default pocket strings", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month, targetPockets: { "pocket-inactive": { id: "pocket-inactive", active: false } } });
  const service = createMonthlyCycleTestService(dbStub.db);

  await assert.rejects(
    () =>
      service.updateMonthSubcategory({
        monthId: month.id,
        subcategoryId,
        name: "Alquiler actualizado",
        plannedAmount: 300,
        defaultPocketId: "pocket-inactive",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /default pocket must exist and be active/i);
      return true;
    },
  );

  assert.equal(dbStub.getCapturedMonthSubcategoryUpdates().length, 0);
});

test("createMonthCategory appends snapshot-only categories without mutating the template", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.createMonthCategory({ monthId: month.id, name: "  Variables  ", addToTemplate: false });
  const createArgs = dbStub.getCapturedMonthCategoryCreates()[0] as {
    data: { name: string; sortOrder: number; templateCategoryId: string | null };
  };

  assert.equal(createArgs.data.name, "Variables");
  assert.equal(createArgs.data.sortOrder, 1);
  assert.equal(createArgs.data.templateCategoryId, null);
  assert.equal(dbStub.getCapturedTemplateCategoryCreates().length, 0);
  assert.equal(updatedMonth.categories[1]?.name, "Variables");
});

test("createMonthCategory promotes explicitly requested template categories and links the snapshot", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.createMonthCategory({ monthId: month.id, name: "Variables", addToTemplate: true });
  const templateCreate = dbStub.getCapturedTemplateCategoryCreates()[0] as { data: { name: string; sortOrder: number } };
  const monthCreate = dbStub.getCapturedMonthCategoryCreates()[0] as { data: { templateCategoryId: string | null } };
  const snapshotLink = dbStub.getCapturedMonthCategoryUpdates()[0] as { where: { id: string }; data: { templateCategoryId: string } };

  assert.equal(templateCreate.data.name, "Variables");
  assert.equal(templateCreate.data.sortOrder, 1);
  assert.equal(monthCreate.data.templateCategoryId, null);
  assert.equal(snapshotLink.where.id, "month-category-created-1");
  assert.equal(snapshotLink.data.templateCategoryId, "template-category-created-1");
  assert.equal(updatedMonth.categories[1]?.templateCategoryId, "template-category-created-1");
});

test("createMonthCategory rejects duplicate names in snapshot and template scopes", async () => {
  const snapshotDuplicateMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  const serviceWithSnapshotDuplicate = createMonthlyCycleTestService(createDbStub({ monthById: snapshotDuplicateMonth }).db);
  const templateDuplicateMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  templateDuplicateMonth.categories[0]!.name = "Fijos del mes";
  const serviceWithTemplateDuplicate = createMonthlyCycleTestService(createDbStub({ monthById: templateDuplicateMonth }).db);

  await assert.rejects(
    () => serviceWithSnapshotDuplicate.createMonthCategory({ monthId: snapshotDuplicateMonth.id, name: "  fijos ", addToTemplate: false }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /category already exists in this month/i);
      return true;
    },
  );

  await assert.rejects(
    () => serviceWithTemplateDuplicate.createMonthCategory({ monthId: templateDuplicateMonth.id, name: "FIJOS", addToTemplate: true }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /category already exists in the template/i);
      return true;
    },
  );
});

test("createMonthSubcategory appends snapshot-only subcategories and validates default pockets", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const categoryId = month.categories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month, targetPockets: { "pocket-buffer": { id: "pocket-buffer", active: true } } });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.createMonthSubcategory({
    monthId: month.id,
    categoryId,
    name: "Taxi",
    plannedAmount: 0,
    defaultPocketId: "pocket-buffer",
    addToTemplate: false,
  });
  const createArgs = dbStub.getCapturedMonthSubcategoryCreates()[0] as {
    data: { name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number; templateSubcategoryId: string | null };
  };

  assert.equal(createArgs.data.name, "Taxi");
  assert.equal(Number(createArgs.data.plannedAmount.toString()), 0);
  assert.equal(createArgs.data.defaultPocketId, "pocket-buffer");
  assert.equal(createArgs.data.sortOrder, 1);
  assert.equal(createArgs.data.templateSubcategoryId, null);
  assert.equal(dbStub.getCapturedTemplateSubcategoryCreates().length, 0);
  assert.equal(updatedMonth.categories[0]?.subcategories[1]?.available, 0);
});

test("createMonthSubcategory promotes month-only parents before template subcategories", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  month.categories.push({ id: "cat-month-only", name: "Mes", sortOrder: 1, templateCategoryId: null, subcategories: [] });
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.createMonthSubcategory({
    monthId: month.id,
    categoryId: "cat-month-only",
    name: "Solo mes",
    plannedAmount: 25,
    addToTemplate: true,
  });
  const parentTemplateCreate = dbStub.getCapturedTemplateCategoryCreates()[0] as { data: { name: string; sortOrder: number } };
  const parentSnapshotLink = dbStub.getCapturedMonthCategoryUpdates()[0] as { where: { id: string }; data: { templateCategoryId: string } };
  const templateSubcategoryCreate = dbStub.getCapturedTemplateSubcategoryCreates()[0] as {
    data: { categoryId: string; name: string; plannedAmount: Prisma.Decimal; sortOrder: number };
  };
  const subcategorySnapshotLink = dbStub.getCapturedMonthSubcategoryUpdates()[0] as {
    data: { templateSubcategoryId: string };
  };

  assert.equal(parentTemplateCreate.data.name, "Mes");
  assert.equal(parentTemplateCreate.data.sortOrder, 1);
  assert.equal(parentSnapshotLink.where.id, "cat-month-only");
  assert.equal(parentSnapshotLink.data.templateCategoryId, "template-category-created-1");
  assert.equal(templateSubcategoryCreate.data.categoryId, "template-category-created-1");
  assert.equal(templateSubcategoryCreate.data.name, "Solo mes");
  assert.equal(Number(templateSubcategoryCreate.data.plannedAmount.toString()), 25);
  assert.equal(templateSubcategoryCreate.data.sortOrder, 0);
  assert.equal(subcategorySnapshotLink.data.templateSubcategoryId, "template-subcategory-created-1");
  assert.equal(updatedMonth.categories[1]?.templateCategoryId, "template-category-created-1");
});

test("createMonthSubcategory rejects duplicates, closed months, missing parents, and inactive pockets before writes", async () => {
  const duplicateMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  const duplicateCategoryId = duplicateMonth.categories[0]?.id ?? "";
  const duplicateStub = createDbStub({ monthById: duplicateMonth });
  const duplicateService = createMonthlyCycleTestService(duplicateStub.db);

  await assert.rejects(
    () => duplicateService.createMonthSubcategory({ monthId: duplicateMonth.id, categoryId: duplicateCategoryId, name: " alquiler ", plannedAmount: 10, addToTemplate: false }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /subcategory already exists in this month category/i);
      return true;
    },
  );
  assert.equal(duplicateStub.getCapturedMonthSubcategoryCreates().length, 0);

  const closedMonth = { ...buildCreatedMonth(templateFixture(), 2026, 5), status: MonthStatus.CLOSED };
  const serviceForClosedMonth = createMonthlyCycleTestService(createDbStub({ monthById: closedMonth }).db);
  await assert.rejects(
    () => serviceForClosedMonth.createMonthSubcategory({ monthId: closedMonth.id, categoryId: closedMonth.categories[0]?.id ?? "", name: "Taxi", plannedAmount: 10, addToTemplate: false }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );

  const activeMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  const serviceForMissingParent = createMonthlyCycleTestService(createDbStub({ monthById: activeMonth }).db);
  await assert.rejects(
    () => serviceForMissingParent.createMonthSubcategory({ monthId: activeMonth.id, categoryId: "missing-category", name: "Taxi", plannedAmount: 10, addToTemplate: false }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /category was not found in this month/i);
      return true;
    },
  );

  const inactivePocketMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  const inactivePocketStub = createDbStub({ monthById: inactivePocketMonth, targetPockets: { "pocket-inactive": { id: "pocket-inactive", active: false } } });
  const serviceForInactivePocket = createMonthlyCycleTestService(inactivePocketStub.db);
  await assert.rejects(
    () => serviceForInactivePocket.createMonthSubcategory({ monthId: inactivePocketMonth.id, categoryId: inactivePocketMonth.categories[0]?.id ?? "", name: "Taxi", plannedAmount: 10, defaultPocketId: "pocket-inactive", addToTemplate: false }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /default pocket must exist and be active/i);
      return true;
    },
  );
  assert.equal(inactivePocketStub.getCapturedMonthSubcategoryCreates().length, 0);
});

test("month structure deletes reject movement-linked subcategories and non-empty categories", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const categoryId = month.categories[0]?.id ?? "";
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  month.movements.push({
    id: "expense-1",
    type: MovementType.EXPENSE,
    monthId: month.id,
    amount: amount(75),
    occurredAt: new Date("2026-05-10T00:00:00.000Z"),
    paymentMethod: PaymentMethod.NON_CASH,
    sourceSubcategoryId: subcategoryId,
    targetSubcategoryId: null,
    sourcePocketId: null,
    targetPocketId: null,
  });
  const service = createMonthlyCycleTestService(createDbStub({ monthById: month }).db);

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

test("month structure mutations reject closed months and missing snapshot nodes", async () => {
  const closedMonth = { ...buildCreatedMonth(templateFixture(), 2026, 5), status: MonthStatus.CLOSED };
  const serviceForClosedMonth = createMonthlyCycleTestService(createDbStub({ monthById: closedMonth }).db);

  await assert.rejects(
    () => serviceForClosedMonth.updateMonthCategory({ monthId: closedMonth.id, categoryId: closedMonth.categories[0]?.id ?? "", name: "Hogar" }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
      return true;
    },
  );

  const activeMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  const serviceForActiveMonth = createMonthlyCycleTestService(createDbStub({ monthById: activeMonth }).db);

  await assert.rejects(() => serviceForActiveMonth.deleteMonthCategory(activeMonth.id, "missing-category"), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /category was not found/i);
    return true;
  });

  await assert.rejects(() => serviceForActiveMonth.deleteMonthSubcategory(activeMonth.id, "missing-subcategory"), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 404);
    assert.match(error.message, /subcategory was not found/i);
    return true;
  });
});

test("createMonthlyIncome persists active-month income and recalculates available money", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const updatedMonth = await service.createMonthlyIncome({
    monthId: month.id,
    sourceName: "Salary",
    amount: 1000,
    receivedAt: "2026-05-15T00:00:00.000Z",
    notes: "Main job",
  });
  const income = dbStub.getCapturedIncomes()[0] as { data: { sourceName: string; amount: Prisma.Decimal; notes: string | null } };

  assert.equal(income.data.sourceName, "Salary");
  assert.equal(Number(income.data.amount.toString()), 1000);
  assert.equal(income.data.notes, "Main job");
  assert.equal(updatedMonth.monthlyIncomeTotal, 1000);
  assert.equal(updatedMonth.availableMoney, 1000);
});

test("createMonthlyIncome rejects income dates outside the linked month", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const service = createMonthlyCycleTestService(createDbStub({ monthById: month }).db);

  await assert.rejects(
    () =>
      service.createMonthlyIncome({
        monthId: month.id,
        sourceName: "Salary",
        amount: 1000,
        receivedAt: "2026-04-30T23:59:59.999Z",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /inside the linked month/i);
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.createMonthlyIncome({
        monthId: month.id,
        sourceName: "Salary",
        amount: 1000,
        receivedAt: "2026-06-01T00:00:00.000Z",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /inside the linked month/i);
      return true;
    },
  );
});

test("updateMonthlyIncome rejects received dates outside the linked month", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  month.incomes.push({
    id: "income-1",
    monthId: month.id,
    sourceName: "Salary",
    amount: amount(1000),
    receivedAt: new Date("2026-05-10T00:00:00.000Z"),
    notes: null,
    createdAt: new Date("2026-05-10T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
  });
  const service = createMonthlyCycleTestService(createDbStub({ monthById: month }).db);

  await assert.rejects(
    () =>
      service.updateMonthlyIncome({
        monthId: month.id,
        incomeId: "income-1",
        receivedAt: "2026-06-01T00:00:00.000Z",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /inside the linked month/i);
      return true;
    },
  );

  assert.equal(month.incomes[0]?.receivedAt.toISOString(), "2026-05-10T00:00:00.000Z");
});

test("update and delete monthly income require mutable linked month ownership", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  month.incomes.push({
    id: "income-1",
    monthId: month.id,
    sourceName: "Salary",
    amount: amount(1000),
    receivedAt: new Date("2026-05-10T00:00:00.000Z"),
    notes: null,
    createdAt: new Date("2026-05-10T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
  });
  const service = createMonthlyCycleTestService(createDbStub({ monthById: month }).db);

  const updatedMonth = await service.updateMonthlyIncome({
    monthId: month.id,
    incomeId: "income-1",
    amount: 1200,
    sourceName: "Salary updated",
  });
  const deletedMonth = await service.deleteMonthlyIncome(month.id, "income-1");

  assert.equal(updatedMonth.monthlyIncomeTotal, 1200);
  assert.equal(updatedMonth.incomes[0]?.sourceName, "Salary updated");
  assert.equal(deletedMonth.monthlyIncomeTotal, 0);
  assert.equal(deletedMonth.incomes.length, 0);
});

test("createMonthlyIncome rejects closed months", async () => {
  const month = { ...buildCreatedMonth(templateFixture(), 2026, 5), status: MonthStatus.CLOSED };
  const service = createMonthlyCycleTestService(createDbStub({ monthById: month }).db);

  await assert.rejects(
    () =>
      service.createMonthlyIncome({
        monthId: month.id,
        sourceName: "Salary",
        amount: 1000,
        receivedAt: "2026-05-10T00:00:00.000Z",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months/i);
      return true;
    },
  );
});

test("depositToPocket rejects source subcategory deposits in closed months", async () => {
  const month = { ...buildCreatedMonth(templateFixture(), 2026, 5), status: MonthStatus.CLOSED };
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  await assert.rejects(
    () =>
      service.depositToPocket({
        sourceKind: "SUBCATEGORY",
        monthId: month.id,
        sourceSubcategoryId: subcategoryId,
        targetPocketId: "pocket-home",
        amount: 10,
        occurredAt: "2026-05-10T00:00:00.000Z",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /month is not active/i);
      return true;
    },
  );
});

test("getClosureReview returns pending surpluses and deficits without mutating movements", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategory = month.categories[0]?.subcategories[0];

  if (!subcategory) {
    throw new Error("Missing subcategory fixture.");
  }

  month.movements.push({
    type: MovementType.EXPENSE,
    amount: amount(300),
    sourceSubcategoryId: subcategory.id,
    targetSubcategoryId: null,
    sourcePocketId: null,
    targetPocketId: null,
  });
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const review = await service.getClosureReview(month.id);

  assert.deepEqual(review.pendingSurpluses, []);
  assert.equal(review.pendingDeficits[0]?.subcategoryId, subcategory.id);
  assert.equal(review.pendingDeficits[0]?.amount, 50);
  assert.equal(review.canClose, false);
  assert.equal(dbStub.getCapturedMovements().length, 0);
});

test("getClosureReview blocks close when available money is positive or negative", async () => {
  const surplusMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  surplusMonth.incomes.push({
    id: "income-1",
    monthId: surplusMonth.id,
    sourceName: "Salary",
    amount: amount(300),
    receivedAt: new Date("2026-05-10T00:00:00.000Z"),
    notes: null,
    createdAt: new Date("2026-05-10T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
  });
  surplusMonth.movements.push({
    type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE,
    amount: amount(250),
    sourceSubcategoryId: surplusMonth.categories[0]?.subcategories[0]?.id ?? "",
    targetSubcategoryId: null,
    sourcePocketId: null,
    targetPocketId: "pocket-home",
  });

  const deficitMonth = buildCreatedMonth(templateFixture(), 2026, 5);
  deficitMonth.movements.push({
    type: MovementType.SURPLUS_TO_POCKET_ON_CLOSE,
    amount: amount(250),
    sourceSubcategoryId: deficitMonth.categories[0]?.subcategories[0]?.id ?? "",
    targetSubcategoryId: null,
    sourcePocketId: null,
    targetPocketId: "pocket-home",
  });

  const surplusReview = await createMonthlyCycleTestService(createDbStub({ monthById: surplusMonth }).db).getClosureReview(surplusMonth.id);
  const deficitReview = await createMonthlyCycleTestService(createDbStub({ monthById: deficitMonth }).db).getClosureReview(deficitMonth.id);

  assert.equal(surplusReview.availableMoney, 50);
  assert.equal(surplusReview.availableMoneyBlocker, "SURPLUS");
  assert.equal(surplusReview.canClose, false);
  assert.equal(deficitReview.availableMoney, -250);
  assert.equal(deficitReview.availableMoneyBlocker, "DEFICIT");
  assert.equal(deficitReview.canClose, false);
});

test("applyClosureAction persists surplus transfer using the default pocket", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  month.incomes.push({
    id: "income-1",
    monthId: month.id,
    sourceName: "Salary",
    amount: amount(250),
    receivedAt: new Date("2026-05-10T00:00:00.000Z"),
    notes: null,
    createdAt: new Date("2026-05-10T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
  });
  const subcategory = month.categories[0]?.subcategories[0];

  if (!subcategory) {
    throw new Error("Missing subcategory fixture.");
  }

  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  const review = await service.applyClosureAction({
    monthId: month.id,
    type: "SURPLUS_TO_POCKET_ON_CLOSE",
    sourceSubcategoryId: subcategory.id,
  });
  const movement = dbStub.getCapturedMovements()[0] as {
    data: { type: MovementType; sourceSubcategoryId: string; targetPocketId: string; amount: Prisma.Decimal };
  };

  assert.equal(movement.data.type, MovementType.SURPLUS_TO_POCKET_ON_CLOSE);
  assert.equal(movement.data.sourceSubcategoryId, subcategory.id);
  assert.equal(movement.data.targetPocketId, "pocket-home");
  assert.equal(Number(movement.data.amount.toString()), 250);
  assert.equal(review.canClose, true);
});

test("applyClosureAction requires explicit target pocket when surplus has no default pocket", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategory = month.categories[0]?.subcategories[0];

  if (!subcategory) {
    throw new Error("Missing subcategory fixture.");
  }

  subcategory.defaultPocketId = null;
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  await assert.rejects(
    () =>
      service.applyClosureAction({
        monthId: month.id,
        type: "SURPLUS_TO_POCKET_ON_CLOSE",
        sourceSubcategoryId: subcategory.id,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /target pocket is required/i);
      return true;
    },
  );
});

test("closeMonth rejects pending closure balances and closes after explicit movements", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategory = month.categories[0]?.subcategories[0];

  if (!subcategory) {
    throw new Error("Missing subcategory fixture.");
  }

  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleTestService(dbStub.db);

  await assert.rejects(() => service.closeMonth(month.id), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /pending subcategory balances or available money/i);
    return true;
  });

  month.incomes.push({
    id: "income-1",
    monthId: month.id,
    sourceName: "Salary",
    amount: amount(250),
    receivedAt: new Date("2026-05-10T00:00:00.000Z"),
    notes: null,
    createdAt: new Date("2026-05-10T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
  });

  await service.applyClosureAction({
    monthId: month.id,
    type: "SURPLUS_TO_POCKET_ON_CLOSE",
    sourceSubcategoryId: subcategory.id,
  });

  const closedMonth = await service.closeMonth(month.id);

  assert.equal(closedMonth.status, MonthStatus.CLOSED);
  assert.ok(closedMonth.closedAt);
});

test("getBasicReport returns summary totals, spending ranking, and positive or negative subcategory balances", async () => {
  const month = buildCreatedMonth(
    [
      {
        id: "cat-living",
        name: "Living",
        sortOrder: 0,
        subcategories: [
          { id: "sub-food", name: "Food", plannedAmount: amount(200), defaultPocketId: null, active: true, sortOrder: 0 },
          { id: "sub-rent", name: "Rent", plannedAmount: amount(500), defaultPocketId: null, active: true, sortOrder: 1 },
        ],
      },
    ],
    2026,
    5,
  );
  const [food, rent] = month.categories[0]?.subcategories ?? [];
  if (!food || !rent) throw new Error("Missing report fixture subcategories.");

  month.incomes.push({
    id: "income-1",
    monthId: month.id,
    sourceName: "Salary",
    amount: amount(1000),
    receivedAt: new Date("2026-05-05T00:00:00.000Z"),
    notes: null,
    createdAt: new Date("2026-05-05T00:00:00.000Z"),
    updatedAt: new Date("2026-05-05T00:00:00.000Z"),
  });
  month.movements.push(
    {
      type: MovementType.EXPENSE,
      amount: amount(250.555),
      paymentMethod: PaymentMethod.NON_CASH,
      sourceSubcategoryId: food.id,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
    {
      type: MovementType.EXPENSE,
      amount: amount(100),
      paymentMethod: PaymentMethod.CASH,
      sourceSubcategoryId: rent.id,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: null,
    },
    {
      type: MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY,
      amount: amount(25),
      sourceSubcategoryId: rent.id,
      targetSubcategoryId: null,
      sourcePocketId: null,
      targetPocketId: "pocket-1",
    },
  );
  const dbStub = createDbStub({ monthById: month });
  const report = await createMonthlyCycleTestService(dbStub.db).getBasicReport(month.id);

  assert.deepEqual(report.summary, {
    monthId: month.id,
    year: 2026,
    month: 5,
    status: MonthStatus.ACTIVE,
    monthlyIncomeTotal: 1000,
    availableMoney: 724.44,
    cashBalance: -100,
    totalPlanned: 700,
    totalSpentCash: 100,
    totalSpentNonCash: 250.56,
  });
  assert.deepEqual(
    report.topSpendingSubcategories.map((item) => ({ name: item.subcategoryName, amount: item.amount })),
    [
      { name: "Food", amount: 250.56 },
      { name: "Rent", amount: 100 },
    ],
  );
  assert.deepEqual(report.deficitSubcategories.map((item) => ({ name: item.subcategoryName, amount: item.amount })), [
    { name: "Food", amount: -50.56 },
  ]);
  assert.deepEqual(report.surplusSubcategories.map((item) => ({ name: item.subcategoryName, amount: item.amount })), [
    { name: "Rent", amount: 375 },
  ]);
  assert.equal(dbStub.getCapturedMovements().length, 0);
});

test("getBasicReport returns zero totals and empty lists for an empty month", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 6);
  const report = await createMonthlyCycleTestService(createDbStub({ monthById: month }).db).getBasicReport(month.id);

  assert.equal(report.summary.monthlyIncomeTotal, 0);
  assert.equal(report.summary.availableMoney, 0);
  assert.equal(report.summary.totalSpentCash, 0);
  assert.equal(report.summary.totalSpentNonCash, 0);
  assert.deepEqual(report.topSpendingSubcategories, []);
});
