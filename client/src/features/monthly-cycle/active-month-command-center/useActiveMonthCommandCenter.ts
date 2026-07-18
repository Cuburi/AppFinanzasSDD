import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../../../lib/api";
import { buildCommandCenterViewModel } from "./model";
import type { CommandCenterViewModel } from "./model";

type CommandCenterState =
  | { status: "loading" }
  | { status: "error" }
  | Parameters<typeof buildCommandCenterViewModel>[0];

export type ActiveMonthCommandCenter = {
  retry: () => void;
  viewModel: CommandCenterViewModel;
};

export function useActiveMonthCommandCenter(refreshKey?: unknown): ActiveMonthCommandCenter {
  const [state, setState] = useState<CommandCenterState>({ status: "loading" });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState({ status: "loading" });

    try {
      const month = await api.getActiveMonth();
      if (!month) {
        if (currentRequest === requestId.current) setState({ status: "ready", month: null });
        return;
      }

      const [reportResult, reviewResult] = await Promise.allSettled([api.getBasicReport(month.id), api.getClosureReview(month.id)]);
      if (currentRequest !== requestId.current) return;

      setState({
        status: "ready",
        month,
        report: reportResult.status === "fulfilled" ? reportResult.value : undefined,
        review: reviewResult.status === "fulfilled" ? reviewResult.value : undefined,
      });
    } catch {
      if (currentRequest === requestId.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return { retry: () => void load(), viewModel: buildCommandCenterViewModel(state) };
}
