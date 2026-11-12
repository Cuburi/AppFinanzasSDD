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

  throw new Error("El medio de pago debe ser CASH o NON_CASH.");
};

const readExpenseSubcategoryId = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return readNonEmptyString(value, "Subcategoría de origen");
};

export const parseRecordExpenseInput = (monthId: string, payload: unknown): RecordExpenseInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos del gasto.");
  }

  const rawPayload = payload as { sourceSubcategoryId?: unknown; amount?: unknown; description?: unknown; occurredAt?: unknown; paymentMethod?: unknown; creditCardId?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    sourceSubcategoryId: readExpenseSubcategoryId(rawPayload.sourceSubcategoryId),
    amount: readPositiveAmount(rawPayload.amount, "Monto del gasto"),
    description: readOptionalString(rawPayload.description),
    occurredAt: readIsoDateString(rawPayload.occurredAt, "Fecha del gasto"),
    paymentMethod: readPaymentMethod(rawPayload.paymentMethod),
    ...(rawPayload.creditCardId === undefined ? {} : { creditCardId: readOptionalString(rawPayload.creditCardId) }),
  };
};

export const parseUpdateExpenseInput = (monthId: string, expenseId: string, payload: unknown): UpdateExpenseInput => {
  const recordInput = parseRecordExpenseInput(monthId, payload);

  return {
    ...recordInput,
    expenseId: readNonEmptyString(expenseId, "Identificador del gasto"),
  };
};

export const parseDeleteExpenseInput = (monthId: string, expenseId: string): DeleteExpenseInput => ({
  monthId: readNonEmptyString(monthId, "Identificador del mes"),
  expenseId: readNonEmptyString(expenseId, "Identificador del gasto"),
});

export const parseExpenseHistoryQueryInput = (monthId: string, query: unknown): ExpenseHistoryQueryInput => {
  const rawQuery = query && typeof query === "object" ? (query as Record<string, unknown>) : {};
  const paymentMethod = rawQuery.paymentMethod === undefined ? undefined : readPaymentMethod(rawQuery.paymentMethod);

  return {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    from: rawQuery.from === undefined ? undefined : readIsoDateString(rawQuery.from, "Fecha inicial"),
    to: rawQuery.to === undefined ? undefined : readIsoDateString(rawQuery.to, "Fecha final"),
    paymentMethod,
    subcategoryId: rawQuery.subcategoryId === undefined ? undefined : readNonEmptyString(rawQuery.subcategoryId, "Subcategoría"),
    classification: rawQuery.classification === undefined ? undefined : readUncategorizedClassification(rawQuery.classification),
    ...(rawQuery.creditCardId === undefined ? {} : { creditCardId: readNonEmptyString(rawQuery.creditCardId, "Tarjeta de crédito") }),
  };
};

const readUncategorizedClassification = (value: unknown): "UNCATEGORIZED" => {
  if (value === "UNCATEGORIZED") return value;
  throw new Error("La clasificación debe ser UNCATEGORIZED.");
};
