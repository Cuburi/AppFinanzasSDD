import { MovementType } from "../../../lib/prisma-client.js";

import type { ExpenseHistoryQueryInput, ExpenseHistoryView } from "../dto/index.js";
import { mapExpenseHistory } from "../mappers/monthly-cycle-mappers.js";
import { readMonthById } from "../shared/month-queries.js";
import type { MonthlyCycleDb } from "../shared/service-types.js";

export const createExpenseHistoryService = (db: MonthlyCycleDb) => ({
  async listExpenseHistory(input: ExpenseHistoryQueryInput): Promise<ExpenseHistoryView> {
    const month = await readMonthById(db, input.monthId);
    const movements = await db.movement.findMany({
      where: {
        monthId: input.monthId,
        type: MovementType.EXPENSE,
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
        ...(input.subcategoryId ? { sourceSubcategoryId: input.subcategoryId } : {}),
        ...(input.from || input.to
          ? {
              occurredAt: {
                ...(input.from ? { gte: new Date(input.from) } : {}),
                ...(input.to ? { lte: new Date(input.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: "desc" },
    });

    return mapExpenseHistory(month, movements);
  },
});
