import type { BasicMonthlyReportView } from "../../dto/index.js";
import { mapBasicReport } from "../../mappers/report-mappers.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const REPORTS_USE_CASE_NAMES = ["getBasicReport"] as const;

export type ReportsUseCases = {
  getBasicReport(monthId: string): Promise<BasicMonthlyReportView>;
};

export const createReportsUseCases = (ports: MonthlyCyclePorts): ReportsUseCases => ({
  async getBasicReport(monthId) {
    const month = await ports.months.findById(monthId);

    return mapBasicReport(month);
  },
});
