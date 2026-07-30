import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
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

const listTypeScriptFiles = async (directory: URL): Promise<URL[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);

      if (entry.isDirectory()) return listTypeScriptFiles(entryUrl);
      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) return [entryUrl];

      return [];
    }),
  );

  return files.flat();
};

test("createMonthlyCycleModule exposes router and service from explicit service wiring", async () => {
  const calls: string[] = [];
  const getBasicReport = async (monthId: string) => {
    calls.push(monthId);
    return report;
  };
  const module = createMonthlyCycleModule({
    service: {
      getBasicReport,
    },
  });
  const server = createTestServer(module.router);

  try {
    const response = await request(server, "/api/months/month-1/reports/basic");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), report);
    assert.equal(module.service.getBasicReport, getBasicReport);
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
    "creditCards",
    "depositWriterGate",
    "transactionRunner",
  ]);
});

test("monthly-cycle application contracts do not import Prisma-generated types", async () => {
  const applicationFiles = await listTypeScriptFiles(new URL("./application/", import.meta.url));

  for (const file of applicationFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /lib\/prisma-client\.js/);
    assert.doesNotMatch(source, /\bPrisma\.Decimal\b/);
  }
});

test("monthly-cycle shared and application money boundaries do not expose Prisma Decimal", async () => {
  const boundaryFiles = [
    ...(await listTypeScriptFiles(new URL("./shared/", import.meta.url))),
    ...(await listTypeScriptFiles(new URL("./application/ports/", import.meta.url))),
    new URL("./balance-calculator.ts", import.meta.url),
  ];

  for (const file of boundaryFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /lib\/prisma-client\.js/);
    assert.doesNotMatch(source, /\bPrisma\.Decimal\b/);
  }
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

test("monthly-cycle module root composes route service methods without the legacy service adapter", async () => {
  const moduleSource = await readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8");

  assert.match(moduleSource, /composeMonthlyCycleService/);
  assert.doesNotMatch(moduleSource, /createMonthlyCycleService/);
  assert.doesNotMatch(moduleSource, /\.\/monthly-cycle\.service\.js/);
});

test("legacy monthly-cycle service adapter is removed after test consumers migrate", async () => {
  await assert.rejects(() => access(new URL("./monthly-cycle.service.ts", import.meta.url)), { code: "ENOENT" });
});

test("monthly-cycle behavior suites are named for module-created service coverage", async () => {
  await Promise.all([
    access(new URL("./module-service.test.ts", import.meta.url)),
    access(new URL("./module-service.integration.test.ts", import.meta.url)),
  ]);

  await Promise.all([
    assert.rejects(() => access(new URL("./service.test.ts", import.meta.url)), { code: "ENOENT" }),
    assert.rejects(() => access(new URL("./service.integration.test.ts", import.meta.url)), { code: "ENOENT" }),
  ]);
});

test("template application use cases are composed by the module root and exposed to routes as a narrow boundary", async () => {
  const [routesSource, moduleSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createTemplateUseCases/);
  assert.match(moduleSource, /composeMonthlyCycleService/);
  assert.doesNotMatch(moduleSource, /\.\/workflows\/template-service\.js/);
  assert.doesNotMatch(moduleSource, /\.\/workflows\//);
  assert.match(routesSource, /TemplateRouteService/);
  assert.doesNotMatch(routesSource, /\.\/monthly-cycle\.service\.js/);
});

test("lifecycle and movement use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createLifecycleUseCases/);
  assert.match(moduleSource, /createMovementUseCases/);
  assert.match(routesSource, /LifecycleRouteService/);
  assert.match(routesSource, /MovementRouteService/);
});

test("income use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createIncomeUseCases/);
  assert.match(routesSource, /IncomeRouteService/);
});

test("cash use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createCashUseCases/);
  assert.match(routesSource, /CashRouteService/);
});

test("reports and expense-history use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createReportsUseCases/);
  assert.match(moduleSource, /createExpenseHistoryUseCases/);
  assert.match(routesSource, /ReportsRouteService/);
  assert.match(routesSource, /ExpenseHistoryRouteService/);
});

test("closure use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createClosureUseCases/);
  assert.match(routesSource, /ClosureRouteService/);
  assert.doesNotMatch(routesSource, /getClosureReview\(monthId: string\)/);
  assert.doesNotMatch(routesSource, /applyClosureAction\(input: ClosureActionInput\)/);
});

test("month-structure use cases are composed by the module root without broadening the route boundary", async () => {
  const [routesSource, moduleSource] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./monthly-cycle.module.ts", import.meta.url), "utf8"),
  ]);

  assert.match(moduleSource, /createMonthStructureUseCases/);
  assert.match(routesSource, /MonthStructureRouteService/);
  assert.doesNotMatch(routesSource, /type CompatibilityRouteService = \{/);
});

test("obsolete compatibility workflows without active consumers are removed", async () => {
  const obsoleteWorkflowPaths = [
    "./workflows/cash-service.ts",
    "./workflows/closure-service.ts",
    "./workflows/expense-history-service.ts",
    "./workflows/income-service.ts",
    "./workflows/month-structure-service.ts",
    "./workflows/reports-service.ts",
  ];

  for (const workflowPath of obsoleteWorkflowPaths) {
    await assert.rejects(() => access(new URL(workflowPath, import.meta.url)), { code: "ENOENT" });
  }
});

test("legacy service compatibility shim remains removed", async () => {
  await assert.rejects(() => access(new URL("./service.ts", import.meta.url)), { code: "ENOENT" });
});
