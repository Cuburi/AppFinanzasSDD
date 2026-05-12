import test from "node:test";
import assert from "node:assert/strict";
import { MonthStatus, MovementType, Prisma } from "@prisma/client";

import { createMonthlyCycleService, DomainError } from "./service.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

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
  createdMonth,
}: {
  template?: TemplateFixture;
  activeMonth?: { id: string; year: number; month: number } | null;
  existingTargetMonth?: { id: string } | null;
  monthById?: MonthFixture | null;
  targetPocket?: { id: string; active: boolean } | null;
  createdMonth?: MonthFixture;
}) => {
  let readTemplate = cloneTemplateFixture(template);
  let monthToReturn = createdMonth ?? buildCreatedMonth(readTemplate, 2026, 5);
  let capturedCreateArgs: unknown;
  const capturedMovements: unknown[] = [];

  const db = {
    async $transaction<T>(callback: (tx: typeof db) => Promise<T>) {
      return callback(db);
    },
    templateCategory: {
      async findMany() {
        return cloneTemplateFixture(readTemplate);
      },
      async deleteMany() {
        readTemplate = [];
        return { count: 0 };
      },
      async create() {
        return {};
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
    },
    movement: {
      async create(args: unknown) {
        capturedMovements.push(args);
        const movement = args as { data?: { type?: MovementType; amount?: Prisma.Decimal; sourceSubcategoryId?: string | null; targetPocketId?: string | null } };

        if (monthById && movement.data?.type && movement.data.amount) {
          monthById.movements.push({
            type: movement.data.type,
            amount: movement.data.amount,
            sourceSubcategoryId: movement.data.sourceSubcategoryId ?? null,
            targetSubcategoryId: null,
            sourcePocketId: null,
            targetPocketId: movement.data.targetPocketId ?? null,
          });
        }

        return { id: `movement-${capturedMovements.length}` };
      },
    },
    savingsPocket: {
      async findUnique() {
        return targetPocket;
      },
    },
  };

  return {
    db,
    getCapturedCreateArgs: () => capturedCreateArgs,
    getCapturedMovements: () => capturedMovements,
    setCreatedMonth: (value: MonthFixture) => {
      monthToReturn = value;
    },
  };
};

test("openMonth snapshots the current template into a new active month", async () => {
  const template = templateFixture();
  const dbStub = createDbStub({
    template,
    createdMonth: buildCreatedMonth(template, 2026, 6),
  });
  const service = createMonthlyCycleService(dbStub.db);

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
  const service = createMonthlyCycleService(dbStub.db);

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
  const service = createMonthlyCycleService(dbStub.db);

  await assert.rejects(() => service.openMonth({ year: 2026, month: 6 }), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /at least one subcategory/i);
    return true;
  });
});

test("getActiveMonth returns null when there is no active month", async () => {
  const dbStub = createDbStub({ activeMonth: null });
  const service = createMonthlyCycleService(dbStub.db);

  const month = await service.getActiveMonth();

  assert.equal(month, null);
});

test("recordExpense persists an expense and returns recalculated balances", async () => {
  const month = buildCreatedMonth(templateFixture(), 2026, 5);
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleService(dbStub.db);

  const updatedMonth = await service.recordExpense({
    monthId: month.id,
    sourceSubcategoryId: subcategoryId,
    amount: 75,
    description: "Supermercado",
  });
  const movement = dbStub.getCapturedMovements()[0] as { data: { type: MovementType; sourceSubcategoryId: string; amount: Prisma.Decimal } };

  assert.equal(movement.data.type, MovementType.EXPENSE);
  assert.equal(movement.data.sourceSubcategoryId, subcategoryId);
  assert.equal(Number(movement.data.amount.toString()), 75);
  assert.equal(updatedMonth.categories[0]?.subcategories[0]?.available, 175);
});

test("depositToPocket rejects source subcategory deposits in closed months", async () => {
  const month = { ...buildCreatedMonth(templateFixture(), 2026, 5), status: MonthStatus.CLOSED };
  const subcategoryId = month.categories[0]?.subcategories[0]?.id ?? "";
  const dbStub = createDbStub({ monthById: month });
  const service = createMonthlyCycleService(dbStub.db);

  await assert.rejects(
    () =>
      service.depositToPocket({
        monthId: month.id,
        sourceSubcategoryId: subcategoryId,
        targetPocketId: "pocket-home",
        amount: 10,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months/i);
      return true;
    },
  );
});
