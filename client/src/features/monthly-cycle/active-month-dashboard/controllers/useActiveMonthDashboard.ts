import { useCallback, useEffect, useRef, useState } from "react";

import { dashboardApi } from "../api/dashboardApi";
import type { DashboardApi, OpenMonthInput } from "../api/dashboardApi";
import { buildDashboardViewModel } from "../model/buildDashboardViewModel";
import type { DashboardModelInput } from "../model/contracts";
import type { Month } from "../../../../types";

export type ActiveMonthDashboardController = {
  openMonth: (input: OpenMonthInput) => Promise<Month | null>;
  replaceMonth: (month: Month | null) => void;
  refresh: () => Promise<void>;
  viewModel: ReturnType<typeof buildDashboardViewModel>;
};

export function useActiveMonthDashboard(api: DashboardApi = dashboardApi): ActiveMonthDashboardController {
  const [state, setState] = useState<DashboardModelInput>({ status: "loading" });
  const refreshRequestId = useRef(0);
  const openRequestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++refreshRequestId.current;
    setState({ status: "loading" });

    try {
      const month = await api.getActiveMonth();
      if (currentRequest === refreshRequestId.current) setState({ status: "ready", month });
    } catch {
      if (currentRequest === refreshRequestId.current) setState({ status: "blocking" });
    }
  }, [api]);

  const openMonth = useCallback(async (input: OpenMonthInput) => {
    const currentRequest = ++openRequestId.current;
    setState({ status: "loading" });

    try {
      const month = await api.openMonth(input);
      if (currentRequest === openRequestId.current) {
        ++refreshRequestId.current;
        setState({ status: "ready", month });
        return month;
      }
    } catch (error) {
      if (currentRequest === openRequestId.current) {
        setState({ status: "blocking", error: error instanceof Error ? error.message : "No se pudo abrir el mes.", retryInput: input });
      }
    }
    return null;
  }, [api]);

  const replaceMonth = useCallback((month: Month | null) => setState({ status: "ready", month }), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { openMonth, replaceMonth, refresh, viewModel: buildDashboardViewModel(state) };
}
