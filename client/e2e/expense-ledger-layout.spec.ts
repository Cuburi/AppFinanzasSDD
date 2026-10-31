import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

test.use({ timezoneId: "America/Bogota", reducedMotion: "reduce" });

// Compare document-relative positions: expanding the ledger can scroll the viewport.
async function geometry(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + window.scrollX, y: box.y + window.scrollY, width: box.width, height: box.height };
  });
}

for (const width of [1280, 320]) {
  test(`expense capture stays stable through ledger expansion and details at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const expenses = Array.from({ length: 14 }, (_, index) => ({
      id: `expense-${index}`, paymentMethod: "NON_CASH", occurredAt: "2026-08-03T14:30:00Z",
      category: null, subcategory: null, description: `Compra ${index}`, amount: 12000, creditCardId: null,
    }));
    const entries = expenses.map((expense) => ({
      entryKey: expense.id, occurredAt: expense.occurredAt, eventType: "NON_CASH_EXPENSE",
      direction: "OUTFLOW", amount: expense.amount,
      source: { kind: "MONTH", id: "month" }, destination: { kind: "EXPENSE", id: expense.id },
      balanceEffects: { availableMoney: -12000, cashBalance: 0, subcategoryAvailable: 0, pocketBalance: 0 },
      metadata: { description: expense.description, paymentMethod: expense.paymentMethod, isSystemEvent: false },
    }));
    const requests: string[] = [];
    await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
      requests.push(route.request().method());
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith("/active") ? { month: { id: "month", year: 2026, month: 8, status: "ACTIVE", openedAt: "2026-08-01T00:00:00Z", closedAt: null, incomes: [], categories: [], availableMoney: 50000, monthlyIncomeTotal: 218000, cashBalance: 0 } }
        : path.endsWith("/expenses") ? { expenses }
        : path.endsWith("/ledger") ? { monthId: "month", status: "ACTIVE", entries }
        : path === "/api/pockets" ? { pockets: [] }
        : path === "/api/credit-cards" ? { cards: [] } : {};
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/active-month");
    const capture = page.getByRole("region", { name: "Registrar gasto", exact: true });
    const ledger = page.getByRole("region", { name: "Movimientos del mes" });
    await expect(ledger.locator("article")).toHaveCount(5);
    await expect(ledger.getByLabel("Filtrar por categoría")).toBeEnabled();
    await capture.getByLabel("Monto", { exact: true }).fill("34567");
    await capture.getByLabel("Descripción (opcional)", { exact: true }).fill("Borrador conservado");
    await capture.getByLabel("Fecha del gasto").fill("2026-08-05");
    await capture.getByLabel("Método de pago").selectOption("CASH");
    const controls = capture.locator("input, select, button");
    const initial = await geometry(capture);
    const initialControls = await Promise.all((await controls.all()).map(geometry));
    const previewHeight = (await geometry(ledger)).height;

    const assertStable = async (phase: string) => {
      const current = await geometry(capture);
      console.log(`${width}px ${phase}: capture ${initial.height} -> ${current.height}; ledger ${(await geometry(ledger)).height}`);
      expect.soft(current).toEqual(initial);
      expect.soft(await Promise.all((await controls.all()).map(geometry))).toEqual(initialControls);
      expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      for (const box of await Promise.all((await controls.all()).map(geometry))) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.height).toBeGreaterThan(0);
      }
      await expect(capture.getByLabel("Monto", { exact: true })).toHaveValue("34567");
      await expect(capture.getByLabel("Descripción (opcional)", { exact: true })).toHaveValue("Borrador conservado");
      await expect(capture.getByLabel("Fecha del gasto")).toHaveValue("2026-08-05");
      await expect(capture.getByLabel("Método de pago")).toHaveValue("CASH");
      await expect(capture.getByRole("button", { name: "Registrar gasto", exact: true })).toBeEnabled();
    };
    await ledger.getByRole("button", { name: "Ver y gestionar movimientos" }).click();
    await expect(ledger.locator("article")).toHaveCount(14);
    expect((await geometry(ledger)).height).toBeGreaterThan(previewHeight);
    await assertStable("expanded");
    const entry = ledger.locator("article").first();
    await entry.locator("summary").click();
    await expect(entry.locator("dl")).toBeVisible();
    await assertStable("details");
    await ledger.getByRole("button", { name: "Ocultar gestión de movimientos" }).click();
    await expect(ledger.locator("article")).toHaveCount(5);
    await assertStable("preview restored");

    // Secondary income capture still opens independently without replacing the draft.
    await page.getByRole("button", { name: /Registrar ingreso$/ }).click();
    const income = page.getByRole("region", { name: "Registrar ingreso", exact: true });
    await income.getByLabel("Fuente del ingreso").fill("Ingreso borrador");
    await expect(income.getByLabel("Fuente del ingreso")).toHaveValue("Ingreso borrador");
    await income.getByRole("button", { name: "Cancelar ingreso" }).click();
    await expect(income).toHaveCount(0);
    await assertStable("income dismissed");
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((method) => method === "GET")).toBe(true);
  });
}
