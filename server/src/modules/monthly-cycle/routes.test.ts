import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { ErrorRequestHandler } from "express";
import { PaymentMethod } from "../../lib/prisma-client.js";

import { monthlyCycleRouter } from "./routes.js";
import { DomainError } from "./service.js";
import type { BasicMonthlyReportView, MonthView } from "./dto/index.js";

const report: BasicMonthlyReportView = {
  summary: {
    monthId: "month-1",
    year: 2026,
    month: 5,
    status: "ACTIVE",
    monthlyIncomeTotal: 1000,
    availableMoney: 650,
    cashBalance: 50,
    totalPlanned: 700,
    totalSpentCash: 50,
    totalSpentNonCash: 300,
  },
  topSpendingSubcategories: [
    { subcategoryId: "sub-food", subcategoryName: "Food", categoryId: "cat-living", categoryName: "Living", amount: 300 },
  ],
  surplusSubcategories: [
    { subcategoryId: "sub-rent", subcategoryName: "Rent", categoryId: "cat-living", categoryName: "Living", amount: 100 },
  ],
  deficitSubcategories: [
    { subcategoryId: "sub-food", subcategoryName: "Food", categoryId: "cat-living", categoryName: "Living", amount: -50 },
  ],
};

const month: MonthView = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: "ACTIVE",
  openedAt: "2026-05-01T00:00:00.000Z",
  closedAt: null,
  monthlyIncomeTotal: 0,
  availableMoney: -125,
  cashBalance: 0,
  categories: [
    {
      id: "cat-food",
      name: "Food",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        {
          id: "sub-market",
          name: "Market",
          plannedAmount: 250,
          available: 125,
          defaultPocketId: null,
          sortOrder: 0,
          templateSubcategoryId: null,
        },
      ],
    },
  ],
  incomes: [],
};

const createTestServer = (service: Parameters<typeof monthlyCycleRouter>[0]) => {
  const app = express();
  app.use(express.json());
  app.use("/api", monthlyCycleRouter(service));
  const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    response.status(400).json({ message: error instanceof Error ? error.message : "Invalid request body." });
  };
  app.use(jsonErrorHandler);

  return app.listen(0);
};

const request = async (server: ReturnType<typeof createTestServer>, path: string) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

  return fetch(`http://127.0.0.1:${address.port}${path}`);
};

