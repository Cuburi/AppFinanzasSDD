type SourceEntity = { kind: "MONTH" | "SUBCATEGORY" | "POCKET" | "CASH" | "EXTERNAL"; id: string | null };
type DestinationEntity = { kind: "MONTH" | "SUBCATEGORY" | "POCKET" | "CASH" | "EXPENSE"; id: string | null };
type Effects = { availableMoney: number; cashBalance: number; subcategoryAvailable: number; pocketBalance: number };
export type MonthlyLedgerEntry = { entryKey: string; occurredAt: string; eventType: string; direction: "INFLOW" | "OUTFLOW" | "TRANSFER"; source: SourceEntity; destination: DestinationEntity; amount: number; balanceEffects: Effects; metadata: { description: string | null; paymentMethod: "CASH" | "NON_CASH" | null; isSystemEvent: boolean } };
export type MonthlyLedger = { monthId: string; status: "ACTIVE" | "CLOSED"; entries: MonthlyLedgerEntry[] };
export type LedgerViewEntry = MonthlyLedgerEntry & { typeLabel: string; isReadOnly: boolean };
export type LedgerDay = { key: string; items: ({ kind: "entry"; entry: LedgerViewEntry } | { kind: "system-run"; entries: LedgerViewEntry[] })[] };

const knownTypes: Record<string, string> = { MONTHLY_INCOME: "Income", CASH_EXPENSE: "Expense", NON_CASH_EXPENSE: "Expense", CASH_WITHDRAWAL: "Cash withdrawal", POCKET_DEPOSIT_FROM_SUBCATEGORY: "Pocket deposit", POCKET_DEPOSIT_FROM_AVAILABLE: "Pocket deposit", CASH_CARRYOVER: "Cash carryover", CLOSURE_SURPLUS: "Closure surplus", DEFICIT_RESOLUTION: "Deficit resolution" };
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const sourceEntity = (value: unknown): value is SourceEntity => isObject(value) && ["MONTH", "SUBCATEGORY", "POCKET", "CASH", "EXTERNAL"].includes(String(value.kind)) && (typeof value.id === "string" || value.id === null);
const destinationEntity = (value: unknown): value is DestinationEntity => isObject(value) && ["MONTH", "SUBCATEGORY", "POCKET", "CASH", "EXPENSE"].includes(String(value.kind)) && (typeof value.id === "string" || value.id === null);
const effects = (value: unknown): value is Effects => isObject(value) && [value.availableMoney, value.cashBalance, value.subcategoryAvailable, value.pocketBalance].every((effect) => typeof effect === "number");
const invalid = () => { throw new Error("Invalid monthly ledger response."); };

export function validateMonthlyLedger(value: unknown): MonthlyLedger {
  if (!isObject(value) || typeof value.monthId !== "string" || !["ACTIVE", "CLOSED"].includes(String(value.status)) || !Array.isArray(value.entries)) return invalid();
  const entries = value.entries.map((item): MonthlyLedgerEntry => {
    if (!isObject(item) || typeof item.entryKey !== "string" || typeof item.occurredAt !== "string" || Number.isNaN(Date.parse(item.occurredAt)) || typeof item.eventType !== "string" || !["INFLOW", "OUTFLOW", "TRANSFER"].includes(String(item.direction)) || !sourceEntity(item.source) || !destinationEntity(item.destination) || typeof item.amount !== "number" || !effects(item.balanceEffects) || !isObject(item.metadata) || (typeof item.metadata.description !== "string" && item.metadata.description !== null) || !["CASH", "NON_CASH", null].includes(item.metadata.paymentMethod as null) || typeof item.metadata.isSystemEvent !== "boolean") return invalid();
    return item as MonthlyLedgerEntry;
  });
  return { monthId: value.monthId, status: value.status as MonthlyLedger["status"], entries };
}

const localDay = (occurredAt: string) => { const date = new Date(occurredAt); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const viewEntry = (entry: MonthlyLedgerEntry): LedgerViewEntry => ({ ...entry, typeLabel: knownTypes[entry.eventType] ?? "Unknown event", isReadOnly: entry.metadata.isSystemEvent || !(entry.eventType in knownTypes) || !["MONTHLY_INCOME", "CASH_EXPENSE", "NON_CASH_EXPENSE"].includes(entry.eventType) });

export function buildMonthlyLedgerViewModel(ledger: MonthlyLedger): { days: LedgerDay[] } {
  const days: LedgerDay[] = [];
  for (const sourceEntry of ledger.entries) {
    const entry = viewEntry(sourceEntry); const key = localDay(entry.occurredAt); let day = days.at(-1);
    if (!day || day.key !== key) { day = { key, items: [] }; days.push(day); }
    const prior = day.items.at(-1);
    if (entry.metadata.isSystemEvent && prior?.kind === "system-run") prior.entries.push(entry);
    else if (entry.metadata.isSystemEvent) day.items.push({ kind: "system-run", entries: [entry] });
    else day.items.push({ kind: "entry", entry });
  }
  return { days };
}
