import assert from "node:assert/strict";
import express from "express";
import test from "node:test";

import { MONTHLY_CYCLE_PORT_NAMES } from "./application/ports/monthly-cycle-ports.js";
import { createMonthlyCycleModule } from "./monthly-cycle.module.js";
import type { BasicMonthlyReportView } from "./dto/index.js";

const report: BasicMonthlyReportView = {
  summary: {
    monthId: "month-1",
    year: 2026,
    month: 5,
    status: "ACTIVE",
    monthlyIncomeTotal: 1000,
    availableMoney: 600,
    cashBalance: 50,
    totalPlanned: 750,
    totalSpentCash: 50,
    totalSpentNonCash: 350,
  },
  topSpendingSubcategories: [],
  surplusSubcategories: [],
  deficitSubcategories: [],
};

const createTestServer = (router: ReturnType<typeof createMonthlyCycleModule>["router"]) => {
  const app = express();
  app.use(express.json());
  app.use("/api", router);

  return app.listen(0);
};

const request = async (server: ReturnType<typeof createTestServer>, path: string) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

  return fetch(`http://127.0.0.1:${address.port}${path}`);
};

test("createMonthlyCycleModule exposes router and service from explicit service wiring", async () => {
  const calls: string[] = [];
  const module = createMonthlyCycleModule({
    service: {
      async getBasicReport(monthId: string) {
        calls.push(monthId);
        return report;
      },
    },
  });
  const server = createTestServer(module.router);

  try {
    const response = await request(server, "/api/months/month-1/reports/basic");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), report);
    assert.equal(module.service.getBasicReport, module.service.getBasicReport);
    assert.deepEqual(calls, ["month-1"]);
  } finally {
    server.close();
  }
});

test("monthly-cycle port scaffold names the initial explicit boundaries", () => {
  assert.deepEqual(MONTHLY_CYCLE_PORT_NAMES, [
    "months",
    "templates",
    "movements",
    "incomes",
    "structure",
    "pockets",
    "transactionRunner",
  ]);
});
