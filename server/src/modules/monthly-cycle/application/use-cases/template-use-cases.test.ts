import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "../../../../lib/prisma-client.js";
import { createTemplateUseCases, TEMPLATE_USE_CASE_NAMES } from "./template-use-cases.js";
import { parseTemplateInput, type TemplateInput } from "../../dto/index.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

const templateCategories = [
  {
    id: "cat-fixed",
    name: "Fixed",
    sortOrder: 0,
    subcategories: [
      {
        id: "sub-rent",
        name: "Rent",
        plannedAmount: new Prisma.Decimal("250.00"),
        defaultPocketId: "pocket-home",
        active: true,
        sortOrder: 0,
      },
    ],
  },
];

const createTemplatePorts = () => {
  const calls: string[] = [];
  const input: TemplateInput = {
    categories: [{ id: "cat-fixed", name: "Savings", subcategories: [{ id: "sub-rent", name: "Emergency", plannedAmount: 100, defaultPocketId: "pocket-safe" }] }],
  };
  const txPorts = {
    templates: {
      async readCategories() {
        calls.push("tx.templates.readCategories");
        return templateCategories;
      },
      async replaceCategories(received: TemplateInput) {
        assert.deepEqual(received, input);
        calls.push(`tx.templates.replaceCategories:${received.categories[0]?.name}`);
      },
    },
    pockets: {
      async ensurePocketIsActive() {
        throw new Error("Template use cases should not validate individual pockets directly.");
      },
      async ensureTemplateDefaultPocketsAreActive(received: TemplateInput) {
        calls.push(`tx.pockets.ensureTemplateDefaultPocketsAreActive:${received.categories[0]?.subcategories[0]?.defaultPocketId}`);
      },
    },
  };
  const ports = {
    months: {},
    templates: {
      async readCategories() {
        calls.push("templates.readCategories");
        return templateCategories;
      },
      async replaceCategories() {
        throw new Error("Template updates must use transaction-scoped template ports.");
      },
    },
    movements: {},
    incomes: {},
    structure: {},
    pockets: {},
    transactionRunner: {
      async run<T>(work: (ports: Omit<MonthlyCyclePorts, "transactionRunner">) => Promise<T>) {
        calls.push("transactionRunner.run");
        return work(txPorts as unknown as Omit<MonthlyCyclePorts, "transactionRunner">);
      },
    },
  } as unknown as MonthlyCyclePorts;

  return { calls, input, ports };
};

test("template use cases expose only the stable template public surface", () => {
  assert.deepEqual(TEMPLATE_USE_CASE_NAMES, ["getTemplate", "updateTemplate"]);
  assert.deepEqual(Object.keys(createTemplateUseCases(createTemplatePorts().ports)), ["getTemplate", "updateTemplate"]);
});

test("getTemplate maps template categories through the injected template port", async () => {
  const { calls, ports } = createTemplatePorts();
  const useCases = createTemplateUseCases(ports);

  const template = await useCases.getTemplate();

  assert.deepEqual(calls, ["templates.readCategories"]);
  assert.deepEqual(template, {
    categories: [
      {
        id: "cat-fixed",
        name: "Fixed",
        sortOrder: 0,
        subcategories: [
          {
            id: "sub-rent",
            name: "Rent",
            plannedAmount: 250,
            defaultPocketId: "pocket-home",
            active: true,
            sortOrder: 0,
          },
        ],
      },
    ],
  });
});

test("template input preserves optional ids and rejects malformed identities", () => {
  const payload = { categories: [{ id: "cat-fixed", name: "Fixed", subcategories: [
    { id: "sub-rent", name: "Rent", plannedAmount: 250 },
    { name: "New", plannedAmount: 0 },
  ] }, { name: "New category", subcategories: [] }] };
  const parsed = parseTemplateInput(payload);
  assert.equal(parsed.categories[0]?.id, "cat-fixed");
  assert.equal(parsed.categories[0]?.subcategories[0]?.id, "sub-rent");
  assert.equal(Object.hasOwn(parsed.categories[0]!.subcategories[1]!, "id"), false);
  assert.equal(Object.hasOwn(parsed.categories[1]!, "id"), false);
  for (const id of [null, "", "  ", 123]) {
    assert.throws(() => parseTemplateInput({ categories: [{ id, name: "Fixed", subcategories: [] }] }));
    assert.throws(() => parseTemplateInput({ categories: [{ name: "Fixed", subcategories: [{ id, name: "Rent", plannedAmount: 1 }] }] }));
  }
});

test("updateTemplate validates pockets and forwards record identities inside the transaction runner", async () => {
  const { calls, input, ports } = createTemplatePorts();
  const useCases = createTemplateUseCases(ports);

  const template = await useCases.updateTemplate(input);

  assert.deepEqual(calls, [
    "transactionRunner.run",
    "tx.pockets.ensureTemplateDefaultPocketsAreActive:pocket-safe",
    "tx.templates.replaceCategories:Savings",
    "tx.templates.readCategories",
  ]);
  assert.equal(template.categories[0]?.subcategories[0]?.plannedAmount, 250);
});
