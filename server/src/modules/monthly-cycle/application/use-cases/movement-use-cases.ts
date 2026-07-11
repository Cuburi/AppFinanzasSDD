import type { DepositToPocketInput, MonthView, RecordExpenseInput, UpdateExpenseInput } from "../../dto/index.js";
import { createMovementService } from "../../workflows/movement-service.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const MOVEMENT_USE_CASE_NAMES = ["recordExpense", "updateExpense", "deleteExpense", "depositToPocket"] as const;

export type MovementUseCases = {
  recordExpense(input: RecordExpenseInput): Promise<MonthView>;
  updateExpense(input: UpdateExpenseInput): Promise<MonthView>;
  deleteExpense(monthId: string, expenseId: string): Promise<MonthView>;
  depositToPocket(input: DepositToPocketInput): Promise<MonthView | null>;
};

export const createMovementUseCases = (ports: MonthlyCyclePorts): MovementUseCases => createMovementService(ports);
