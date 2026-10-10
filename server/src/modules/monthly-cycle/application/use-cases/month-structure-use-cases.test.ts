import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, Prisma } from "../../../../lib/prisma-client.js";
import { createMonthStructureUseCases, MONTH_STRUCTURE_USE_CASE_NAMES } from "./month-structure-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

import { parseUpdateMonthCategoryInput, parseUpdateMonthSubcategoryInput } from "../../dto/month-structure.dto.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

test("month edit parsers default propagation off and reject non-boolean flags and caller template ids", () => {
  assert.equal(parseUpdateMonthCategoryInput("m", "c", { name: "Food" }).updateTemplate, false);
  assert.equal(parseUpdateMonthSubcategoryInput("m", "s", { name: "Food", plannedAmount: 10 }).updateTemplate, false);
  for (const value of [null, "true", 1]) {
    assert.throws(() => parseUpdateMonthCategoryInput("m", "c", { name: "Food", updateTemplate: value }));
    assert.throws(() => parseUpdateMonthSubcategoryInput("m", "s", { name: "Food", plannedAmount: 10, updateTemplate: value }));
  }
  assert.throws(() => parseUpdateMonthCategoryInput("m", "c", { name: "Food", templateCategoryId: "injected" }));
  assert.throws(() => parseUpdateMonthSubcategoryInput("m", "s", { name: "Food", plannedAmount: 10, templateSubcategoryId: "injected" }));
});

test("opt-in edits propagate stored identities and retain an omitted month pocket", async () => {
  const { ports, calls } = createStructurePorts();
  const useCases = createMonthStructureUseCases(ports);
  assert.equal((await useCases.updateMonthCategory({ monthId: "month-1", categoryId: "cat-food", name: "Groceries", updateTemplate: true })).id, "month-1");
  await useCases.updateMonthSubcategory({ monthId: "month-1", subcategoryId: "sub-market", name: "Shopping", plannedAmount: 125, updateTemplate: true });
  await useCases.updateMonthSubcategory({ monthId: "month-1", subcategoryId: "sub-market", name: "Shopping", plannedAmount: 125, defaultPocketId: "new-pocket", updateTemplate: true });
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["tx.structure.updateTemplateCategory", "template-food", "Groceries"])));
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["tx.structure.updateTemplateSubcategory", "template-market", "Shopping", "125", "pocket-food"])));
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["tx.structure.updateTemplateSubcategory", "template-market", "Shopping", "125", "new-pocket"])));
  assert.equal(calls.filter((call) => (call as string[])[0] === "transactionRunner.runSerializable").length, 3);
});

test("opt-in edits reject missing, stale, conflicting, inactive and wrong-parent links before writes", async () => {
  for (const link of [null, "stale"]) {
    const snapshot = { ...month, categories: [{ ...month.categories[0]!, templateCategoryId: link, subcategories: [{ ...month.categories[0]!.subcategories[0]!, templateSubcategoryId: link }] }] };
    const { ports, calls } = createStructurePorts(snapshot);
    await assert.rejects(() => createMonthStructureUseCases(ports).updateMonthCategory({ monthId: "month-1", categoryId: "cat-food", name: "New", updateTemplate: true }), { statusCode: 409 });
    await assert.rejects(() => createMonthStructureUseCases(ports).updateMonthSubcategory({ monthId: "month-1", subcategoryId: "sub-market", name: "New", plannedAmount: 10, updateTemplate: true }), { statusCode: 409 });
    assert.equal(calls.some((call) => (call as string[])[0]!.startsWith("tx.structure.")), false);
  }
  const parent = templateCategories[0]!;
  for (const template of [
    [{ ...parent, subcategories: [{ ...parent.subcategories[0]!, active: false }] }],
    [{ ...parent, subcategories: [] }, { ...parent, id: "other", subcategories: parent.subcategories }],
    [{ ...parent, subcategories: [...parent.subcategories, { ...parent.subcategories[0]!, id: "other", name: "New" }] }],
    [],
  ]) {
    const { ports, calls } = createStructurePorts(month, template);
    await assert.rejects(() => createMonthStructureUseCases(ports).updateMonthSubcategory({ monthId: "month-1", subcategoryId: "sub-market", name: "New", plannedAmount: 10, updateTemplate: true }), { statusCode: 409 });
    assert.equal(calls.some((call) => (call as string[])[0]!.startsWith("tx.structure.")), false);
  }
  const { ports, calls } = createStructurePorts(month, [...templateCategories, { ...parent, id: "other", name: "New" }]);
  await assert.rejects(() => createMonthStructureUseCases(ports).updateMonthCategory({ monthId: "month-1", categoryId: "cat-food", name: " new ", updateTemplate: true }), { statusCode: 409 });
  assert.equal(calls.some((call) => (call as string[])[0]!.startsWith("tx.structure.")), false);
});

