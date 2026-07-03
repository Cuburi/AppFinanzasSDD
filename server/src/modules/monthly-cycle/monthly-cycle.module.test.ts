import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("monthly-cycle final wiring avoids service shim consumers in startup, routes, and module root", async () => {
  const [indexSource, routesSource, moduleSource] = await Promise.all([
    readFile(new URL("../../index.ts", import.meta.url), "utf8"),
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(indexSource, /createMonthlyCycleModule/);
  assert.doesNotMatch(indexSource, /monthlyCycleRouter/);
  assert.doesNotMatch(routesSource, /\.\/service\.js/);
  assert.doesNotMatch(moduleSource, /\.\/service\.js/);
});

test("template application use cases are composed by the module root and exposed to routes as a narrow boundary", async () => {
  const [routesSource, moduleSource, compatibilityServiceSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createTemplateUseCases/);
  assert.match(moduleSource, /createMonthlyCycleService/);
  assert.doesNotMatch(moduleSource, /\.\/workflows\/template-service\.js/);
  assert.doesNotMatch(moduleSource, /\.\/workflows\//);
  assert.match(routesSource, /TemplateRouteService/);
  assert.doesNotMatch(routesSource, /\.\/monthly-cycle\.service\.js/);
  assert.doesNotMatch(compatibilityServiceSource, /createTemplateService/);
});

test("lifecycle and movement use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource, compatibilityServiceSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createLifecycleUseCases/);
  assert.match(moduleSource, /createMovementUseCases/);
  assert.match(routesSource, /LifecycleRouteService/);
  assert.match(routesSource, /MovementRouteService/);
  assert.doesNotMatch(compatibilityServiceSource, /createMonthLifecycleService/);
  assert.doesNotMatch(compatibilityServiceSource, /createMovementService/);
});

test("income use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource, compatibilityServiceSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createIncomeUseCases/);
  assert.match(routesSource, /IncomeRouteService/);
  assert.doesNotMatch(compatibilityServiceSource, /createIncomeService/);
});

test("cash use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource, compatibilityServiceSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createCashUseCases/);
  assert.match(routesSource, /CashRouteService/);
  assert.doesNotMatch(compatibilityServiceSource, /createCashService/);
});

test("reports and expense-history use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource, compatibilityServiceSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createReportsUseCases/);
  assert.match(moduleSource, /createExpenseHistoryUseCases/);
  assert.match(routesSource, /ReportsRouteService/);
  assert.match(routesSource, /ExpenseHistoryRouteService/);
  assert.doesNotMatch(compatibilityServiceSource, /createReportsService/);
  assert.doesNotMatch(compatibilityServiceSource, /createExpenseHistoryService/);
});
