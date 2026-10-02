import { PaymentMethod } from "../application/monthly-cycle-types.js";

import { readIsoDateString, readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

export type RecordExpenseInput = {
  monthId: string;
  sourceSubcategoryId: string | null;
  amount: number;
  description?: string | null;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  creditCardId?: string | null;
};

export type UpdateExpenseInput = RecordExpenseInput & {
  expenseId: string;
};

export type DeleteExpenseInput = {
  monthId: string;
  expenseId: string;
};

export type ExpenseHistoryQueryInput = {
  monthId: string;
  from?: string;
  to?: string;
  paymentMethod?: PaymentMethod;
  subcategoryId?: string;
  creditCardId?: string;
  classification?: "UNCATEGORIZED";
};

const readPaymentMethod = (value: unknown): PaymentMethod => {
  if (value === PaymentMethod.CASH || value === PaymentMethod.NON_CASH) {
    return value;
  }

  throw new Error("Payment method must be CASH or NON_CASH.");
};

const readExpenseSubcategoryId = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return readNonEmptyString(value, "Source subcategory");
};

export const parseRecordExpenseInput = (monthId: string, payload: unknown): RecordExpenseInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expense payload is required.");
  }

  const rawPayload = payload as { sourceSubcategoryId?: unknown; amount?: unknown; description?: unknown; occurredAt?: unknown; paymentMethod?: unknown; creditCardId?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    sourceSubcategoryId: readExpenseSubcategoryId(rawPayload.sourceSubcategoryId),
    amount: readPositiveAmount(rawPayload.amount, "Expense amount"),
    description: readOptionalString(rawPayload.description),
    occurredAt: readIsoDateString(rawPayload.occurredAt, "Expense date"),
    paymentMethod: readPaymentMethod(rawPayload.paymentMethod),
    ...(rawPayload.creditCardId === undefined ? {} : { creditCardId: readOptionalString(rawPayload.creditCardId) }),
  };
};

export const parseUpdateExpenseInput = (monthId: string, expenseId: string, payload: unknown): UpdateExpenseInput => {
  const recordInput = parseRecordExpenseInput(monthId, payload);

  return {
    ...recordInput,
    expenseId: readNonEmptyString(expenseId, "Expense id"),
  };
};

export const parseDeleteExpenseInput = (monthId: string, expenseId: string): DeleteExpenseInput => ({
  monthId: readNonEmptyString(monthId, "Month id"),
  expenseId: readNonEmptyString(expenseId, "Expense id"),
});

export const parseExpenseHistoryQueryInput = (monthId: string, query: unknown): ExpenseHistoryQueryInput => {
  const rawQuery = query && typeof query === "object" ? (query as Record<string, unknown>) : {};
  const paymentMethod = rawQuery.paymentMethod === undefined ? undefined : readPaymentMethod(rawQuery.paymentMethod);

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    from: rawQuery.from === undefined ? undefined : readIsoDateString(rawQuery.from, "From date"),
    to: rawQuery.to === undefined ? undefined : readIsoDateString(rawQuery.to, "To date"),
    paymentMethod,
    subcategoryId: rawQuery.subcategoryId === undefined ? undefined : readNonEmptyString(rawQuery.subcategoryId, "Subcategory"),
    classification: rawQuery.classification === undefined ? undefined : readUncategorizedClassification(rawQuery.classification),
    ...(rawQuery.creditCardId === undefined ? {} : { creditCardId: readNonEmptyString(rawQuery.creditCardId, "Credit card") }),
  };
};

const readUncategorizedClassification = (value: unknown): "UNCATEGORIZED" => {
  if (value === "UNCATEGORIZED") return value;
  throw new Error("Classification must be UNCATEGORIZED.");
};
