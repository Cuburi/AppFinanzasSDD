import assert from "node:assert/strict";
import test from "node:test";

import { MonthStatus, Prisma } from "../../../../lib/prisma-client.js";
import { createMonthStructureUseCases, MONTH_STRUCTURE_USE_CASE_NAMES } from "./month-structure-use-cases.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const amount = (value: number) => new Prisma.Decimal(value.toFixed(2));

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

const createStructurePorts = () => {
  const calls: unknown[] = [];
  const txPorts = {
    months: {
      async findById(monthId: string) {
        calls.push(["tx.months.findById", monthId]);
        return month;
      },
    },
    templates: {
      async readCategories() {
        calls.push(["tx.templates.readCategories"]);
        return templateCategories;
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
      async run<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push(["transactionRunner.run"]);
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
    },
  } as unknown as MonthlyCyclePorts;

  return { calls, ports };
};

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
