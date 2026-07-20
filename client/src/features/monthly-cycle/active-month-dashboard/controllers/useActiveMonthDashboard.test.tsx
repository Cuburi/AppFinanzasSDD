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

function DashboardProbe({ api }: { api: DashboardApi }) {
  const dashboard = useActiveMonthDashboard(api);

  return (
    <>
      <output data-testid="lifecycle">{dashboard.viewModel.lifecycle}</output>
      <output data-testid="month">{dashboard.viewModel.month?.id ?? "none"}</output>
      <button onClick={() => void dashboard.refresh()} type="button">Refresh</button>
      <button onClick={() => void dashboard.openMonth({ year: 2026, month: 7 })} type="button">Open month</button>
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
      openMonth: vi.fn().mockResolvedValue(activeMonth),
    };

    render(<DashboardProbe api={api} />);
    await waitFor(() => expect(screen.getByTestId("lifecycle")).toHaveTextContent("unopened"));
    await act(async () => screen.getByRole("button", { name: "Open month" }).click());

    expect(api.openMonth).toHaveBeenCalledWith({ year: 2026, month: 7 });
    expect(screen.getByTestId("month")).toHaveTextContent("month-1");
  });

  it("keeps a successful open when a later refresh observed no active month", async () => {
    const opened = deferred<Month>();
    const refreshed = deferred<Month | null>();
    const api: DashboardApi = {
      getActiveMonth: vi.fn().mockResolvedValueOnce(null).mockReturnValueOnce(refreshed.promise),
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
});
