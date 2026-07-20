import { api } from "../../../../lib/api";
import type { Month } from "../../../../types";

export type OpenMonthInput = { year: number; month: number };

export type DashboardApi = {
  getActiveMonth: () => Promise<Month | null>;
  openMonth: (input: OpenMonthInput) => Promise<Month>;
};

export const dashboardApi: DashboardApi = {
  getActiveMonth: () => api.getActiveMonth(),
  openMonth: (input) => api.openMonth(input),
};
