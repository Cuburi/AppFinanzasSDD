import { readIsoDateString, readNonEmptyString, readOptionalString, readPositiveAmount } from "./shared-parsers.js";

export type WithdrawCashInput = {
  monthId: string;
  amount: number;
  occurredAt: string;
  description?: string | null;
};

<<<<<<< HEAD
export type CashSummaryInput = {
  monthId: string;
};

=======
>>>>>>> master
export const parseWithdrawCashInput = (monthId: string, payload: unknown): WithdrawCashInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Cash withdrawal payload is required.");
  }

  const rawPayload = payload as { amount?: unknown; occurredAt?: unknown; description?: unknown };

  return {
    monthId: readNonEmptyString(monthId, "Month id"),
    amount: readPositiveAmount(rawPayload.amount, "Cash withdrawal amount"),
    occurredAt: readIsoDateString(rawPayload.occurredAt, "Cash withdrawal date"),
    description: readOptionalString(rawPayload.description),
  };
};
<<<<<<< HEAD

export const parseCashSummaryInput = (monthId: string): CashSummaryInput => ({
  monthId: readNonEmptyString(monthId, "Month id"),
});
=======
>>>>>>> master
