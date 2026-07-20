import type { DashboardModelInput, DashboardViewModel } from "./contracts";

export function buildDashboardViewModel(input: DashboardModelInput): DashboardViewModel {
  if (input.status === "loading") return { lifecycle: "loading", action: { kind: "none" } };
  if (input.status === "blocking") return { lifecycle: "blocking", month: input.month, action: { kind: "retry-authority" } };
  if (input.status === "degraded") return { lifecycle: "degraded", month: input.month, action: { kind: "retry-support", source: input.source } };
  if (!input.month) return { lifecycle: "unopened", action: { kind: "open-month" } };
  if (input.month.status === "CLOSED") return { lifecycle: "closed", month: input.month, action: { kind: "open-next-month" } };

  return { lifecycle: "active", month: input.month, action: { kind: "none" } };
}
