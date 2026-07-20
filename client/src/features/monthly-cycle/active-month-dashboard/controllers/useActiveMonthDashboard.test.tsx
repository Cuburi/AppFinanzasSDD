import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useActiveMonthDashboard } from "./useActiveMonthDashboard";
import type { DashboardApi } from "../api/dashboardApi";
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

function DashboardProbe({ api, onOpenMonth }: { api: DashboardApi; onOpenMonth?: (promise: Promise<Month | null>) => void }) {
  const dashboard = useActiveMonthDashboard(api);

  return (
    <>
      <output data-testid="lifecycle">{dashboard.viewModel.lifecycle}</output>
      <output data-testid="month">{dashboard.viewModel.month?.id ?? "none"}</output>
      <output data-testid="support-failures">{dashboard.viewModel.supportFailures?.join(",") || "none"}</output>
      <button onClick={() => void dashboard.refresh()} type="button">Refresh</button>
      <button onClick={() => void dashboard.retrySupport("report")} type="button">Retry report</button>
      <button onClick={() => void dashboard.retrySupport("closure-review")} type="button">Retry closure review</button>
      <button onClick={() => {
        const promise = dashboard.openMonth({ year: 2026, month: 7 });
        onOpenMonth?.(promise);
      }} type="button">Open month</button>
    </>
  );
}

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

afterEach(cleanup);

