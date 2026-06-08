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