test("explicit false leaves Template untouched even when links are missing", async () => {
  const snapshot = { ...month, categories: [{ ...month.categories[0]!, templateCategoryId: null }] };
  const { ports, calls } = createStructurePorts(snapshot, []);
  await createMonthStructureUseCases(ports).updateMonthCategory({ monthId: "month-1", categoryId: "cat-food", name: "New", updateTemplate: false });
  await createMonthStructureUseCases(ports).updateMonthSubcategory({ monthId: "month-1", subcategoryId: "sub-market", name: "New", plannedAmount: 10, updateTemplate: false });
  assert.equal(calls.some((call) => (call as string[])[0]!.includes("Template") || (call as string[])[0]!.includes("templates")), false);
});

const month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: MonthStatus.ACTIVE,
  openedAt: new Date("2026-05-01T00:00:00.000Z"),
  closedAt: null,
  incomes: [],
  categories: [
    {
      id: "cat-food",
      name: "Food",
      sortOrder: 0,
      templateCategoryId: "template-food",
      subcategories: [
        { id: "sub-market", name: "Market", plannedAmount: amount(100), defaultPocketId: "pocket-food", templateSubcategoryId: "template-market", sortOrder: 0 },
      ],
    },
  ],
  movements: [],
};

const templateCategories = [
  {
    id: "template-food",
    name: "Food",
    sortOrder: 0,
    subcategories: [
      { id: "template-market", name: "Market", plannedAmount: amount(100), defaultPocketId: "pocket-food", active: true, sortOrder: 0 },
    ],
  },
];

const createStructurePorts = (snapshot: import("../../shared/service-types.js").MonthRecord = month, template: import("../../shared/service-types.js").TemplateCategoryRecord[] = templateCategories) => {
  const calls: unknown[] = [];
  let lockCalls = 0;
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return snapshot;
      },
      async lockForMutation(monthId: string) {
        lockCalls += 1;
        calls.push(["tx.months.findById", monthId]);
        return snapshot;
      },
    },
    templates: {
      async readCategories() {
        calls.push(["tx.templates.readCategories"]);
        return template;
      },
    },
    structure: {
      async createMonthCategory(input: { monthId: string; name: string; sortOrder: number; templateCategoryId: string | null }) {
        calls.push(["tx.structure.createMonthCategory", input.monthId, input.name, input.sortOrder, input.templateCategoryId]);
        return { id: "cat-fun" };
      },
      async linkMonthCategory(categoryId: string, templateCategoryId: string) {
        calls.push(["tx.structure.linkMonthCategory", categoryId, templateCategoryId]);
      },
      async createTemplateCategory(input: { name: string; sortOrder: number }) {
        calls.push(["tx.structure.createTemplateCategory", input.name, input.sortOrder]);
        return { id: "template-fun" };
      },
      async updateMonthCategory(input: { categoryId: string; name: string }) {
        calls.push(["tx.structure.updateMonthCategory", input.categoryId, input.name]);
      },
      async updateTemplateCategory(input: { categoryId: string; name: string }) {
        calls.push(["tx.structure.updateTemplateCategory", input.categoryId, input.name]);
      },
      async updateTemplateSubcategory(input: { subcategoryId: string; name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null }) {
        calls.push(["tx.structure.updateTemplateSubcategory", input.subcategoryId, input.name, input.plannedAmount.toString(), input.defaultPocketId]);
      },
      async deleteMonthCategory(categoryId: string) {
        calls.push(["tx.structure.deleteMonthCategory", categoryId]);
      },
      async createMonthSubcategory(input: { categoryId: string; name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number; templateSubcategoryId: string | null }) {
        calls.push(["tx.structure.createMonthSubcategory", input.categoryId, input.name, input.plannedAmount.toString(), input.defaultPocketId, input.sortOrder, input.templateSubcategoryId]);
        return { id: "sub-restaurants" };
      },
      async createTemplateSubcategory(input: { categoryId: string; name: string; plannedAmount: Prisma.Decimal; defaultPocketId: string | null; sortOrder: number }) {
        calls.push(["tx.structure.createTemplateSubcategory", input.categoryId, input.name, input.plannedAmount.toString(), input.defaultPocketId, input.sortOrder]);
        return { id: "template-restaurants" };
      },
      async linkMonthSubcategory(subcategoryId: string, templateSubcategoryId: string) {
        calls.push(["tx.structure.linkMonthSubcategory", subcategoryId, templateSubcategoryId]);
      },
      async updateMonthSubcategory(input: { subcategoryId: string; name: string; plannedAmount: Prisma.Decimal; defaultPocketId?: string | null }) {
        calls.push(["tx.structure.updateMonthSubcategory", input.subcategoryId, input.name, input.plannedAmount.toString(), input.defaultPocketId ?? "omitted"]);
      },
      async deleteMonthSubcategory(subcategoryId: string) {
        calls.push(["tx.structure.deleteMonthSubcategory", subcategoryId]);
      },
    },
    pockets: {
      async ensurePocketIsActive(pocketId: string, label: string) {
        calls.push(["tx.pockets.ensurePocketIsActive", pocketId, label]);
      },
    },
  };
  const ports = {
    months: {},
    templates: {},
    movements: {},
    incomes: {},
    structure: {},
    pockets: {},
    transactionRunner: {
      async runSerializable<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push(["transactionRunner.runSerializable"]);
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
      async run<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push(["transactionRunner.run"]);
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
    },
  } as unknown as MonthlyCyclePorts;

  return { calls, ports, getLockCalls: () => lockCalls };
};

