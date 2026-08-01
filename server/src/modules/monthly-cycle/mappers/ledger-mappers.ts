import { MovementType, PaymentMethod } from "../application/monthly-cycle-types.js";
import type { MonthlyLedgerEntryView, MonthlyLedgerView } from "../dto/index.js";
import { decimalToNumber } from "../shared/money.js";
import type { MonthRecord } from "../shared/service-types.js";

type Entry = MonthlyLedgerEntryView;
type Movement = MonthRecord["movements"][number];
const entity = <T extends Entry["source"]["kind"] | Entry["destination"]["kind"]>(kind: T, id: string | null) => ({ kind, id });
const effects = (availableMoney: number, cashBalance: number, subcategoryAvailable: number, pocketBalance: number) => ({ availableMoney, cashBalance, subcategoryAvailable, pocketBalance });
const systemTypes = new Set<MovementType>([MovementType.CASH_CARRYOVER_IN, MovementType.SURPLUS_TO_POCKET_ON_CLOSE, MovementType.DEFICIT_COVER_FROM_SUBCATEGORY, MovementType.DEFICIT_COVER_FROM_POCKET]);
const ranks: Record<Entry["eventType"], number> = { MONTHLY_INCOME: 0, CASH_EXPENSE: 1, NON_CASH_EXPENSE: 2, CASH_WITHDRAWAL: 3, POCKET_DEPOSIT_FROM_SUBCATEGORY: 4, POCKET_DEPOSIT_FROM_AVAILABLE: 5, CASH_CARRYOVER: 6, CLOSURE_SURPLUS: 7, DEFICIT_RESOLUTION: 8 };

const mapMovement = (movement: Movement): Entry | null => {
  const amount = decimalToNumber(movement.amount);
  const base = { entryKey: movement.id ?? "", occurredAt: (movement.occurredAt ?? new Date(0)).toISOString(), amount, metadata: { description: movement.description ?? null, paymentMethod: movement.paymentMethod ?? null, isSystemEvent: systemTypes.has(movement.type) } };
  switch (movement.type) {
    case MovementType.EXPENSE:
      return movement.paymentMethod === PaymentMethod.CASH
        ? { ...base, eventType: "CASH_EXPENSE", direction: "OUTFLOW", source: entity("CASH", null), destination: entity("EXPENSE", movement.sourceSubcategoryId), balanceEffects: effects(0, -amount, -amount, 0) }
        : { ...base, eventType: "NON_CASH_EXPENSE", direction: "OUTFLOW", source: entity("SUBCATEGORY", movement.sourceSubcategoryId), destination: entity("EXPENSE", null), balanceEffects: effects(-amount, 0, -amount, 0) };
    case MovementType.CASH_WITHDRAWAL:
      return { ...base, eventType: "CASH_WITHDRAWAL", direction: "TRANSFER", source: entity("MONTH", movement.monthId ?? null), destination: entity("CASH", null), balanceEffects: effects(-amount, amount, 0, 0) };
    case MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY:
      return { ...base, eventType: "POCKET_DEPOSIT_FROM_SUBCATEGORY", direction: "TRANSFER", source: entity("SUBCATEGORY", movement.sourceSubcategoryId), destination: entity("POCKET", movement.targetPocketId), balanceEffects: effects(-amount, 0, -amount, amount) };
    case MovementType.POCKET_DEPOSIT_FROM_AVAILABLE:
      return { ...base, eventType: "POCKET_DEPOSIT_FROM_AVAILABLE", direction: "TRANSFER", source: entity("MONTH", movement.monthId ?? null), destination: entity("POCKET", movement.targetPocketId), balanceEffects: effects(-amount, 0, 0, amount) };
    case MovementType.CASH_CARRYOVER_IN:
      return { ...base, eventType: "CASH_CARRYOVER", direction: "TRANSFER", source: entity("CASH", null), destination: entity("CASH", null), balanceEffects: effects(0, amount, 0, 0) };
    case MovementType.SURPLUS_TO_POCKET_ON_CLOSE:
      return { ...base, eventType: "CLOSURE_SURPLUS", direction: "TRANSFER", source: entity("SUBCATEGORY", movement.sourceSubcategoryId), destination: entity("POCKET", movement.targetPocketId), balanceEffects: effects(-amount, 0, -amount, amount) };
    case MovementType.DEFICIT_COVER_FROM_SUBCATEGORY:
      return { ...base, eventType: "DEFICIT_RESOLUTION", direction: "TRANSFER", source: entity("SUBCATEGORY", movement.sourceSubcategoryId), destination: entity("SUBCATEGORY", movement.targetSubcategoryId), balanceEffects: effects(0, 0, 0, 0) };
    case MovementType.DEFICIT_COVER_FROM_POCKET:
      return { ...base, eventType: "DEFICIT_RESOLUTION", direction: "TRANSFER", source: entity("POCKET", movement.sourcePocketId), destination: entity("SUBCATEGORY", movement.targetSubcategoryId), balanceEffects: effects(0, 0, amount, -amount) };
    case MovementType.POCKET_DEPOSIT_EXTERNAL:
      return null;
  }
};

export const mapMonthlyLedger = (month: MonthRecord, includeSystemEvents: boolean): MonthlyLedgerView => {
  const incomeEntries: Entry[] = (month.incomes ?? []).map((income) => ({ entryKey: income.id, occurredAt: income.receivedAt.toISOString(), eventType: "MONTHLY_INCOME", direction: "INFLOW", source: entity("EXTERNAL", null), destination: entity("MONTH", month.id), amount: decimalToNumber(income.amount), balanceEffects: effects(decimalToNumber(income.amount), 0, 0, 0), metadata: { description: income.notes, paymentMethod: null, isSystemEvent: false } }));
  const movementEntries = month.movements.map(mapMovement).filter((entry): entry is Entry => entry !== null);
  return { monthId: month.id, status: month.status, entries: [...incomeEntries, ...movementEntries].filter((entry) => includeSystemEvents || !entry.metadata.isSystemEvent).sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt) || ranks[left.eventType] - ranks[right.eventType] || left.entryKey.localeCompare(right.entryKey)) };
};
