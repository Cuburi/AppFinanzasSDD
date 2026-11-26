import { expect, test } from "@playwright/test";

for (const width of [1440, 320]) {
  test(`real guided closure stays compact and reloadable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const initial = { id: "guided-month", year: 2026, month: 10, status: "ACTIVE", openedAt: "2026-10-01", closedAt: null, monthlyIncomeTotal: 1000000, availableMoney: 300000, openingBalance: 0, openingSourceMonthId: null, closureAllocation: null, cashBalance: 50000, incomes: [], categories: [] };
    let closed: Record<string, unknown> | null = null;
    let next: Record<string, unknown> | null = null;
    const posts: unknown[] = [];
    const apiPaths: string[] = [];
    // Every API request is fulfilled locally, including unexpected ones. Never
    // fall through to the development proxy or any personal backend.
    await page.route(url => url.pathname.startsWith("/api/"), async route => {
      const request = route.request(); const path = new URL(request.url()).pathname;
      apiPaths.push(path);
      let payload: unknown;
      if (path === "/api/months/active") payload = { month: next ?? (closed ? null : initial) };
      else if (path === "/api/months/latest-closed") payload = { month: closed };
      else if (path === "/api/months/guided-month" && request.method() === "GET") payload = closed;
      else if (path.endsWith("/closure-review")) payload = { monthId: path.includes("guided-next") ? "guided-next" : initial.id, status: "ACTIVE", canClose: false, requiresDisposition: true, closureAllocation: null, availableMoney: path.includes("guided-next") ? 100000 : 300000, availableMoneyBlocker: "SURPLUS", pendingDeficits: [], pendingSurpluses: [], budgetVariances: [] };
      else if (path === "/api/months/guided-month/close" && request.method() === "POST") {
        const allocation = request.postDataJSON(); posts.push(allocation);
        closed = { ...initial, status: "CLOSED", closedAt: "2026-10-31", closureAllocation: { availableMoney: 300000, ...allocation } }; payload = closed;
      } else if (path === "/api/months/open" && request.method() === "POST") {
        expect(request.postDataJSON()).toEqual({ year: 2026, month: 11 });
        next = { ...initial, id: "guided-next", month: 11, openingBalance: 100000, openingSourceMonthId: initial.id, monthlyIncomeTotal: 0, availableMoney: 100000 }; payload = next;
      } else { await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: `Unexpected intercepted endpoint: ${path}` }) }); return; }
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
    });
    await page.goto("/close-month");
    const panels = page.locator(".month-closure-panel");
    await expect(page.getByRole("heading", { name: "Esto es lo que te queda" })).toBeVisible();
    const compact = await panels.first().boundingBox();
    await page.getByText("Ver efectivo, bolsillos y presupuesto").click();
    await expect(page.locator(".month-closure-details")).toHaveAttribute("open", "");
    await page.getByRole("button", { name: "Elegir destino →" }).click();
    await expect(page.locator(".month-closure-details")).not.toHaveAttribute("open");
    const heights = await panels.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
    expect(heights[1]).toBeLessThanOrEqual(compact!.height + 2);
    expect(heights[1]).toBeLessThan(width === 1440 ? 700 : 1100);
    await expect(page.getByRole("heading", { name: "Esto es lo que te queda" })).toHaveCount(0);
    await page.getByRole("radio", { name: /Dividir el sobrante/ }).check();
    await page.getByLabel("Al siguiente mes (COP)").fill("NaN");
    await page.getByLabel("Fuera del seguimiento (COP)").fill("200000");
    await expect(page.getByRole("button", { name: "Revisar cierre →" })).toBeDisabled();
    expect(posts).toEqual([]);
    await page.getByLabel("Al siguiente mes (COP)").fill("100000");
    await page.getByLabel("Fuera del seguimiento (COP)").fill("200000");
    await page.getByRole("button", { name: "Revisar cierre →" }).click();
    expect(posts).toEqual([]);
    await expect(page.getByRole("button", { name: "Confirmar cierre" })).toBeVisible();
    await page.getByRole("button", { name: "← Cambiar destino" }).click();
    await expect(page.getByLabel("Al siguiente mes (COP)")).toHaveValue("$ 100.000");
    await page.getByRole("button", { name: "Revisar cierre →" }).click();
    await page.getByRole("button", { name: "Confirmar cierre" }).click();
    await expect(page.getByRole("region", { name: "Resumen del mes cerrado" })).toBeVisible();
    expect(posts).toEqual([{ carryAmount: 100000, excludedAmount: 200000 }]);
    await expect(page).toHaveURL(/closedMonthId=guided-month/);
    const beforeReload = apiPaths.length;
    await page.reload();
    await expect(page.getByRole("region", { name: "Historial de distribución del cierre" })).toContainText("100.000");
    expect(apiPaths[beforeReload]).toBe("/api/months/guided-month");
    await page.getByRole("button", { name: "Abrir noviembre de 2026" }).click();
    await expect(page.getByRole("heading", { name: "Esto es lo que te queda" })).toBeVisible();
    await expect(page).not.toHaveURL(/closedMonthId/);
    await expect(page.locator(".month-closure-equation")).toContainText("100.000");
    await expect(page.locator(".month-closure-equation")).toContainText("+ Ingresos$0 COP");
    expect(await page.locator("html").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  });
}
