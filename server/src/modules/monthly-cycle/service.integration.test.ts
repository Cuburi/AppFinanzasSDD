import test from "node:test";
import assert from "node:assert/strict";
import { MonthStatus, MovementType, Prisma } from "@prisma/client";

import { createMonthlyCycleService, DomainError } from "./service.js";

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
  })),
});

const createIntegrationDb = (initialTemplate?: TemplateCategoryState[]) => {
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
      return callback(db);
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

        return {};
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
      async create(args: {
        data: {
          type: MovementType;
          amount: Prisma.Decimal;
          description?: string | null;
          monthId?: string | null;
          sourceSubcategoryId?: string | null;
          targetSubcategoryId?: string | null;
          sourcePocketId?: string | null;
          targetPocketId?: string | null;
          externalSourceLabel?: string | null;
        };
      }) {
        const movement = {
          type: args.data.type,
          amount: args.data.amount,
          monthId: args.data.monthId ?? null,
          description: args.data.description ?? null,
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

        return { id: `movement-${nextId++}` };
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

  await service.applyClosureAction({
    monthId: month.id,
    type: "SURPLUS_TO_POCKET_ON_CLOSE",
    sourceSubcategoryId: subcategoryId,
  });
  await service.closeMonth(month.id);

  await assert.rejects(
    () => service.recordExpense({ monthId: month.id, sourceSubcategoryId: subcategoryId, amount: 10 }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /closed months are immutable/i);
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
    assert.match(error.message, /pending surpluses or deficits/i);
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

  await service.recordExpense({ monthId: month.id, sourceSubcategoryId: deficitTargetId, amount: 150 });
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
