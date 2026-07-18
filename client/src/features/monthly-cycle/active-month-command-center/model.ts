import type { BasicMonthlyReport, ClosureReview, Month } from "../../../types";

export type Metric =
  | { status: "available"; value: number }
  | { status: "unavailable"; reason: "loading" | "request-failed" | "report-unavailable" | "report-month-mismatch" | "report-invalid" };

export type CommandCenterActionKind = "none" | "open-month" | "retry-summary" | "review-closure" | "record-income" | "record-expense" | "close-month";

export type CommandCenterAction = {
  kind: CommandCenterActionKind;
  completionClaim: false;
  target: string | null;
  explanation: string;
};

export type CommandCenterViewModel = {
  lifecycle: "loading" | "error" | "unopened" | "active" | "closed";
  detail: "no-movement" | "risk" | "healthy" | "unavailable" | null;
  metrics: {
    available: Metric;
    spent: Metric;
    planned: Metric;
    remaining: Metric;
  };
  action: CommandCenterAction;
};

export type CommandCenterInput =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; month: Month | null; report?: BasicMonthlyReport; review?: ClosureReview };

const unavailableMetrics = (reason: Extract<Metric, { status: "unavailable" }>["reason"]): CommandCenterViewModel["metrics"] => ({
  available: { status: "unavailable", reason },
  spent: { status: "unavailable", reason },
  planned: { status: "unavailable", reason },
  remaining: { status: "unavailable", reason },
});

const action = (kind: CommandCenterActionKind, target: string | null, explanation: string): CommandCenterAction => ({
  kind,
  completionClaim: false,
  target,
  explanation,
});

const noAction = () => action("none", null, "No additional action is required.");

const reportValidationFailure = (month: Month, report: BasicMonthlyReport | undefined): Extract<Metric, { status: "unavailable" }>["reason"] | null => {
  if (!report) return "report-unavailable";
  if (report.summary.monthId !== month.id) return "report-month-mismatch";

  const values = [
    report.summary.monthlyIncomeTotal,
    report.summary.availableMoney,
    report.summary.totalPlanned,
    report.summary.totalSpentCash,
    report.summary.totalSpentNonCash,
  ];

  return values.every(Number.isFinite) ? null : "report-invalid";
};

const reviewIsValidForMonth = (month: Month, review: ClosureReview | undefined) =>
  review !== undefined && review.monthId === month.id && Number.isFinite(review.availableMoney);

const hasClosureRisk = (report: BasicMonthlyReport, review: ClosureReview) =>
  report.summary.availableMoney < 0 ||
  report.deficitSubcategories.length > 0 ||
  review.availableMoneyBlocker === "DEFICIT" ||
  review.pendingDeficits.length > 0 ||
  review.pendingSurpluses.length > 0;

export function buildCommandCenterViewModel(input: CommandCenterInput): CommandCenterViewModel {
  if (input.status === "loading") {
    return { lifecycle: "loading", detail: null, metrics: unavailableMetrics("loading"), action: noAction() };
  }

  if (input.status === "error") {
    return { lifecycle: "error", detail: null, metrics: unavailableMetrics("request-failed"), action: action("retry-summary", null, "Retry loading the month summary.") };
  }

  if (!input.month) {
    return {
      lifecycle: "unopened",
      detail: null,
      metrics: unavailableMetrics("report-unavailable"),
      action: action("open-month", "#month-setup", "Open a month before recording activity."),
    };
  }

  const { month, report, review } = input;
  const invalidReport = reportValidationFailure(month, report);
  if (invalidReport || !report) {
    const unavailableReason = invalidReport ?? "report-unavailable";

    return {
      lifecycle: month.status === "CLOSED" ? "closed" : "active",
      detail: "unavailable",
      metrics: unavailableMetrics(unavailableReason),
      action: action("retry-summary", null, "Authoritative financial data is unavailable. Retry the summary."),
    };
  }

  const metrics = {
    available: { status: "available" as const, value: report.summary.availableMoney },
    spent: { status: "available" as const, value: report.summary.totalSpentCash + report.summary.totalSpentNonCash },
    planned: { status: "available" as const, value: report.summary.totalPlanned },
    remaining: { status: "available" as const, value: report.summary.availableMoney },
  };

  if (month.status === "CLOSED") {
    return { lifecycle: "closed", detail: "healthy", metrics, action: noAction() };
  }

  if (!reviewIsValidForMonth(month, review) || !review) {
    return {
      lifecycle: "active",
      detail: "unavailable",
      metrics,
      action: action("retry-summary", null, "Closure review is unavailable. Retry the summary."),
    };
  }

  if (hasClosureRisk(report, review)) {
    return {
      lifecycle: "active",
      detail: "risk",
      metrics,
      action: action("review-closure", "/close-month", "Review the blocking month balance before continuing."),
    };
  }

  if (report.summary.monthlyIncomeTotal <= 0) {
    return {
      lifecycle: "active",
      detail: "no-movement",
      metrics,
      action: action("record-income", "#monthly-income-workflow", "Record income for this month."),
    };
  }

  if (metrics.spent.value === 0) {
    return {
      lifecycle: "active",
      detail: "no-movement",
      metrics,
      action: action("record-expense", "#expense-workflow", "Record the first expense for this month."),
    };
  }

  if (review.canClose) {
    return { lifecycle: "active", detail: "healthy", metrics, action: action("close-month", "/close-month", "Review the month before closing it.") };
  }

  return { lifecycle: "active", detail: "healthy", metrics, action: noAction() };
}
