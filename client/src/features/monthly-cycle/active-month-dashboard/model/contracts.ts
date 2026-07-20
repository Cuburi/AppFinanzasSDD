import type { Month } from "../../../../types";

export type DashboardSupportSource = "report" | "closure-review";

export type DashboardAction =
  | { kind: "none" }
  | { kind: "open-month" }
  | { kind: "open-next-month" }
  | { kind: "retry-authority" }
  | { kind: "retry-support"; source: DashboardSupportSource };

export type DashboardViewModel = {
  lifecycle: "loading" | "unopened" | "active" | "closed" | "blocking" | "degraded";
  month?: Month;
  action: DashboardAction;
};

export type DashboardModelInput =
  | { status: "loading" }
  | { status: "ready"; month: Month | null }
  | { status: "blocking"; month?: Month }
  | { status: "degraded"; month: Month; source: DashboardSupportSource };