test("month structure mutations lock the owning month before evaluating mutable state", async () => {
  const { ports, getLockCalls } = createStructurePorts();
  const useCases = createMonthStructureUseCases(ports);

  await useCases.createMonthCategory({ monthId: "month-1", name: "Fun", addToTemplate: false });
  await useCases.updateMonthCategory({ monthId: "month-1", categoryId: "cat-food", name: "Food" });
  await useCases.deleteMonthCategory("month-1", "cat-food").catch(() => undefined);
  await useCases.createMonthSubcategory({ monthId: "month-1", categoryId: "cat-food", name: "Restaurants", plannedAmount: 80, addToTemplate: false });
  await useCases.updateMonthSubcategory({ monthId: "month-1", subcategoryId: "sub-market", name: "Market", plannedAmount: 100 });
  await useCases.deleteMonthSubcategory("month-1", "sub-market");

  assert.equal(getLockCalls(), 6);
});

test("month-structure use cases expose only the category and subcategory public surface", () => {
  assert.deepEqual(MONTH_STRUCTURE_USE_CASE_NAMES, ["createMonthCategory", "updateMonthCategory", "deleteMonthCategory", "createMonthSubcategory", "updateMonthSubcategory", "deleteMonthSubcategory"]);
  assert.deepEqual(Object.keys(createMonthStructureUseCases(createStructurePorts().ports)), MONTH_STRUCTURE_USE_CASE_NAMES);
});

test("createMonthCategory persists snapshot and optional template category inside the transaction runner", async () => {
  const { calls, ports } = createStructurePorts();
  const useCases = createMonthStructureUseCases(ports);

  const result = await useCases.createMonthCategory({ monthId: "month-1", name: "Fun", addToTemplate: true });

  assert.equal(result.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.templates.readCategories"],
    ["tx.structure.createMonthCategory", "month-1", "Fun", 1, null],
    ["tx.structure.createTemplateCategory", "Fun", 1],
    ["tx.structure.linkMonthCategory", "cat-fun", "template-fun"],
    ["tx.months.findById", "month-1"],
  ]);
});

test("createMonthSubcategory validates pockets and links promoted template subcategories through ports", async () => {
  const { calls, ports } = createStructurePorts();
  const useCases = createMonthStructureUseCases(ports);

  const result = await useCases.createMonthSubcategory({ monthId: "month-1", categoryId: "cat-food", name: "Restaurants", plannedAmount: 80, defaultPocketId: "pocket-food", addToTemplate: true });

  assert.equal(result.id, "month-1");
  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.pockets.ensurePocketIsActive", "pocket-food", "Default pocket"],
    ["tx.templates.readCategories"],
    ["tx.structure.createMonthSubcategory", "cat-food", "Restaurants", "80", "pocket-food", 1, null],
    ["tx.structure.createTemplateSubcategory", "template-food", "Restaurants", "80", "pocket-food", 1],
    ["tx.structure.linkMonthSubcategory", "sub-restaurants", "template-restaurants"],
    ["tx.months.findById", "month-1"],
  ]);
});

test("update and delete month structure methods preserve validation and transaction-scoped writes", async () => {
  const { calls, ports } = createStructurePorts();
  const useCases = createMonthStructureUseCases(ports);

  await useCases.updateMonthSubcategory({ monthId: "month-1", subcategoryId: "sub-market", name: "Groceries", plannedAmount: 125, defaultPocketId: null });
  await useCases.deleteMonthCategory("month-1", "cat-food").catch((error: Error) => assert.equal(error.message, "Delete subcategories first before deleting this category."));
  await useCases.deleteMonthSubcategory("month-1", "sub-market");

  assert.deepEqual(calls, [
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.structure.updateMonthSubcategory", "sub-market", "Groceries", "125", "omitted"],
    ["tx.months.findById", "month-1"],
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["transactionRunner.run"],
    ["tx.months.findById", "month-1"],
    ["tx.structure.deleteMonthSubcategory", "sub-market"],
    ["tx.months.findById", "month-1"],
  ]);
});