describe("useActiveMonthDashboard", () => {
  it("reads authoritative month data on mount and refreshes it on demand", async () => {
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockResolvedValueOnce(activeMonth).mockResolvedValueOnce(null),
      getBasicReport: vi.fn().mockResolvedValue({}),
      getClosureReview: vi.fn().mockResolvedValue({}),
      openMonth: vi.fn(),
    };

    render(<DashboardProbe api={api} />);

    await waitFor(() => expect(screen.getByTestId("month")).toHaveTextContent("month-1"));
    await act(async () => screen.getByRole("button", { name: "Refresh" }).click());
    await waitFor(() => expect(screen.getByTestId("lifecycle")).toHaveTextContent("unopened"));
    expect(api.getActiveMonth).toHaveBeenCalledTimes(2);
  });

  it("opens a month through the feature adapter and exposes the returned authority", async () => {
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockResolvedValue(null),
      getBasicReport: vi.fn().mockResolvedValue({}),
      getClosureReview: vi.fn().mockResolvedValue({}),
      openMonth: vi.fn().mockResolvedValue(activeMonth),
    };

    render(<DashboardProbe api={api} />);
    await waitFor(() => expect(screen.getByTestId("lifecycle")).toHaveTextContent("unopened"));
    await act(async () => screen.getByRole("button", { name: "Open month" }).click());

    expect(api.openMonth).toHaveBeenCalledWith({ year: 2026, month: 7 });
    expect(screen.getByTestId("month")).toHaveTextContent("month-1");
  });

  it("resolves an opened month before deferred support requests settle", async () => {
    const report = deferred<{}>();
    const closureReview = deferred<{}>();
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockResolvedValue(null),
      getBasicReport: vi.fn().mockReturnValue(report.promise),
      getClosureReview: vi.fn().mockReturnValue(closureReview.promise),
      openMonth: vi.fn().mockResolvedValue(activeMonth),
    };
    let opened!: Promise<Month | null>;

    render(<DashboardProbe api={api} onOpenMonth={(promise) => { opened = promise; }} />);
    await waitFor(() => expect(screen.getByTestId("lifecycle")).toHaveTextContent("unopened"));
    await act(async () => screen.getByRole("button", { name: "Open month" }).click());

    await expect(opened).resolves.toEqual(activeMonth);
    expect(screen.getByTestId("month")).toHaveTextContent("month-1");
  });

  it("keeps a successful open when a later refresh observed no active month", async () => {
    const opened = deferred<Month>();
    const refreshed = deferred<Month | null>();
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockResolvedValueOnce(null).mockReturnValueOnce(refreshed.promise),
      getBasicReport: vi.fn().mockResolvedValue({}),
      getClosureReview: vi.fn().mockResolvedValue({}),
      openMonth: vi.fn().mockReturnValue(opened.promise),
    };

    render(<DashboardProbe api={api} />);
    await waitFor(() => expect(screen.getByTestId("lifecycle")).toHaveTextContent("unopened"));
    await act(async () => screen.getByRole("button", { name: "Open month" }).click());
    await act(async () => screen.getByRole("button", { name: "Refresh" }).click());
    await act(async () => refreshed.resolve(null));
    await act(async () => opened.resolve(activeMonth));

    expect(screen.getByTestId("month")).toHaveTextContent("month-1");
  });

  it("ignores an older authority response after a newer refresh completes", async () => {
    const first = deferred<Month | null>();
    const second = deferred<Month | null>();
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
      getBasicReport: vi.fn().mockResolvedValue({}),
      getClosureReview: vi.fn().mockResolvedValue({}),
      openMonth: vi.fn(),
    };

    render(<DashboardProbe api={api} />);
    await act(async () => screen.getByRole("button", { name: "Refresh" }).click());
    await act(async () => second.resolve(null));
    await waitFor(() => expect(screen.getByTestId("lifecycle")).toHaveTextContent("unopened"));
    await act(async () => first.resolve(activeMonth));

    expect(screen.getByTestId("month")).toHaveTextContent("none");
    expect(api.getActiveMonth).toHaveBeenCalledTimes(2);
  });

  it("keeps authority visible when the report fails and retries only that support source", async () => {
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockResolvedValue(activeMonth),
      getBasicReport: vi.fn().mockRejectedValueOnce(new Error("Report unavailable")).mockResolvedValue({}),
      getClosureReview: vi.fn().mockResolvedValue({}),
      openMonth: vi.fn(),
    };

    render(<DashboardProbe api={api} />);

    await waitFor(() => expect(screen.getByTestId("support-failures")).toHaveTextContent("report"));
    expect(screen.getByTestId("month")).toHaveTextContent("month-1");
    await act(async () => screen.getByRole("button", { name: "Retry report" }).click());

    await waitFor(() => expect(screen.getByTestId("support-failures")).toHaveTextContent("none"));
    expect(api.getBasicReport).toHaveBeenCalledTimes(2);
    expect(api.getClosureReview).toHaveBeenCalledTimes(1);
    expect(api.getActiveMonth).toHaveBeenCalledTimes(1);
  });

  it("retries a failed closure review without refetching the report or authority", async () => {
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockResolvedValue(activeMonth),
      getBasicReport: vi.fn().mockResolvedValue({}),
      getClosureReview: vi.fn().mockRejectedValueOnce(new Error("Review unavailable")).mockResolvedValue({}),
      openMonth: vi.fn(),
    };

    render(<DashboardProbe api={api} />);

    await waitFor(() => expect(screen.getByTestId("support-failures")).toHaveTextContent("closure-review"));
    await act(async () => screen.getByRole("button", { name: "Retry closure review" }).click());

    await waitFor(() => expect(screen.getByTestId("support-failures")).toHaveTextContent("none"));
    expect(api.getClosureReview).toHaveBeenCalledTimes(2);
    expect(api.getBasicReport).toHaveBeenCalledTimes(1);
    expect(api.getActiveMonth).toHaveBeenCalledTimes(1);
  });

  it("refreshes authority before both supports without fetching unrelated dashboard sources", async () => {
    const getActiveMonth = vi.fn().mockResolvedValue(activeMonth);
    const getBasicReport = vi.fn().mockResolvedValue({});
    const getClosureReview = vi.fn().mockResolvedValue({});
    const api: DashboardApi = {
      getActiveMonth,
      getBasicReport,
      getClosureReview,
      openMonth: vi.fn(),
    };

    render(<DashboardProbe api={api} />);
    await waitFor(() => expect(getClosureReview).toHaveBeenCalledTimes(1));
    await act(async () => screen.getByRole("button", { name: "Refresh" }).click());

    await waitFor(() => expect(api.getClosureReview).toHaveBeenCalledTimes(2));
    expect(getActiveMonth).toHaveBeenCalledTimes(2);
    expect(getBasicReport).toHaveBeenCalledTimes(2);
    expect(getActiveMonth.mock.invocationCallOrder[1]).toBeLessThan(getBasicReport.mock.invocationCallOrder[1]);
    expect(getActiveMonth.mock.invocationCallOrder[1]).toBeLessThan(getClosureReview.mock.invocationCallOrder[1]);
  });
});
