import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { monthlyCycleRouter } from "./routes.js";
import { DomainError } from "./service.js";
import type { BasicMonthlyReportView } from "./dto/index.js";

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

const createTestServer = (service: Parameters<typeof monthlyCycleRouter>[0]) => {
  const app = express();
  app.use(express.json());
  app.use("/api", monthlyCycleRouter(service));

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
