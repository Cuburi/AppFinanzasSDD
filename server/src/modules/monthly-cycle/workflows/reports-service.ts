import type { BasicMonthlyReportView } from "../dto/index.js";
import { mapBasicReport } from "../mappers/report-mappers.js";
import { readMonthById } from "../shared/month-queries.js";
import type { MonthlyCycleDb } from "../shared/service-types.js";

export const createReportsService = (db: MonthlyCycleDb) => ({
  async getBasicReport(monthId: string): Promise<BasicMonthlyReportView> {
    const month = await readMonthById(db, monthId);

    return mapBasicReport(month);
  },
});
