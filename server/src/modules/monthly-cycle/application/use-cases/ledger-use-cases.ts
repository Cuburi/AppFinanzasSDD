import type { MonthlyLedgerQueryInput, MonthlyLedgerView } from "../../dto/index.js";
import { mapMonthlyLedger } from "../../mappers/ledger-mappers.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const LEDGER_USE_CASE_NAMES = ["getMonthlyLedger"] as const;

export type LedgerUseCases = { getMonthlyLedger(input: MonthlyLedgerQueryInput): Promise<MonthlyLedgerView> };

export const createLedgerUseCases = (ports: MonthlyCyclePorts): LedgerUseCases => ({
  async getMonthlyLedger(input) {
    return mapMonthlyLedger(await ports.ledger.read(input.monthId), input.includeSystemEvents);
  },
});
