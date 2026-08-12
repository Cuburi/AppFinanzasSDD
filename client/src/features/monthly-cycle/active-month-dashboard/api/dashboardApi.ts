import { api } from "../../../../lib/api";
import type { BasicMonthlyReport, ClosureReview, Month } from "../../../../types";

export type OpenMonthInput = { year: number; month: number };

export type DashboardApi = {
  getActiveMonth: () => Promise<Month | null>;
  getBasicReport: (monthId: string) => Promise<BasicMonthlyReport>;
  getClosureReview: (monthId: string) => Promise<ClosureReview>;
  openMonth: (input: OpenMonthInput) => Promise<Month>;
};

export const dashboardApi: DashboardApi = {
  getActiveMonth: () => api.getActiveMonth(),
  getBasicReport: (monthId) => api.getBasicReport(monthId),
  getClosureReview: (monthId) => api.getClosureReview(monthId),
  openMonth: (input) => api.openMonth(input),
};
