import { describe, expect, it } from "vitest";

import { buildDashboardViewModel } from "./buildDashboardViewModel";
import type { Month } from "../../../../types";

const activeMonth: Month = {
  id: "month-1",
  year: 2026,
  month: 7,
  status: "ACTIVE",
  openedAt: "2026-07-01T00:00:00.000Z",
  closedAt: null,
  incomes: [],
  monthlyIncomeTotal: 1_000,
  availableMoney: 375,
  cashBalance: 80,
  categories: [],
};

describe("buildDashboardViewModel", () => {
  it.each([
    ["loading", { status: "loading" as const }, "loading", "none"],
    ["unopened", { status: "ready" as const, month: null }, "unopened", "open-month"],
    ["active", { status: "ready" as const, month: activeMonth }, "active", "none"],
    ["closed", { status: "ready" as const, month: { ...activeMonth, status: "CLOSED" as const, closedAt: "2026-07-31T00:00:00.000Z" } }, "closed", "open-next-month"],
    ["blocking", { status: "blocking" as const }, "blocking", "retry-authority"],
    ["degraded", { status: "degraded" as const, month: activeMonth, source: "report" as const }, "degraded", "retry-support"],
  ])("selects the %s lifecycle and its permitted action", (_name, input, lifecycle, action) => {
    const viewModel = buildDashboardViewModel(input);

    expect(viewModel.lifecycle).toBe(lifecycle);
    expect(viewModel.action.kind).toBe(action);
  });

  it("gives the blocking authority retry precedence over an active month", () => {
    const viewModel = buildDashboardViewModel({ status: "blocking", month: activeMonth });

    expect(viewModel).toMatchObject({
      lifecycle: "blocking",
      month: activeMonth,
      action: { kind: "retry-authority" },
    });
  });

  it("keeps the active month visible when only a supporting source is degraded", () => {
    const viewModel = buildDashboardViewModel({ status: "degraded", month: activeMonth, source: "closure-review" });

    expect(viewModel).toMatchObject({
      lifecycle: "degraded",
      month: activeMonth,
      action: { kind: "retry-support", source: "closure-review" },
    });
  });
});
