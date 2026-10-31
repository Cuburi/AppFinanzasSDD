import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/Bogota" });

test("filters expenses without changing balances and stays contained on mobile and desktop", async ({ page }) => {
  const expense = (id: string, paymentMethod: string, occurredAt: string, category: { id: string; name: string } | null) => ({
    id, paymentMethod, occurredAt, category, subcategory: category ? { id: "market", name: "Mercado" } : null,
    description: id, amount: 12000, creditCardId: null,
  });
  const expenses = [
    expense("Compra en efectivo", "CASH", "2026-08-02T00:30:00Z", { id: "food", name: "Alimentación" }),
    expense("Compra sin categoría", "NON_CASH", "2026-08-03T14:30:00Z", null),
  ];
  const entries = expenses.map((item) => ({
    entryKey: item.id, occurredAt: item.occurredAt, eventType: item.paymentMethod === "CASH" ? "CASH_EXPENSE" : "NON_CASH_EXPENSE",
    direction: "OUTFLOW", amount: item.amount, source: { kind: "MONTH", id: "month" }, destination: { kind: "EXPENSE", id: item.id },
    balanceEffects: { availableMoney: -12000, cashBalance: 0, subcategoryAvailable: 0, pocketBalance: 0 },
    metadata: { description: item.description, paymentMethod: item.paymentMethod, isSystemEvent: false },
  }));
  const requests: string[] = [];
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    requests.push(route.request().method());
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith("/active") ? { month: { id: "month", year: 2026, month: 8, status: "ACTIVE", openedAt: "2026-08-01T00:00:00Z", closedAt: null, incomes: [], categories: [], availableMoney: 50000, monthlyIncomeTotal: 74000, cashBalance: 0 } }
      : path.endsWith("/expenses") ? { expenses }
      : path.endsWith("/ledger") ? { monthId: "month", status: "ACTIVE", entries }
      : path === "/api/pockets" ? { pockets: [] }
      : path === "/api/credit-cards" ? { cards: [] } : {};
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/active-month");
  const ledger = page.getByRole("region", { name: "Movimientos del mes" });
  await expect(ledger.getByLabel("Filtrar por categoría")).toBeEnabled();
  const firstExpense = ledger.locator("article").filter({ hasText: "Compra en efectivo" });
  await expect(firstExpense.locator("time")).toContainText("1/08/2026");
  await expect(firstExpense.locator("time")).toContainText("7:30 p. m.");
  await ledger.getByLabel("Desde").fill("2026-08-01");
  await ledger.getByLabel("Hasta").fill("2026-08-01");
  await ledger.getByLabel("Filtrar por categoría").selectOption("food");
  await ledger.getByLabel("Filtrar por subcategoría").selectOption("market");
  await ledger.getByLabel("Filtrar por medio de pago").selectOption("CASH");
  await expect(ledger.locator("article")).toHaveCount(1);
  await expect(firstExpense).toBeVisible();
  await expect(page.getByRole("region", { name: "Resumen financiero", exact: true })).toContainText("$50.000 COP");
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    for (const control of await ledger.locator("input, select").all()) {
      const box = await control.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  }
  await ledger.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(ledger.locator("article")).toHaveCount(2);
  await ledger.getByLabel("Filtrar por categoría").selectOption("uncategorized");
  await expect(ledger.locator("article")).toHaveCount(1);
  await expect(ledger.locator("article")).toContainText("Compra sin categoría");
  expect(requests.every((method) => method === "GET")).toBe(true);
});
