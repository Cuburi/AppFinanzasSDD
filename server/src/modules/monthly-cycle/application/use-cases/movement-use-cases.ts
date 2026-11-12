import type { DepositToPocketInput, MonthView, RecordExpenseInput, UpdateExpenseInput, WithdrawFromPocketInput } from "../../dto/index.js";
import { calculateMonthBalances } from "../../balance-calculator.js";
import { mapMonth } from "../../mappers/monthly-cycle-mappers.js";
import { assertOccurredAtWithinMonth } from "../../shared/cash-ledger.js";
import { decimal, roundMoney } from "../../shared/money.js";
import { findMonthSubcategory } from "../../shared/month-queries.js";
import { SemanticError } from "../../shared/service-errors.js";
import { MonthStatus, MovementType } from "../monthly-cycle-types.js";
import { createMovementService } from "../../workflows/movement-service.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const MOVEMENT_USE_CASE_NAMES = ["recordExpense", "updateExpense", "deleteExpense", "depositToPocket", "withdrawFromPocket"] as const;

export type MovementUseCases = {
  recordExpense(input: RecordExpenseInput): Promise<MonthView>;
  updateExpense(input: UpdateExpenseInput): Promise<MonthView>;
  deleteExpense(monthId: string, expenseId: string): Promise<MonthView>;
  depositToPocket(input: DepositToPocketInput): Promise<MonthView | null>;
  withdrawFromPocket(input: WithdrawFromPocketInput): Promise<null>;
};

export type StrictDepositToPocketInput = DepositToPocketInput;

const invalidDepositSource = () => new SemanticError("INVALID_DEPOSIT_SOURCE", 400, "El origen del depósito al bolsillo no es válido.");

const assertStrictDepositShape = (input: StrictDepositToPocketInput) => {
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new SemanticError("INVALID_AMOUNT", 400, "El monto del depósito al bolsillo debe ser mayor que cero.");
  if (Number.isNaN(new Date(input.occurredAt).getTime())) throw new SemanticError("INVALID_DATE", 400, "La fecha del depósito al bolsillo no es válida.");
  if (input.sourceKind === "SUBCATEGORY") {
    if (!input.monthId || !input.sourceSubcategoryId || input.externalSourceLabel != null) throw invalidDepositSource();
  } else if (input.sourceKind === "MONTH_AVAILABLE") {
    if (!input.monthId || input.sourceSubcategoryId != null || input.externalSourceLabel != null) throw invalidDepositSource();
  } else if (input.sourceKind !== "EXTERNAL" || input.monthId != null || input.sourceSubcategoryId != null) {
    throw invalidDepositSource();
  }
  return amount;
};

export const createStrictDepositToPocketUseCase = (ports: MonthlyCyclePorts) => async (input: StrictDepositToPocketInput): Promise<MonthView | null> => {
  const amount = assertStrictDepositShape(input);
  const occurredAt = new Date(input.occurredAt);
  const month = await ports.transactionRunner.runSerializable(async (txPorts) => {
    if (!await txPorts.depositWriterGate.isEnabled()) throw new SemanticError("DEPOSIT_WRITES_DISABLED", 409, "Los depósitos a bolsillos están deshabilitados temporalmente.");
    if (txPorts.pockets.ensureStrictDepositTargetPocketIsActive) {
      await txPorts.pockets.ensureStrictDepositTargetPocketIsActive(input.targetPocketId);
    } else {
      await txPorts.pockets.ensurePocketIsActive(input.targetPocketId, "Bolsillo de destino");
    }
    const existingMonth = input.monthId ? await txPorts.months.lockForMutation(input.monthId) : null;
    if (existingMonth) {
      if (existingMonth.status !== MonthStatus.ACTIVE) throw new SemanticError("MONTH_NOT_ACTIVE", 409, "El mes no está activo.");
      try {
        assertOccurredAtWithinMonth(occurredAt, existingMonth);
      } catch {
        throw new SemanticError("INVALID_DATE", 400, "La fecha del depósito al bolsillo debe estar dentro del mes activo.");
      }
      const balances = calculateMonthBalances(existingMonth);
      const sourceBalance = input.sourceKind === "SUBCATEGORY" ? balances.subcategoryBalances.get(input.sourceSubcategoryId ?? "") : balances.availableMoney;
      if (input.sourceKind === "SUBCATEGORY" && !findMonthSubcategory(existingMonth, input.sourceSubcategoryId ?? "")) throw new SemanticError("NOT_FOUND", 404, "No se encontró la subcategoría de origen en este mes.");
      if (input.sourceKind !== "EXTERNAL" && roundMoney(sourceBalance ?? 0) < amount) throw new SemanticError("INSUFFICIENT_FUNDS", 409, "Fondos insuficientes para este depósito al bolsillo.");
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

export const createWithdrawFromPocketUseCase = (ports: MonthlyCyclePorts) => async (input: WithdrawFromPocketInput): Promise<null> => {
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new SemanticError("INVALID_AMOUNT", 400, "El monto del retiro del bolsillo debe ser mayor que cero.");
  if (Number.isNaN(new Date(input.occurredAt).getTime())) throw new SemanticError("INVALID_DATE", 400, "La fecha del retiro del bolsillo no es válida.");

  await ports.transactionRunner.runSerializable(async (txPorts) => {
    if (txPorts.pockets.ensureStrictPocketIsActive) {
      await txPorts.pockets.ensureStrictPocketIsActive(input.sourcePocketId, "Bolsillo de origen");
    } else {
      await txPorts.pockets.ensurePocketIsActive(input.sourcePocketId, "Bolsillo de origen");
    }
    const balance = txPorts.pockets.getBalance ? await txPorts.pockets.getBalance(input.sourcePocketId) : 0;
    if (roundMoney(balance) < amount) throw new SemanticError("INSUFFICIENT_FUNDS", 409, "Fondos insuficientes para este retiro del bolsillo.");

    await txPorts.movements.create({
      type: MovementType.DEFICIT_COVER_FROM_POCKET,
      amount: decimal(amount),
      description: input.description,
      occurredAt: new Date(input.occurredAt),
      sourcePocketId: input.sourcePocketId,
    });
  });

  return null;
};

export const createMovementUseCases = (ports: MonthlyCyclePorts): MovementUseCases => ({
  ...createMovementService(ports),
  depositToPocket: createStrictDepositToPocketUseCase(ports),
  withdrawFromPocket: createWithdrawFromPocketUseCase(ports),
});
