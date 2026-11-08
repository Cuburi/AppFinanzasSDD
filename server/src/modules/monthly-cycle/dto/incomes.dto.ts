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
    throw new Error("Se requieren los datos del ingreso mensual.");
  }

  const rawPayload = payload as {
    sourceName?: unknown;
    amount?: unknown;
    receivedAt?: unknown;
    notes?: unknown;
  };

  return {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    sourceName: readNonEmptyString(rawPayload.sourceName, "Origen del ingreso"),
    amount: readPositiveAmount(rawPayload.amount, "Monto del ingreso"),
    receivedAt: readIsoDateString(rawPayload.receivedAt, "Fecha de recepción del ingreso"),
    notes: readOptionalString(rawPayload.notes),
  };
};

export const parseUpdateMonthlyIncomeInput = (monthId: string, incomeId: string, payload: unknown): UpdateMonthlyIncomeInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos del ingreso mensual.");
  }

  const rawPayload = payload as {
    sourceName?: unknown;
    amount?: unknown;
    receivedAt?: unknown;
    notes?: unknown;
  };
  const input: UpdateMonthlyIncomeInput = {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    incomeId: readNonEmptyString(incomeId, "Identificador del ingreso"),
  };

  if (rawPayload.sourceName !== undefined) {
    input.sourceName = readNonEmptyString(rawPayload.sourceName, "Origen del ingreso");
  }

  if (rawPayload.amount !== undefined) {
    input.amount = readPositiveAmount(rawPayload.amount, "Monto del ingreso");
  }

  if (rawPayload.receivedAt !== undefined) {
    input.receivedAt = readIsoDateString(rawPayload.receivedAt, "Fecha de recepción del ingreso");
  }

  if (rawPayload.notes !== undefined) {
    input.notes = readOptionalString(rawPayload.notes);
  }

  return input;
};
