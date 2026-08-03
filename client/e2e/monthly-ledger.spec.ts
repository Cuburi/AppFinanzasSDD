import { expect, test, type Page } from "@playwright/test";

const month = {
  id: "browser-month", year: 2026, month: 8, status: "ACTIVE", openedAt: "2026-08-01T00:00:00.000Z", closedAt: null,
  monthlyIncomeTotal: 5000000, availableMoney: 3750000, cashBalance: 80000, incomes: [],
  categories: [{ id: "category-1", name: "Hogar", sortOrder: 0, templateCategoryId: null, subcategories: [{ id: "subcategory-1", name: "Mercado", plannedAmount: 500000, available: 480000, defaultPocketId: null, templateSubcategoryId: null, sortOrder: 0 }] }],
};

const ledger = (entryKey: string, eventType: string, description: string, isSystemEvent = false) => ({
  entryKey, occurredAt: "2026-08-02T14:30:00.000Z", eventType, direction: isSystemEvent ? "TRANSFER" : "OUTFLOW", amount: 12000,
  source: { kind: "MONTH", id: "browser-month" }, destination: { kind: isSystemEvent ? "CASH" : "EXPENSE", id: entryKey },
  balanceEffects: { availableMoney: -12000, cashBalance: 0, subcategoryAvailable: -12000, pocketBalance: 0 },
  metadata: { description, paymentMethod: "CASH", isSystemEvent },
});

async function mockMonthlyLedgerContracts(page: Page) {
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path === "/api/months/active" ? { month }
      : path === "/api/pockets" ? { pockets: [] }
      : path === "/api/credit-cards" ? { cards: [] }
      : path === "/api/months/browser-month/expenses" ? { expenses: [] }
      : path === "/api/months/browser-month/ledger" ? { monthId: "browser-month", status: "ACTIVE", entries: [ledger("system-a", "CASH_CARRYOVER", "Ajuste inicial", true), ledger("expense-b", "CASH_EXPENSE", "Mercado semanal"), ledger("system-c", "DEFICIT_RESOLUTION", "Ajuste final", true)] }
      : {};
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
}

test("keeps the canonical ledger usable and contained on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mockMonthlyLedgerContracts(page);
  await page.goto("/active-month");

  const ledgerRegion = page.getByRole("region", { name: "Movimientos del mes" });
  await expect(ledgerRegion).toContainText("Mercado semanal", { timeout: 15_000 });
  expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await ledgerRegion.locator("[data-ledger-item]").evaluateAll((items) => items.map((item) => item.getAttribute("data-ledger-item")))).toEqual(["system-a", "expense-b", "system-c"]);

  const disclosures = ledgerRegion.getByRole("button", { name: /movimientos? automáticos?/i });
  await expect(disclosures).toHaveCount(2);
  await disclosures.nth(0).focus();
  await expect(disclosures.nth(0)).toBeFocused();
  await expect(disclosures.nth(0)).not.toHaveCSS("box-shadow", "none");
  await disclosures.nth(0).screenshot({ path: "../docs/verification/unified-monthly-ledger-frontend/focused-disclosure-320.png" });
  await page.keyboard.press("Enter");
  await expect(ledgerRegion).toContainText("Ajuste inicial");
  await expect(ledgerRegion).not.toContainText("Ajuste final");
  await disclosures.nth(1).click();
  await expect(ledgerRegion).toContainText("Ajuste final");

  const ordinaryDetails = ledgerRegion.locator('[data-ledger-item="expense-b"] .monthly-ledger-entry details');
  const ordinarySummary = ordinaryDetails.locator("summary");
  await expect(ordinaryDetails).not.toHaveAttribute("open");
  await ordinarySummary.focus();
  await expect(ordinarySummary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(ordinaryDetails).toHaveAttribute("open", "");
  expect((await ordinarySummary.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  for (const target of await ledgerRegion.getByRole("button").all()) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("reflows expanded ledger content at a 200% viewport equivalent", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 });
  await mockMonthlyLedgerContracts(page);
  await page.goto("/active-month");

  const ledgerRegion = page.getByRole("region", { name: "Movimientos del mes" });
  await expect(ledgerRegion).toContainText("Mercado semanal", { timeout: 15_000 });
  const disclosures = ledgerRegion.getByRole("button", { name: /movimientos? automáticos?/i });
  await disclosures.nth(0).click();
  await disclosures.nth(1).click();
  await expect(ledgerRegion).toContainText("Ajuste inicial");
  await expect(ledgerRegion).toContainText("Ajuste final");

  expect(await page.evaluate(() => window.innerWidth)).toBe(640);
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
  expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await ledgerRegion.locator("[data-ledger-item]").evaluateAll((items) => items.map((item) => {
    const { left, right } = item.getBoundingClientRect();
    return left >= 0 && right <= window.innerWidth;
  }))).toEqual([true, true, true]);
  await ledgerRegion.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "../docs/verification/unified-monthly-ledger-frontend/active-month-200pct.png", fullPage: true });
});

test("removes ordinary disclosure motion under reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockMonthlyLedgerContracts(page);
  await page.goto("/active-month");

  const ledgerRegion = page.getByRole("region", { name: "Movimientos del mes" });
  const ordinaryDetails = ledgerRegion.locator('[data-ledger-item="expense-b"] .monthly-ledger-entry details');
  const disclosure = ordinaryDetails.locator("summary");
  await expect(ordinaryDetails).not.toHaveAttribute("open", { timeout: 15_000 });
  await disclosure.click();
  await expect(ordinaryDetails).toHaveAttribute("open", "");
  await expect(ledgerRegion).toContainText("Origen: Mes");
  expect(await disclosure.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return style.transitionDelay === "0s" && style.transform === "none";
  })).toBe(true);
});
