import { MovementType, PaymentMethod, Prisma } from "../../../lib/prisma-client.js";

type CashMovement = {
  type: MovementType;
  paymentMethod?: PaymentMethod | null;
  amount: Prisma.Decimal;
};

type MonthPeriod = {
  year: number;
  month: number;
};

const decimalToNumber = (value: Prisma.Decimal): number => Number(value.toString());

const roundMoney = (value: number) => Number(value.toFixed(2));

export const isCashWithdrawal = (movement: Pick<CashMovement, "type">) =>
  movement.type === MovementType.CASH_WITHDRAWAL;

export const isCashCarryoverIn = (movement: Pick<CashMovement, "type">) =>
  movement.type === MovementType.CASH_CARRYOVER_IN;

export const isCashExpense = (movement: Pick<CashMovement, "type" | "paymentMethod">) =>
  movement.type === MovementType.EXPENSE && movement.paymentMethod === PaymentMethod.CASH;

export const calculateCashBalance = (movements: CashMovement[]) => {
  const balance = movements.reduce((total, movement) => {
    const amount = decimalToNumber(movement.amount);

    if (isCashWithdrawal(movement) || isCashCarryoverIn(movement)) {
      return total + amount;
    }

    if (isCashExpense(movement)) {
      return total - amount;
    }

    return total;
  }, 0);

  return roundMoney(balance);
};

export const assertOccurredAtWithinMonth = (occurredAt: Date, month: MonthPeriod) => {
  const occurredYear = occurredAt.getUTCFullYear();
  const occurredMonth = occurredAt.getUTCMonth() + 1;

  if (occurredYear !== month.year || occurredMonth !== month.month) {
    throw new RangeError("Movement occurredAt must be within the target month");
  }
};
