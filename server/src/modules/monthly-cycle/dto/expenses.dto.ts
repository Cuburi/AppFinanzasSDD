import { readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

export type RecordExpenseInput = {
  monthId: string;
  sourceSubcategoryId: string;
  amount: number;
  description?: string | null;
};

export const parseRecordExpenseInput = (monthId: string, payload: unknown): RecordExpenseInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expense payload is required.");
  }

  const rawPayload = payload as { sourceSubcategoryId?: unknown; amount?: unknown; description?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    sourceSubcategoryId: readNonEmptyString(rawPayload.sourceSubcategoryId, "Source subcategory"),
    amount: readPositiveAmount(rawPayload.amount, "Expense amount"),
    description: readOptionalString(rawPayload.description),
  };
};
