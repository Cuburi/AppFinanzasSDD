import type { Month } from "../../../../types";

export type DashboardSupportSource = "report" | "closure-review";
export type DashboardOpenMonthInput = { year: number; month: number };

export type DashboardAction =
  | { kind: "none" }
  | { kind: "open-month" }
  | { kind: "open-next-month" }
  | { kind: "retry-authority" }
  | { kind: "retry-open-month"; input: DashboardOpenMonthInput }
  | { kind: "retry-support"; source: DashboardSupportSource };

export type DashboardViewModel = {
  lifecycle: "loading" | "unopened" | "active" | "closed" | "blocking" | "degraded";
  month?: Month;
  error?: string;
  supportFailures?: DashboardSupportSource[];
  action: DashboardAction;
};

export type DashboardModelInput =
  | { status: "loading" }
  | { status: "ready"; month: Month | null }
  | { status: "blocking"; month?: Month; error?: string; retryInput?: DashboardOpenMonthInput }
  | { status: "degraded"; month: Month; source: DashboardSupportSource };
