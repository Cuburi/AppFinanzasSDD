import { readIsoDateString, readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

export type MonthlyIncomeView = {
  id: string;
  monthId: string;
  sourceName: string;
  amount: number;
  receivedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMonthlyIncomeInput = {
  monthId: string;
  sourceName: string;
  amount: number;
  receivedAt: string;
  notes?: string | null;
};

export type UpdateMonthlyIncomeInput = {
  monthId: string;
  incomeId: string;
  sourceName?: string;
  amount?: number;
  receivedAt?: string;
  notes?: string | null;
};

export const parseCreateMonthlyIncomeInput = (monthId: string, payload: unknown): CreateMonthlyIncomeInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Monthly income payload is required.");
  }

  const rawPayload = payload as {
    sourceName?: unknown;
    amount?: unknown;
    receivedAt?: unknown;
    notes?: unknown;
  };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    sourceName: readNonEmptyString(rawPayload.sourceName, "Income source"),
    amount: readPositiveAmount(rawPayload.amount, "Income amount"),
    receivedAt: readIsoDateString(rawPayload.receivedAt, "Income received date"),
    notes: readOptionalString(rawPayload.notes),
  };
};

export const parseUpdateMonthlyIncomeInput = (monthId: string, incomeId: string, payload: unknown): UpdateMonthlyIncomeInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Monthly income payload is required.");
  }

  const rawPayload = payload as {
    sourceName?: unknown;
    amount?: unknown;
    receivedAt?: unknown;
    notes?: unknown;
  };
  const input: UpdateMonthlyIncomeInput = {
    monthId: readNonEmptyString(monthId, "Month id"),
    incomeId: readNonEmptyString(incomeId, "Income id"),
  };

  if (rawPayload.sourceName !== undefined) {
    input.sourceName = readNonEmptyString(rawPayload.sourceName, "Income source");
  }

  if (rawPayload.amount !== undefined) {
    input.amount = readPositiveAmount(rawPayload.amount, "Income amount");
  }

  if (rawPayload.receivedAt !== undefined) {
    input.receivedAt = readIsoDateString(rawPayload.receivedAt, "Income received date");
  }

  if (rawPayload.notes !== undefined) {
    input.notes = readOptionalString(rawPayload.notes);
  }

  return input;
};
