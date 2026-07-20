import { describe, expect, it } from "vitest";

import { buildCommandCenterViewModel } from "./model";
import type { BasicMonthlyReport, ClosureReview, Month } from "../../../types";

const activeMonth: Month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: "ACTIVE",
  openedAt: "2026-05-01T00:00:00.000Z",
  closedAt: null,
  incomes: [],
  monthlyIncomeTotal: 1_000,
  availableMoney: 375,
  cashBalance: 80,
  categories: [],
};

const authoritativeReport: BasicMonthlyReport = {
  summary: {
    monthId: "month-1",
    year: 2026,
    month: 5,
    status: "ACTIVE",
    monthlyIncomeTotal: 1_000,
    availableMoney: 375,
    cashBalance: 80,
    totalPlanned: 800,
    totalSpentCash: 120,
    totalSpentNonCash: 55,
  },
  topSpendingSubcategories: [],
  surplusSubcategories: [],
  deficitSubcategories: [],
};

const closableReview: ClosureReview = {
  monthId: "month-1",
  status: "ACTIVE",
  pendingSurpluses: [],
  pendingDeficits: [],
  availableMoney: 375,
  availableMoneyBlocker: null,
  canClose: true,
};

describe("buildCommandCenterViewModel", () => {
  it("exposes exact authoritative metrics from both spending buckets and the signed report balance", () => {
    const viewModel = buildCommandCenterViewModel({
      status: "ready",
      month: activeMonth,
      report: authoritativeReport,
      review: closableReview,
    });

    expect(viewModel).toMatchObject({
      lifecycle: "active",
      detail: "healthy",
      metrics: {
        available: { status: "available", value: 375 },
        spent: { status: "available", value: 175 },
        planned: { status: "available", value: 800 },
        remaining: { status: "available", value: 375 },
      },
      action: { kind: "close-month" },
    });
  });

  it.each([
    ["missing report", undefined],
    ["different month", { ...authoritativeReport, summary: { ...authoritativeReport.summary, monthId: "another-month" } }],
    ["non-finite spending", { ...authoritativeReport, summary: { ...authoritativeReport.summary, totalSpentCash: Number.NaN } }],
  ])("withholds spending and remaining when authority is unavailable: %s", (_reason, report) => {
    const viewModel = buildCommandCenterViewModel({
      status: "ready",
      month: activeMonth,
      report,
      review: closableReview,
    });

    expect(viewModel).toMatchObject({
      lifecycle: "active",
      detail: "unavailable",
      metrics: {
        spent: { status: "unavailable" },
        remaining: { status: "unavailable" },
      },
      action: { kind: "retry-summary" },
    });
    expect(viewModel.metrics.spent).not.toMatchObject({ value: 0 });
    expect(viewModel.metrics.remaining).not.toMatchObject({ value: 625 });
  });

  it.each([
    ["loading", { status: "loading" as const }, "loading"],
    ["request failure", { status: "error" as const }, "error"],
    ["no open month", { status: "ready" as const, month: null }, "unopened"],
    ["closed month", { status: "ready" as const, month: { ...activeMonth, status: "CLOSED" as const, closedAt: "2026-05-31T00:00:00.000Z" } }, "closed"],
  ])("models observable lifecycle state: %s", (_name, input, lifecycle) => {
    const viewModel = buildCommandCenterViewModel(input);

    expect(viewModel.lifecycle).toBe(lifecycle);
  });

  it.each([
    ["unopened setup", { status: "ready" as const, month: null }, "open-month"],
    ["unavailable authority retry", { status: "ready" as const, month: activeMonth }, "retry-summary"],
    [
      "deficit before missing income",
      {
        status: "ready" as const,
        month: { ...activeMonth, incomes: [] },
        report: { ...authoritativeReport, deficitSubcategories: [{ subcategoryId: "food", subcategoryName: "Food", categoryId: "living", categoryName: "Living", amount: -30 }] },
        review: { ...closableReview, pendingDeficits: [{ subcategoryId: "food", subcategoryName: "Food", amount: -30 }], canClose: false },
      },
      "review-closure",
    ],
    [
      "missing income before no expense activity",
      { status: "ready" as const, month: activeMonth, report: { ...authoritativeReport, summary: { ...authoritativeReport.summary, monthlyIncomeTotal: 0, totalSpentCash: 0, totalSpentNonCash: 0 } }, review: { ...closableReview, canClose: false } },
      "record-income",
    ],
    [
      "no expense activity",
      { status: "ready" as const, month: activeMonth, report: { ...authoritativeReport, summary: { ...authoritativeReport.summary, totalSpentCash: 0, totalSpentNonCash: 0 } }, review: { ...closableReview, canClose: false } },
      "record-expense",
    ],
    ["closable review", { status: "ready" as const, month: activeMonth, report: authoritativeReport, review: closableReview }, "close-month"],
    [
      "healthy with no action",
      { status: "ready" as const, month: activeMonth, report: authoritativeReport, review: { ...closableReview, canClose: false } },
      "none",
    ],
  ])("selects exactly one action by deterministic precedence: %s", (_name, input, actionKind) => {
    const viewModel = buildCommandCenterViewModel(input);

    expect(viewModel.action.kind).toBe(actionKind);
    expect(viewModel.action.completionClaim).toBe(false);
  });
});