test("monthlyCycleRouter exposes GET /api/months/:id/reports/basic", async () => {
  const calls: string[] = [];
  const server = createTestServer({
    async getBasicReport(monthId: string) {
      calls.push(monthId);
      return report;
    },
  });

  try {
    const response = await request(server, "/api/months/month-1/reports/basic");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), report);
    assert.deepEqual(calls, ["month-1"]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter maps blank report month ids to 400 and missing segment to route 404", async () => {
  let calls = 0;
  const server = createTestServer({
    async getBasicReport() {
      calls += 1;
      throw new Error("Invalid route input should not reach service.");
    },
  });

  try {
    const encodedBlankResponse = await request(server, "/api/months/%20%20%20/reports/basic");
    const missingSegmentResponse = await request(server, "/api/months//reports/basic");

    assert.equal(encodedBlankResponse.status, 400);
    assert.deepEqual(await encodedBlankResponse.json(), { message: "Month id is required." });
    assert.equal(missingSegmentResponse.status, 404);
    assert.equal(calls, 0);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter maps missing report months to 404", async () => {
  const server = createTestServer({
    async getBasicReport() {
      throw new DomainError(404, "Month was not found.");
    },
  });

  try {
    const response = await request(server, "/api/months/missing-month/reports/basic");

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { message: "Month was not found." });
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter delegates template, month lifecycle, and pocket deposit routes through injected service", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getTemplate() {
      calls.push({ type: "getTemplate" });
      return { categories: [{ id: "cat-template", name: "Template", sortOrder: 0, subcategories: [] }] };
    },
    async openMonth(input: unknown) {
      calls.push({ type: "openMonth", input });
      return month;
    },
    async depositToPocket(input: unknown) {
      calls.push({ type: "depositToPocket", input });
      return month;
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const templateResponse = await fetch(`http://127.0.0.1:${address.port}/api/template`);
    const openResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ year: 2026, month: 5 }),
    });
    const depositResponse = await fetch(`http://127.0.0.1:${address.port}/api/pockets/deposits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ monthId: "month-1", sourceSubcategoryId: "sub-market", targetPocketId: "pocket-1", amount: 75, description: "Deposit" }),
    });

    assert.equal(templateResponse.status, 200);
    assert.deepEqual(await templateResponse.json(), { categories: [{ id: "cat-template", name: "Template", sortOrder: 0, subcategories: [] }] });
    assert.equal(openResponse.status, 201);
    assert.deepEqual(await openResponse.json(), month);
    assert.equal(depositResponse.status, 201);
    assert.deepEqual(await depositResponse.json(), { month });
    assert.deepEqual(calls, [
      { type: "getTemplate" },
      { type: "openMonth", input: { year: 2026, month: 5 } },
      {
        type: "depositToPocket",
        input: {
          monthId: "month-1",
          sourceSubcategoryId: "sub-market",
          targetPocketId: "pocket-1",
          amount: 75,
          description: "Deposit",
          externalSourceLabel: null,
        },
      },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter preserves PUT /api/template payload and response contract", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async updateTemplate(input: unknown) {
      calls.push(input);
      return {
        categories: [
          {
            id: "cat-template",
            name: "Template",
            sortOrder: 0,
            subcategories: [
              {
                id: "sub-buffer",
                name: "Buffer",
                plannedAmount: 100,
                defaultPocketId: "pocket-buffer",
                active: true,
                sortOrder: 0,
              },
            ],
          },
        ],
      };
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/template`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categories: [{ name: " Template ", subcategories: [{ name: " Buffer ", plannedAmount: 100, defaultPocketId: "pocket-buffer" }] }],
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      categories: [
        {
          id: "cat-template",
          name: "Template",
          sortOrder: 0,
          subcategories: [
            {
              id: "sub-buffer",
              name: "Buffer",
              plannedAmount: 100,
              defaultPocketId: "pocket-buffer",
              active: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    });
    assert.deepEqual(calls, [
      { categories: [{ name: "Template", subcategories: [{ name: "Buffer", plannedAmount: 100, defaultPocketId: "pocket-buffer" }] }] },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter parses PATCH /api/months/:id/expenses/:expenseId and returns the updated month", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async updateExpense(input: unknown) {
      calls.push(input);
      return month;
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/expenses/expense-1`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceSubcategoryId: "sub-market",
        amount: 125,
        description: "Updated",
        occurredAt: "2026-05-12T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), month);
    assert.deepEqual(calls, [
      {
        monthId: "month-1",
        expenseId: "expense-1",
        sourceSubcategoryId: "sub-market",
        amount: 125,
        description: "Updated",
        occurredAt: "2026-05-12T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter exposes DELETE /api/months/:id/expenses/:expenseId and maps missing expense domain errors", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async deleteExpense(monthId: string, expenseId: string) {
      calls.push({ monthId, expenseId });
      throw new DomainError(404, "Expense was not found in this month.");
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/expenses/expense-foreign`, {
      method: "DELETE",
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { message: "Expense was not found in this month." });
    assert.deepEqual(calls, [{ monthId: "month-1", expenseId: "expense-foreign" }]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter rejects malformed PATCH expense payloads before service execution", async () => {
  let calls = 0;
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async updateExpense() {
      calls += 1;
      return month;
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const invalidPaymentResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/expenses/expense-1`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceSubcategoryId: "sub-market",
        amount: 125,
        occurredAt: "2026-05-12T00:00:00.000Z",
        paymentMethod: "CARD",
      }),
    });
    const invalidDateResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/expenses/expense-1`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceSubcategoryId: "sub-market",
        amount: 125,
        occurredAt: "not-a-date",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    });
    const blankMonthResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/%20%20%20/expenses/expense-1`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceSubcategoryId: "sub-market",
        amount: 125,
        occurredAt: "2026-05-12T00:00:00.000Z",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    });
    const malformedJsonResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/expenses/expense-1`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    assert.equal(invalidPaymentResponse.status, 400);
    assert.deepEqual(await invalidPaymentResponse.json(), { message: "Payment method must be CASH or NON_CASH." });
    assert.equal(invalidDateResponse.status, 400);
    assert.deepEqual(await invalidDateResponse.json(), { message: "Expense date must be a valid date." });
    assert.equal(blankMonthResponse.status, 400);
    assert.deepEqual(await blankMonthResponse.json(), { message: "Month id is required." });
    assert.equal(malformedJsonResponse.status, 400);
    assert.equal(calls, 0);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter rejects blank DELETE expense route ids before service execution", async () => {
  let calls = 0;
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async deleteExpense() {
      calls += 1;
      return month;
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const blankExpenseResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/expenses/%20%20%20`, {
      method: "DELETE",
    });
    const blankMonthResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/%20%20%20/expenses/expense-1`, {
      method: "DELETE",
    });

    assert.equal(blankExpenseResponse.status, 400);
    assert.deepEqual(await blankExpenseResponse.json(), { message: "Expense id is required." });
    assert.equal(blankMonthResponse.status, 400);
    assert.deepEqual(await blankMonthResponse.json(), { message: "Month id is required." });
    assert.equal(calls, 0);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter parses PATCH /api/months/:id/categories/:categoryId and returns the updated month", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async updateMonthCategory(input: unknown) {
      calls.push(input);
      return { ...month, categories: [{ ...month.categories[0]!, name: "Variables" }] };
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/cat-food`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Variables" }),
    });

    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as MonthView).categories[0]?.name, "Variables");
    assert.deepEqual(calls, [{ monthId: "month-1", categoryId: "cat-food", name: "Variables" }]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter parses PATCH /api/months/:id/subcategories/:subcategoryId and returns the updated month", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async updateMonthSubcategory(input: unknown) {
      calls.push(input);
      return {
        ...month,
        categories: [
          {
            ...month.categories[0]!,
            subcategories: [{ ...month.categories[0]!.subcategories[0]!, name: "Supermercado", plannedAmount: 300 }],
          },
        ],
      };
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/subcategories/sub-market`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Supermercado", plannedAmount: 300, defaultPocketId: "pocket-buffer" }),
    });

    const body = (await response.json()) as MonthView;
    assert.equal(response.status, 200);
    assert.equal(body.categories[0]?.subcategories[0]?.name, "Supermercado");
    assert.deepEqual(calls, [
      { monthId: "month-1", subcategoryId: "sub-market", name: "Supermercado", plannedAmount: 300, defaultPocketId: "pocket-buffer" },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter accepts zero plannedAmount for PATCH month subcategories", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async updateMonthSubcategory(input: unknown) {
      calls.push(input);
      return {
        ...month,
        categories: [
          {
            ...month.categories[0]!,
            subcategories: [{ ...month.categories[0]!.subcategories[0]!, plannedAmount: 0 }],
          },
        ],
      };
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/subcategories/sub-market`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Supermercado", plannedAmount: 0 }),
    });

    const body = (await response.json()) as MonthView;
    assert.equal(response.status, 200);
    assert.equal(body.categories[0]?.subcategories[0]?.plannedAmount, 0);
    assert.deepEqual(calls, [{ monthId: "month-1", subcategoryId: "sub-market", name: "Supermercado", plannedAmount: 0 }]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter parses POST /api/months/:id/categories with explicit addToTemplate", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async createMonthCategory(input: unknown) {
      calls.push(input);
      return {
        ...month,
        categories: [...month.categories, { id: "cat-new", name: "Variables", sortOrder: 1, templateCategoryId: null, subcategories: [] }],
      };
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "  Variables  ", addToTemplate: false }),
    });

    const body = (await response.json()) as MonthView;
    assert.equal(response.status, 201);
    assert.equal(body.categories[1]?.name, "Variables");
    assert.deepEqual(calls, [{ monthId: "month-1", name: "Variables", addToTemplate: false }]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter parses POST /api/months/:id/categories/:categoryId/subcategories and allows plannedAmount zero", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async createMonthSubcategory(input: unknown) {
      calls.push(input);
      return {
        ...month,
        categories: [
          {
            ...month.categories[0]!,
            subcategories: [
              ...month.categories[0]!.subcategories,
              { id: "sub-new", name: "Taxi", plannedAmount: 0, available: 0, defaultPocketId: "pocket-buffer", sortOrder: 1, templateSubcategoryId: null },
            ],
          },
        ],
      };
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/cat-food/subcategories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Taxi", plannedAmount: 0, defaultPocketId: "pocket-buffer", addToTemplate: true }),
    });

    const body = (await response.json()) as MonthView;
    assert.equal(response.status, 201);
    assert.equal(body.categories[0]?.subcategories[1]?.plannedAmount, 0);
    assert.deepEqual(calls, [
      { monthId: "month-1", categoryId: "cat-food", name: "Taxi", plannedAmount: 0, defaultPocketId: "pocket-buffer", addToTemplate: true },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter rejects malformed POST month structure payloads before service execution", async () => {
  let calls = 0;
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async createMonthCategory() {
      calls += 1;
      return month;
    },
    async createMonthSubcategory() {
      calls += 1;
      return month;
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const missingFlag = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Variables" }),
    });
    const badFlag = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Variables", addToTemplate: "yes" }),
    });
    const negativeAmount = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/cat-food/subcategories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Taxi", plannedAmount: -1, addToTemplate: false }),
    });
    const blankParent = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/%20%20%20/subcategories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Taxi", plannedAmount: 0, addToTemplate: false }),
    });

    assert.equal(missingFlag.status, 400);
    assert.deepEqual(await missingFlag.json(), { message: "addToTemplate is required." });
    assert.equal(badFlag.status, 400);
    assert.deepEqual(await badFlag.json(), { message: "addToTemplate must be true or false." });
    assert.equal(negativeAmount.status, 400);
    assert.deepEqual(await negativeAmount.json(), { message: "Planned amount must be zero or greater." });
    assert.equal(blankParent.status, 400);
    assert.deepEqual(await blankParent.json(), { message: "Category id is required." });
    assert.equal(calls, 0);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter maps POST month structure domain errors", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async createMonthCategory(input: unknown) {
      calls.push({ type: "category", input });
      throw new DomainError(409, "Closed months are immutable.");
    },
    async createMonthSubcategory(input: unknown) {
      calls.push({ type: "subcategory", input });
      throw new DomainError(404, "Category was not found in this month.");
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const categoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Variables", addToTemplate: false }),
    });
    const subcategoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/missing-category/subcategories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Taxi", plannedAmount: 0, addToTemplate: false }),
    });

    assert.equal(categoryResponse.status, 409);
    assert.deepEqual(await categoryResponse.json(), { message: "Closed months are immutable." });
    assert.equal(subcategoryResponse.status, 404);
    assert.deepEqual(await subcategoryResponse.json(), { message: "Category was not found in this month." });
    assert.deepEqual(calls, [
      { type: "category", input: { monthId: "month-1", name: "Variables", addToTemplate: false } },
      { type: "subcategory", input: { monthId: "month-1", categoryId: "missing-category", name: "Taxi", plannedAmount: 0, addToTemplate: false } },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter maps month structure PATCH domain errors", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async updateMonthCategory(input: unknown) {
      calls.push({ type: "category", input });
      throw new DomainError(404, "Category was not found in this month.");
    },
    async updateMonthSubcategory(input: unknown) {
      calls.push({ type: "subcategory", input });
      throw new DomainError(409, "Closed months are immutable.");
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const categoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/missing-category`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Variables" }),
    });
    const subcategoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/subcategories/sub-market`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Supermercado", plannedAmount: 300 }),
    });

    assert.equal(categoryResponse.status, 404);
    assert.deepEqual(await categoryResponse.json(), { message: "Category was not found in this month." });
    assert.equal(subcategoryResponse.status, 409);
    assert.deepEqual(await subcategoryResponse.json(), { message: "Closed months are immutable." });
    assert.deepEqual(calls, [
      { type: "category", input: { monthId: "month-1", categoryId: "missing-category", name: "Variables" } },
      { type: "subcategory", input: { monthId: "month-1", subcategoryId: "sub-market", name: "Supermercado", plannedAmount: 300 } },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter exposes DELETE month structure routes and maps delete guard domain errors", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async deleteMonthSubcategory(monthId: string, subcategoryId: string) {
      calls.push({ type: "subcategory", monthId, subcategoryId });
      throw new DomainError(409, "Cannot delete subcategory with associated movements.");
    },
    async deleteMonthCategory(monthId: string, categoryId: string) {
      calls.push({ type: "category", monthId, categoryId });
      throw new DomainError(409, "Delete subcategories first before deleting this category.");
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const subcategoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/subcategories/sub-market`, {
      method: "DELETE",
    });
    const categoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/cat-food`, {
      method: "DELETE",
    });

    assert.equal(subcategoryResponse.status, 409);
    assert.deepEqual(await subcategoryResponse.json(), { message: "Cannot delete subcategory with associated movements." });
    assert.equal(categoryResponse.status, 409);
    assert.deepEqual(await categoryResponse.json(), { message: "Delete subcategories first before deleting this category." });
    assert.deepEqual(calls, [
      { type: "subcategory", monthId: "month-1", subcategoryId: "sub-market" },
      { type: "category", monthId: "month-1", categoryId: "cat-food" },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter maps missing month structure DELETE domain errors", async () => {
  const calls: unknown[] = [];
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async deleteMonthSubcategory(monthId: string, subcategoryId: string) {
      calls.push({ type: "subcategory", monthId, subcategoryId });
      throw new DomainError(404, "Subcategory was not found in this month.");
    },
    async deleteMonthCategory(monthId: string, categoryId: string) {
      calls.push({ type: "category", monthId, categoryId });
      throw new DomainError(404, "Category was not found in this month.");
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const subcategoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/subcategories/missing-subcategory`, {
      method: "DELETE",
    });
    const categoryResponse = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/missing-category`, {
      method: "DELETE",
    });

    assert.equal(subcategoryResponse.status, 404);
    assert.deepEqual(await subcategoryResponse.json(), { message: "Subcategory was not found in this month." });
    assert.equal(categoryResponse.status, 404);
    assert.deepEqual(await categoryResponse.json(), { message: "Category was not found in this month." });
    assert.deepEqual(calls, [
      { type: "subcategory", monthId: "month-1", subcategoryId: "missing-subcategory" },
      { type: "category", monthId: "month-1", categoryId: "missing-category" },
    ]);
  } finally {
    server.close();
  }
});

test("monthlyCycleRouter rejects malformed month structure payloads and blank ids before service execution", async () => {
  let calls = 0;
  const server = createTestServer({
    async getBasicReport() {
      return report;
    },
    async updateMonthCategory() {
      calls += 1;
      return month;
    },
    async updateMonthSubcategory() {
      calls += 1;
      return month;
    },
    async deleteMonthCategory() {
      calls += 1;
      return month;
    },
    async deleteMonthSubcategory() {
      calls += 1;
      return month;
    },
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

    const blankCategoryPatch = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/%20%20%20`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Variables" }),
    });
    const blankNamePatch = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/categories/cat-food`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "   " }),
    });
    const negativeAmountPatch = await fetch(`http://127.0.0.1:${address.port}/api/months/month-1/subcategories/sub-market`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Supermercado", plannedAmount: -1 }),
    });
    const blankDelete = await fetch(`http://127.0.0.1:${address.port}/api/months/%20%20%20/subcategories/sub-market`, {
      method: "DELETE",
    });

    assert.equal(blankCategoryPatch.status, 400);
    assert.deepEqual(await blankCategoryPatch.json(), { message: "Category id is required." });
    assert.equal(blankNamePatch.status, 400);
    assert.deepEqual(await blankNamePatch.json(), { message: "Category name is required." });
    assert.equal(negativeAmountPatch.status, 400);
    assert.deepEqual(await negativeAmountPatch.json(), { message: "Planned amount must be zero or greater." });
    assert.equal(blankDelete.status, 400);
    assert.deepEqual(await blankDelete.json(), { message: "Month id is required." });
    assert.equal(calls, 0);
  } finally {
    server.close();
  }
});
