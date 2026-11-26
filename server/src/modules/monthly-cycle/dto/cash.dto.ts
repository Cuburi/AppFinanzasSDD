import { readIsoDateString, readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

export type WithdrawCashInput = {
  monthId: string;
  amount: number;
  occurredAt: string;
  description?: string | null;
};

export type CashSummaryInput = {
  monthId: string;
};

export const parseWithdrawCashInput = (monthId: string, payload: unknown): WithdrawCashInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Se requieren los datos del retiro de efectivo.");
  }

  const rawPayload = payload as { amount?: unknown; occurredAt?: unknown; description?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Identificador del mes"),
    amount: readPositiveAmount(rawPayload.amount, "Monto del retiro de efectivo"),
    occurredAt: readIsoDateString(rawPayload.occurredAt, "Fecha del retiro de efectivo"),
    description: readOptionalString(rawPayload.description),
  };
};

export const parseCashSummaryInput = (monthId: string): CashSummaryInput => ({
  monthId: readNonEmptyString(monthId, "Identificador del mes"),
});
