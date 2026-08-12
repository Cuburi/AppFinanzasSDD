import { useCallback, useEffect, useRef, useState } from "react";

import { dashboardApi } from "../api/dashboardApi";
import type { DashboardApi, OpenMonthInput } from "../api/dashboardApi";
import { buildDashboardViewModel } from "../model/buildDashboardViewModel";
import type { DashboardModelInput, DashboardSupportSource } from "../model/contracts";
import type { Month } from "../../../../types";

export type ActiveMonthDashboardController = {
  openMonth: (input: OpenMonthInput) => Promise<Month | null>;
  replaceMonth: (month: Month | null) => void;
  refresh: () => Promise<void>;
  retrySupport: (source: DashboardSupportSource) => Promise<void>;
  viewModel: ReturnType<typeof buildDashboardViewModel>;
};

export function useActiveMonthDashboard(api: DashboardApi = dashboardApi): ActiveMonthDashboardController {
  const [state, setState] = useState<DashboardModelInput>({ status: "loading" });
  const [supportFailures, setSupportFailures] = useState<DashboardSupportSource[]>([]);
  const refreshRequestId = useRef(0);
  const openRequestId = useRef(0);
  const supportRequestId = useRef<Record<DashboardSupportSource, number>>({ report: 0, "closure-review": 0 });

  const loadSupport = useCallback(async (source: DashboardSupportSource, monthId: string) => {
    const currentRequest = ++supportRequestId.current[source];
    try {
      if (source === "report") await api.getBasicReport(monthId);
      else await api.getClosureReview(monthId);
      if (currentRequest === supportRequestId.current[source]) {
        setSupportFailures((failures) => failures.filter((failure) => failure !== source));
      }
    } catch {
      if (currentRequest === supportRequestId.current[source]) {
        setSupportFailures((failures) => (failures.includes(source) ? failures : [...failures, source]));
      }
    }
  }, [api]);

  const loadSupports = useCallback(async (monthId: string) => {
    await Promise.all([loadSupport("report", monthId), loadSupport("closure-review", monthId)]);
  }, [loadSupport]);

  const refresh = useCallback(async () => {
    const currentRequest = ++refreshRequestId.current;
    setState({ status: "loading" });

    try {
      const month = await api.getActiveMonth();
      if (currentRequest === refreshRequestId.current) {
        setState({ status: "ready", month });
        setSupportFailures([]);
        if (month) await loadSupports(month.id);
      }
    } catch {
      if (currentRequest === refreshRequestId.current) setState({ status: "blocking" });
    }
  }, [api, loadSupports]);

  const openMonth = useCallback(async (input: OpenMonthInput) => {
    const currentRequest = ++openRequestId.current;
    setState({ status: "loading" });

    try {
      const month = await api.openMonth(input);
      if (currentRequest === openRequestId.current) {
        ++refreshRequestId.current;
        setState({ status: "ready", month });
        setSupportFailures([]);
        void loadSupports(month.id);
        return month;
      }
    } catch (error) {
      if (currentRequest === openRequestId.current) {
        setState({ status: "blocking", error: error instanceof Error ? error.message : "No se pudo abrir el mes.", retryInput: input });
      }
    }
    return null;
  }, [api, loadSupports]);

  const replaceMonth = useCallback((month: Month | null) => {
    setState({ status: "ready", month });
    setSupportFailures([]);
  }, []);

  const retrySupport = useCallback(async (source: DashboardSupportSource) => {
    if (state.status === "ready" && state.month) await loadSupport(source, state.month.id);
  }, [loadSupport, state]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const modelInput = state.status === "ready" && state.month && supportFailures.length > 0
    ? { status: "degraded" as const, month: state.month, source: supportFailures[0] }
    : state;
  const viewModel = { ...buildDashboardViewModel(modelInput), supportFailures };

  return { openMonth, replaceMonth, refresh, retrySupport, viewModel };
}
