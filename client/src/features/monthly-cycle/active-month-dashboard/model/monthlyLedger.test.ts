import { describe, expect, it } from "vitest";

import { buildMonthlyLedgerViewModel, validateMonthlyLedger } from "./monthlyLedger";

const entry = (key: string, eventType = "CASH_EXPENSE", occurredAt = "2026-08-01T12:00:00.000Z", system = false) => ({
  entryKey: key, occurredAt, eventType, direction: "OUTFLOW", source: { kind: "CASH", id: null }, destination: { kind: "EXPENSE", id: "expense-1" }, amount: 20,
  balanceEffects: { availableMoney: -20, cashBalance: -20, subcategoryAvailable: -20, pocketBalance: 0 }, metadata: { description: null, paymentMethod: "CASH", isSystemEvent: system },
});

describe("monthly ledger validation", () => {
  it("rejects malformed replacements while accepting unknown taxonomy as read-only data", () => {
    expect(() => validateMonthlyLedger({ monthId: "month-1", status: "ACTIVE", entries: [entry("bad", "ALIEN_EVENT")] })).not.toThrow();
    expect(() => validateMonthlyLedger({ monthId: "month-1", status: "ACTIVE", entries: [{ entryKey: "bad" }] })).toThrow("Invalid monthly ledger response.");
  });

  it("rejects source and destination kinds outside their distinct ledger contracts", () => {
    expect(() => validateMonthlyLedger({ monthId: "month-1", status: "ACTIVE", entries: [{ ...entry("bad-source"), source: { kind: "EXPENSE", id: "expense-1" } }] })).toThrow("Invalid monthly ledger response.");
    expect(() => validateMonthlyLedger({ monthId: "month-1", status: "ACTIVE", entries: [{ ...entry("bad-destination"), destination: { kind: "EXTERNAL", id: null } }] })).toThrow("Invalid monthly ledger response.");
  });

  it("preserves canonical rows and makes unknown event taxonomy safely read-only", () => {
    const ledger = validateMonthlyLedger({ monthId: "month-1", status: "ACTIVE", entries: [entry("known"), entry("unknown", "ALIEN_EVENT")] });

    expect(buildMonthlyLedgerViewModel(ledger).days[0].items.map((item) => item.kind === "entry" ? [item.entry.entryKey, item.entry.typeLabel, item.entry.isReadOnly] : item.entries.length)).toEqual([
      ["known", "Expense", false], ["unknown", "Unknown event", true],
    ]);
  });
});

describe("monthly ledger timeline", () => {
  it("groups entries by their local calendar day without sorting backend order", () => {
    const ledger = validateMonthlyLedger({ monthId: "month-1", status: "ACTIVE", entries: [
      entry("new", "CASH_EXPENSE", "2026-08-02T12:00:00.000Z"), entry("old", "MONTHLY_INCOME", "2026-08-01T12:00:00.000Z"),
    ] });
    const days = buildMonthlyLedgerViewModel(ledger).days;

    expect(days.flatMap((day) => day.items).map((item) => item.kind === "entry" ? item.entry.entryKey : item.entries[0].entryKey)).toEqual(["new", "old"]);
    expect(days.map((day) => day.key)).toEqual(["2026-08-02", "2026-08-01"]);
  });

  it("segments maximal contiguous system runs without moving A/B/C interleaving", () => {
    const ledger = validateMonthlyLedger({ monthId: "month-1", status: "ACTIVE", entries: [
      entry("A", "CASH_CARRYOVER", "2026-08-01T12:00:00.000Z", true), entry("B"), entry("C", "CLOSURE_SURPLUS", "2026-08-01T11:00:00.000Z", true), entry("D", "DEFICIT_RESOLUTION", "2026-08-01T10:00:00.000Z", true),
    ] });
    const items = buildMonthlyLedgerViewModel(ledger).days[0].items;

    expect(items.map((item) => item.kind === "system-run" ? item.entries.map((entry) => entry.entryKey).join("") : item.entry.entryKey)).toEqual(["A", "B", "CD"]);
  });
});
