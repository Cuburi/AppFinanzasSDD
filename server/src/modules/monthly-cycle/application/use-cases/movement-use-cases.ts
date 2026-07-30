import type { DepositToPocketInput, MonthView, RecordExpenseInput, UpdateExpenseInput } from "../../dto/index.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { assertOccurredAtWithinMonth } from "../../shared/cash-ledger.js";
import { decimal, roundMoney } from "../../shared/money.js";
import { findMonthSubcategory } from "../../shared/month-queries.js";
import { SemanticError } from "../../shared/service-errors.js";
import { MonthStatus, MovementType } from "../monthly-cycle-types.js";
import { createMovementService } from "../../workflows/movement-service.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const MOVEMENT_USE_CASE_NAMES = ["recordExpense", "updateExpense", "deleteExpense", "depositToPocket"] as const;

export type MovementUseCases = {
  recordExpense(input: RecordExpenseInput): Promise<MonthView>;
  updateExpense(input: UpdateExpenseInput): Promise<MonthView>;
  deleteExpense(monthId: string, expenseId: string): Promise<MonthView>;
  depositToPocket(input: DepositToPocketInput): Promise<MonthView | null>;
};

type StrictDepositBase = { targetPocketId: string; amount: number; occurredAt: string; description?: string | null };
export type StrictDepositToPocketInput = StrictDepositBase & (
  | { sourceKind: "SUBCATEGORY"; monthId: string; sourceSubcategoryId: string; externalSourceLabel?: never }
  | { sourceKind: "MONTH_AVAILABLE"; monthId: string; sourceSubcategoryId?: never; externalSourceLabel?: never }
  | { sourceKind: "EXTERNAL"; monthId?: never; sourceSubcategoryId?: never; externalSourceLabel: string }
);

const invalidDepositSource = () => new SemanticError("INVALID_DEPOSIT_SOURCE", 400, "Pocket deposit source is invalid.");

const assertStrictDepositShape = (input: StrictDepositToPocketInput) => {
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new SemanticError("INVALID_AMOUNT", 400, "Pocket deposit amount must be positive.");
  if (Number.isNaN(new Date(input.occurredAt).getTime())) throw new SemanticError("INVALID_DATE", 400, "Pocket deposit date is invalid.");
  if (input.sourceKind === "SUBCATEGORY") {
    if (!input.monthId || !input.sourceSubcategoryId || input.externalSourceLabel != null) throw invalidDepositSource();
  } else if (input.sourceKind === "MONTH_AVAILABLE") {
    if (!input.monthId || input.sourceSubcategoryId != null || input.externalSourceLabel != null) throw invalidDepositSource();
  } else if (input.sourceKind !== "EXTERNAL" || input.monthId != null || input.sourceSubcategoryId != null || !input.externalSourceLabel?.trim()) {
    throw invalidDepositSource();
  }
  return amount;
};

export const createStrictDepositToPocketUseCase = (ports: MonthlyCyclePorts) => async (input: StrictDepositToPocketInput): Promise<MonthView | null> => {
  const amount = assertStrictDepositShape(input);
  const occurredAt = new Date(input.occurredAt);
  const month = await ports.transactionRunner.runSerializable(async (txPorts) => {
    if (!await txPorts.depositWriterGate.isEnabled()) throw new SemanticError("DEPOSIT_WRITES_DISABLED", 409, "Pocket deposits are temporarily disabled.");
    if (txPorts.pockets.ensureStrictDepositTargetPocketIsActive) {
      await txPorts.pockets.ensureStrictDepositTargetPocketIsActive(input.targetPocketId);
    } else {
      await txPorts.pockets.ensurePocketIsActive(input.targetPocketId, "Target pocket");
    }
    const existingMonth = input.monthId ? await txPorts.months.findById(input.monthId) : null;
    if (existingMonth) {
      if (existingMonth.status !== MonthStatus.ACTIVE) throw new SemanticError("MONTH_NOT_ACTIVE", 409, "Month is not active.");
      try {
        assertOccurredAtWithinMonth(occurredAt, existingMonth);
      } catch {
        throw new SemanticError("INVALID_DATE", 400, "Pocket deposit date must be inside the active month.");
      }
      const balances = calculateMonthBalances(existingMonth);
      const sourceBalance = input.sourceKind === "SUBCATEGORY" ? balances.subcategoryBalances.get(input.sourceSubcategoryId ?? "") : balances.availableMoney;
      if (input.sourceKind === "SUBCATEGORY" && !findMonthSubcategory(existingMonth, input.sourceSubcategoryId ?? "")) throw new SemanticError("NOT_FOUND", 404, "Source subcategory was not found in this month.");
      if (input.sourceKind !== "EXTERNAL" && roundMoney(sourceBalance ?? 0) < amount) throw new SemanticError("INSUFFICIENT_FUNDS", 409, "Insufficient funds for this pocket deposit.");
    }
    await txPorts.movements.create({
      type: input.sourceKind === "SUBCATEGORY" ? MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY : input.sourceKind === "MONTH_AVAILABLE" ? MovementType.POCKET_DEPOSIT_FROM_AVAILABLE : MovementType.POCKET_DEPOSIT_EXTERNAL,
      amount: decimal(amount), description: input.description, occurredAt, monthId: input.monthId,
      sourceSubcategoryId: input.sourceSubcategoryId, targetPocketId: input.targetPocketId,
      externalSourceLabel: input.sourceKind === "EXTERNAL" ? input.externalSourceLabel?.trim() ?? null : null,
    });
    return existingMonth ? txPorts.months.findById(existingMonth.id) : null;
  });
  return month ? mapMonth(month) : null;
};

export const createMovementUseCases = (ports: MonthlyCyclePorts): MovementUseCases => createMovementService(ports);
