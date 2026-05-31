import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReportsPage } from "./ReportsPage";
import type { BasicMonthlyReport, Month } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  getBasicReport: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

const activeMonth: Month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: "ACTIVE",
  openedAt: "2026-05-01T00:00:00.000Z",
  closedAt: null,
  incomes: [],
  monthlyIncomeTotal: 3200,
  availableMoney: 850,
  cashBalance: 120,
  categories: [],
};

const report: BasicMonthlyReport = {
  summary: {
    monthId: "month-1",
    year: 2026,
    month: 5,
    status: "ACTIVE",
    monthlyIncomeTotal: 3200,
    availableMoney: 850,
    cashBalance: 120,
    totalPlanned: 2100,
    totalSpentCash: 75,
    totalSpentNonCash: 225,
  },
  topSpendingSubcategories: [
    {
      subcategoryId: "sub-groceries",
      subcategoryName: "Groceries",
      categoryId: "cat-living",
      categoryName: "Living",
      amount: 225,
    },
  ],
  surplusSubcategories: [
    {
      subcategoryId: "sub-savings",
      subcategoryName: "Savings",
      categoryId: "cat-future",
      categoryName: "Future",
      amount: 300,
    },
  ],
  deficitSubcategories: [
    {
      subcategoryId: "sub-rent",
      subcategoryName: "Rent",
      categoryId: "cat-home",
      categoryName: "Home",
      amount: -50,
    },
  ],
};

const emptyReport: BasicMonthlyReport = {
  ...report,
  summary: {
    ...report.summary,
    monthlyIncomeTotal: 0,
    availableMoney: 0,
    cashBalance: 0,
    totalPlanned: 0,
    totalSpentCash: 0,
    totalSpentNonCash: 0,
  },
  topSpendingSubcategories: [],
  surplusSubcategories: [],
  deficitSubcategories: [],
};

describe("ReportsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getActiveMonth.mockResolvedValue(activeMonth);
    apiMock.getBasicReport.mockResolvedValue(report);
  });

  it("fetches and renders the basic report for the active month only", async () => {
    render(<ReportsPage />);

    expect(screen.getByText("Loading active month report...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Basic Reports" })).toBeInTheDocument();
    expect(apiMock.getActiveMonth).toHaveBeenCalledTimes(1);
    expect(apiMock.getBasicReport).toHaveBeenCalledWith("month-1");
    expect(screen.queryByRole("combobox", { name: /month/i })).not.toBeInTheDocument();
    expect(screen.getByText("Active month: 2026-05 · ACTIVE")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Monthly income" })).getByText("$3200.00")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Available money" })).getByText("$850.00")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Cash balance" })).getByText("$120.00")).toBeInTheDocument();
    expect(screen.getByText("Total planned: $2100.00")).toBeInTheDocument();
    expect(screen.getByText("Cash spending: $75.00")).toBeInTheDocument();
    expect(screen.getByText("Non-cash spending: $225.00")).toBeInTheDocument();

    const topSpending = screen.getByRole("region", { name: "Top spending subcategories" });
    expect(within(topSpending).getByText("Groceries")).toBeInTheDocument();
    expect(within(topSpending).getByText("Living · $225.00")).toBeInTheDocument();

    const surplus = screen.getByRole("region", { name: "Surplus subcategories" });
    expect(within(surplus).getByText("Savings")).toBeInTheDocument();
    expect(within(surplus).getByText("Future · $300.00")).toBeInTheDocument();

    const deficit = screen.getByRole("region", { name: "Deficit subcategories" });
    expect(within(deficit).getByText("Rent")).toBeInTheDocument();
    expect(within(deficit).getByText("Home · -$50.00")).toBeInTheDocument();
  });

  it("presents the report summary as accessible KPI cards without changing values", async () => {
    render(<ReportsPage />);

    expect(await screen.findByRole("heading", { name: "Basic Reports" })).toBeInTheDocument();

    const monthlyIncome = screen.getByRole("region", { name: "Monthly income" });
    expect(within(monthlyIncome).getByText("$3200.00")).toBeInTheDocument();
    expect(within(monthlyIncome).getByText("Positive trend")).toBeInTheDocument();

    const availableMoney = screen.getByRole("region", { name: "Available money" });
    expect(within(availableMoney).getByText("$850.00")).toBeInTheDocument();
    expect(within(availableMoney).getByText("Positive trend")).toBeInTheDocument();

    const cashBalance = screen.getByRole("region", { name: "Cash balance" });
    expect(within(cashBalance).getByText("$120.00")).toBeInTheDocument();
    expect(within(cashBalance).getByText("Positive trend")).toBeInTheDocument();
  });

  it("marks negative dashboard balances as risk KPI cards", async () => {
    apiMock.getBasicReport.mockResolvedValue({
      ...report,
      summary: {
        ...report.summary,
        availableMoney: -25,
        cashBalance: -10,
      },
    });

    render(<ReportsPage />);

    const availableMoney = await screen.findByRole("region", { name: "Available money" });
    expect(within(availableMoney).getByText("-$25.00")).toBeInTheDocument();
    expect(within(availableMoney).getByText("Negative trend")).toBeInTheDocument();

    const cashBalance = screen.getByRole("region", { name: "Cash balance" });
    expect(within(cashBalance).getByText("-$10.00")).toBeInTheDocument();
    expect(within(cashBalance).getByText("Negative trend")).toBeInTheDocument();
  });

  it("shows empty report states when the active month has no report rows", async () => {
    apiMock.getBasicReport.mockResolvedValue(emptyReport);

    render(<ReportsPage />);

    const monthlyIncome = await screen.findByRole("region", { name: "Monthly income" });
    expect(within(monthlyIncome).getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("No spending recorded for this active month.")).toBeInTheDocument();
    expect(screen.getByText("No surplus subcategories for this active month.")).toBeInTheDocument();
    expect(screen.getByText("No deficit subcategories for this active month.")).toBeInTheDocument();
  });

  it("does not request a report when there is no active month", async () => {
    apiMock.getActiveMonth.mockResolvedValue(null);

    render(<ReportsPage />);

    expect(await screen.findByText("There is no active month to report yet.")).toBeInTheDocument();
    expect(apiMock.getBasicReport).not.toHaveBeenCalled();
  });

  it("surfaces report loading errors", async () => {
    apiMock.getBasicReport.mockRejectedValue(new Error("Report not found."));

    render(<ReportsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Report not found.");
  });
});
