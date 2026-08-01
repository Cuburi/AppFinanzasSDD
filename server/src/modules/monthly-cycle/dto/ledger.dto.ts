import { SemanticError } from "../shared/service-errors.js";
import type { MonthView } from "./month.dto.js";

export type MonthlyLedgerQueryInput = { monthId: string; includeSystemEvents: boolean };

export type MonthlyLedgerEntryView = {
  entryKey: string;
  occurredAt: string;
  eventType: "MONTHLY_INCOME" | "CASH_EXPENSE" | "NON_CASH_EXPENSE" | "CASH_WITHDRAWAL" | "POCKET_DEPOSIT_FROM_SUBCATEGORY" | "POCKET_DEPOSIT_FROM_AVAILABLE" | "CASH_CARRYOVER" | "CLOSURE_SURPLUS" | "DEFICIT_RESOLUTION";
  direction: "INFLOW" | "OUTFLOW" | "TRANSFER";
  source: { kind: "MONTH" | "SUBCATEGORY" | "POCKET" | "CASH" | "EXTERNAL"; id: string | null };
  destination: { kind: "MONTH" | "SUBCATEGORY" | "POCKET" | "CASH" | "EXPENSE"; id: string | null };
  amount: number;
  balanceEffects: { availableMoney: number; cashBalance: number; subcategoryAvailable: number; pocketBalance: number };
  metadata: { description: string | null; paymentMethod: "CASH" | "NON_CASH" | null; isSystemEvent: boolean };
};

export type MonthlyLedgerView = { monthId: string; status: MonthView["status"]; entries: MonthlyLedgerEntryView[] };

export const parseMonthlyLedgerQueryInput = (monthId: unknown, query: unknown): MonthlyLedgerQueryInput => {
  const normalizedMonthId = typeof monthId === "string" ? monthId.trim() : "";
  if (!normalizedMonthId) {
    throw new SemanticError("INVALID_QUERY", 400, "Month id is required.");
  }

  const includeSystemEvents = (query as { includeSystemEvents?: unknown } | undefined)?.includeSystemEvents;
  if (includeSystemEvents !== undefined && includeSystemEvents !== "true" && includeSystemEvents !== "false") {
    throw new SemanticError("INVALID_QUERY", 400, "includeSystemEvents must be true or false.");
  }

  return { monthId: normalizedMonthId, includeSystemEvents: includeSystemEvents === "true" };
};
