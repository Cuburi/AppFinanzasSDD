import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useActiveMonthLedger } from "./useActiveMonthLedger";
import type { MonthlyLedgerApi } from "../api/monthlyLedgerApi";

const payload = (key: string, sourceKind = "CASH", destinationKind = "EXPENSE") => ({ monthId: "month-1", status: "ACTIVE", entries: [{ entryKey: key, occurredAt: "2026-08-01T12:00:00.000Z", eventType: "CASH_EXPENSE", direction: "OUTFLOW", source: { kind: sourceKind, id: null }, destination: { kind: destinationKind, id: null }, amount: 1, balanceEffects: { availableMoney: -1, cashBalance: -1, subcategoryAvailable: -1, pocketBalance: 0 }, metadata: { description: null, paymentMethod: "CASH", isSystemEvent: false } }] });
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, reject, resolve }; };
function Probe({ api, monthId, resolver, unstableResolver }: { api: MonthlyLedgerApi; monthId: string | null; resolver?: () => Promise<void>; unstableResolver?: () => Promise<void> }) {
  const resolveExpenses = unstableResolver ? () => unstableResolver() : resolver;
  const ledger = useActiveMonthLedger(monthId, api, resolveExpenses);
  return <><output data-testid="state">{ledger.status}:{ledger.entries.map((entry) => entry.entryKey).join(",")}:{ledger.resolverStatus}</output><button onClick={() => void ledger.retry()}>Retry</button></>;
}
afterEach(cleanup);

describe("useActiveMonthLedger", () => {
  it("retains stale rows on a failed retry and exposes local retry state", async () => {
    const api: MonthlyLedgerApi = { get: vi.fn().mockResolvedValueOnce(payload("first")).mockRejectedValueOnce(new Error("offline")) };
    render(<Probe api={api} monthId="month-1" />);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("ready:first"));
    await act(async () => screen.getByRole("button", { name: "Retry" }).click());
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("error:first"));
  });

  it("clears the previous month's rows while the next month loads and when it fails", async () => {
    const nextMonth = deferred<unknown>();
    const api: MonthlyLedgerApi = { get: vi.fn().mockResolvedValueOnce(payload("month-a")).mockReturnValueOnce(nextMonth.promise) };
    const view = render(<Probe api={api} monthId="month-a" />);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("ready:month-a"));

    view.rerender(<Probe api={api} monthId="month-b" />);
    expect(screen.getByTestId("state")).toHaveTextContent("loading:");

    await act(async () => nextMonth.reject(new Error("offline")));
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("error:"));
  });

  it("discards late responses and clears old rows when the month changes", async () => {
    const first = deferred<unknown>(); const second = deferred<unknown>();
    const api: MonthlyLedgerApi = { get: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise) };
    const view = render(<Probe api={api} monthId="month-1" />);
    view.rerender(<Probe api={api} monthId="month-2" />);
    expect(screen.getByTestId("state")).toHaveTextContent("loading:");
    await act(async () => second.resolve({ ...payload("new"), monthId: "month-2" }));
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("ready:new"));
    await act(async () => first.resolve(payload("old")));
    expect(screen.getByTestId("state")).toHaveTextContent("ready:new");
  });

  it("keeps an independent resolver failure local to the support controller", async () => {
    const api: MonthlyLedgerApi = { get: vi.fn().mockResolvedValue(payload("entry")) };
    const resolver = vi.fn().mockRejectedValue(new Error("history unavailable"));
    render(<Probe api={api} monthId="month-1" resolver={resolver} />);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("ready:entry:error"));
    expect(resolver).toHaveBeenCalledWith("month-1");
  });

  it("does not restart ledger loading when the resolver identity changes during hook rerenders", async () => {
    const api: MonthlyLedgerApi = { get: vi.fn().mockResolvedValue(payload("entry")) };
    const resolver = vi.fn().mockResolvedValue(undefined);
    render(<Probe api={api} monthId="month-1" unstableResolver={resolver} />);

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("ready:entry:ready"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid retry replacement and preserves known rows for another retry", async () => {
    const api: MonthlyLedgerApi = { get: vi.fn().mockResolvedValueOnce(payload("first")).mockResolvedValueOnce(payload("bad", "CASH", "UNKNOWN_DESTINATION")) };
    render(<Probe api={api} monthId="month-1" />);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("ready:first"));

    await act(async () => screen.getByRole("button", { name: "Retry" }).click());
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("error:first"));
  });
});
