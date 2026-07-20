import { useCallback, useEffect, useRef, useState } from "react";

import { dashboardApi } from "../api/dashboardApi";
import type { DashboardApi, OpenMonthInput } from "../api/dashboardApi";
import { buildDashboardViewModel } from "../model/buildDashboardViewModel";
import type { DashboardModelInput } from "../model/contracts";

export type ActiveMonthDashboardController = {
  openMonth: (input: OpenMonthInput) => Promise<void>;
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
      }
    } catch {
      if (currentRequest === openRequestId.current) setState({ status: "blocking" });
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { openMonth, refresh, viewModel: buildDashboardViewModel(state) };
}
