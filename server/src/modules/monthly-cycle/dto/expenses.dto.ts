import { PaymentMethod } from "../../../lib/prisma-client.js";

import { readIsoDateString, readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

export type RecordExpenseInput = {
  monthId: string;
  sourceSubcategoryId: string;
  amount: number;
  description?: string | null;
  occurredAt: string;
  paymentMethod: PaymentMethod;
};

const readPaymentMethod = (value: unknown): PaymentMethod => {
  if (value === PaymentMethod.CASH || value === PaymentMethod.NON_CASH) {
    return value;
  }

  throw new Error("Payment method must be CASH or NON_CASH.");
};

export const parseRecordExpenseInput = (monthId: string, payload: unknown): RecordExpenseInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expense payload is required.");
  }

  const rawPayload = payload as { sourceSubcategoryId?: unknown; amount?: unknown; description?: unknown; occurredAt?: unknown; paymentMethod?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    sourceSubcategoryId: readNonEmptyString(rawPayload.sourceSubcategoryId, "Source subcategory"),
    amount: readPositiveAmount(rawPayload.amount, "Expense amount"),
    description: readOptionalString(rawPayload.description),
    occurredAt: readIsoDateString(rawPayload.occurredAt, "Expense date"),
    paymentMethod: readPaymentMethod(rawPayload.paymentMethod),
  };
};
