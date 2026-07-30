import { MovementType, PaymentMethod } from "./application/monthly-cycle-types.js";
import { decimalToNumber, roundMoney, type MonthlyCycleMoney } from "./shared/money.js";

type MonthShape = {
  incomes?: Array<{
    amount: MonthlyCycleMoney;
  }>;
  categories: Array<{
    subcategories: Array<{
      id: string;
      plannedAmount: MonthlyCycleMoney;
    }>;
  }>;
  movements: Array<{
    type: MovementType;
    paymentMethod?: PaymentMethod | null;
    amount: MonthlyCycleMoney;
    sourceSubcategoryId: string | null;
    targetSubcategoryId: string | null;
    sourcePocketId: string | null;
    targetPocketId: string | null;
  }>;
};

export const calculateMonthBalances = (month: MonthShape) => {
  const subcategoryBalances = new Map<string, number>();
  const pocketBalances = new Map<string, number>();
  const monthlyIncomeTotal = roundMoney((month.incomes ?? []).reduce((total, income) => total + decimalToNumber(income.amount), 0));
  let monthOutflows = 0;

  for (const category of month.categories) {
    for (const subcategory of category.subcategories) {
      subcategoryBalances.set(subcategory.id, decimalToNumber(subcategory.plannedAmount));
    }
  }

  for (const movement of month.movements) {
    const amount = decimalToNumber(movement.amount);

    switch (movement.type) {
      case MovementType.EXPENSE:
        if (movement.paymentMethod !== PaymentMethod.CASH) {
          monthOutflows += amount;
        }
        break;
      case MovementType.CASH_WITHDRAWAL:
      case MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY:
      case MovementType.POCKET_DEPOSIT_FROM_AVAILABLE:
      case MovementType.POCKET_DEPOSIT_EXTERNAL:
      case MovementType.SURPLUS_TO_POCKET_ON_CLOSE:
        monthOutflows += amount;
        break;
      default:
        break;
    }

    switch (movement.type) {
      case MovementType.EXPENSE:
      case MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY:
      case MovementType.SURPLUS_TO_POCKET_ON_CLOSE:
      case MovementType.DEFICIT_COVER_FROM_SUBCATEGORY:
        if (movement.sourceSubcategoryId) {
          subcategoryBalances.set(
            movement.sourceSubcategoryId,
            (subcategoryBalances.get(movement.sourceSubcategoryId) ?? 0) - amount,
          );
        }
        break;
      default:
        break;
    }

    switch (movement.type) {
      case MovementType.DEFICIT_COVER_FROM_SUBCATEGORY:
      case MovementType.DEFICIT_COVER_FROM_POCKET:
        if (movement.targetSubcategoryId) {
          subcategoryBalances.set(
            movement.targetSubcategoryId,
            (subcategoryBalances.get(movement.targetSubcategoryId) ?? 0) + amount,
          );
        }
        break;
      default:
        break;
    }

    switch (movement.type) {
      case MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY:
      case MovementType.POCKET_DEPOSIT_FROM_AVAILABLE:
      case MovementType.POCKET_DEPOSIT_EXTERNAL:
      case MovementType.SURPLUS_TO_POCKET_ON_CLOSE:
        if (movement.targetPocketId) {
          pocketBalances.set(movement.targetPocketId, (pocketBalances.get(movement.targetPocketId) ?? 0) + amount);
        }
        break;
      default:
        break;
    }

    if (movement.type === MovementType.DEFICIT_COVER_FROM_POCKET && movement.sourcePocketId) {
      pocketBalances.set(movement.sourcePocketId, (pocketBalances.get(movement.sourcePocketId) ?? 0) - amount);
    }
  }

  return {
    subcategoryBalances,
    pocketBalances,
    monthlyIncomeTotal,
    availableMoney: roundMoney(monthlyIncomeTotal - monthOutflows),
  };
};
