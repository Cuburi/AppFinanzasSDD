import type { ExpenseHistoryQueryInput, ExpenseHistoryView } from "../../dto/index.js";
import { mapExpenseHistory } from "../../mappers/monthly-cycle-mappers.js";
import { findMonthSubcategory } from "../../shared/month-queries.js";
import { DomainError } from "../../shared/service-errors.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const EXPENSE_HISTORY_USE_CASE_NAMES = ["listExpenseHistory"] as const;

export type ExpenseHistoryUseCases = {
  listExpenseHistory(input: ExpenseHistoryQueryInput): Promise<ExpenseHistoryView>;
};

export const createExpenseHistoryUseCases = (ports: MonthlyCyclePorts): ExpenseHistoryUseCases => ({
  async listExpenseHistory(input) {
    const month = await ports.months.findById(input.monthId);
    if (input.subcategoryId && !findMonthSubcategory(month, input.subcategoryId)) {
      throw new DomainError(404, "Subcategory was not found in this month.");
    }

    const movements = await ports.movements.findExpenseHistory(input);

    return mapExpenseHistory(month, movements);
  },
});
