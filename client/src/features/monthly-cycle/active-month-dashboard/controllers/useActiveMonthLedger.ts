import { useCallback, useEffect, useRef, useState } from "react";

import { monthlyLedgerApi } from "../api/monthlyLedgerApi";
import type { MonthlyLedgerApi } from "../api/monthlyLedgerApi";
import { validateMonthlyLedger } from "../model/monthlyLedger";
import type { MonthlyLedgerEntry } from "../model/monthlyLedger";

type LedgerState = { monthId: string | null; status: "loading" | "refreshing" | "ready" | "error"; entries: MonthlyLedgerEntry[]; resolverStatus: "idle" | "loading" | "ready" | "error" };
export type ActiveMonthLedgerController = LedgerState & { retry: () => Promise<void> };

export function useActiveMonthLedger(monthId: string | null, api: MonthlyLedgerApi = monthlyLedgerApi, resolveExpenses?: (monthId: string) => Promise<void>): ActiveMonthLedgerController {
  const [state, setState] = useState<LedgerState>({ monthId: null, status: "loading", entries: [], resolverStatus: "idle" });
  const requestId = useRef(0);
  const resolveExpensesRef = useRef(resolveExpenses);
  resolveExpensesRef.current = resolveExpenses;
  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!monthId) return setState({ monthId: null, status: "ready", entries: [], resolverStatus: "idle" });
    setState((current) => current.monthId === monthId
      ? { ...current, status: current.entries.length ? "refreshing" : "loading", entries: current.entries }
      : { monthId, status: "loading", entries: [], resolverStatus: "idle" });
    try {
      const ledger = validateMonthlyLedger(await api.get(monthId));
      if (currentRequest !== requestId.current) return;
      const resolver = resolveExpensesRef.current;
      setState({ monthId, status: "ready", entries: ledger.entries, resolverStatus: resolver ? "loading" : "idle" });
      if (resolver) {
        try { await resolver(monthId); if (currentRequest === requestId.current) setState((current) => ({ ...current, resolverStatus: "ready" })); }
        catch { if (currentRequest === requestId.current) setState((current) => ({ ...current, resolverStatus: "error" })); }
      }
    } catch {
      if (currentRequest === requestId.current) setState((current) => ({ ...current, status: "error" }));
    }
  }, [api, monthId]);
  useEffect(() => { void refresh(); return () => { ++requestId.current; }; }, [refresh]);
  return { ...state, retry: refresh };
}
