export const MonthStatus = {
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;

export type MonthStatus = (typeof MonthStatus)[keyof typeof MonthStatus];

export const MovementType = {
  EXPENSE: "EXPENSE",
  CASH_WITHDRAWAL: "CASH_WITHDRAWAL",
  CASH_CARRYOVER_IN: "CASH_CARRYOVER_IN",
  POCKET_DEPOSIT_FROM_SUBCATEGORY: "POCKET_DEPOSIT_FROM_SUBCATEGORY",
  POCKET_DEPOSIT_EXTERNAL: "POCKET_DEPOSIT_EXTERNAL",
  SURPLUS_TO_POCKET_ON_CLOSE: "SURPLUS_TO_POCKET_ON_CLOSE",
  DEFICIT_COVER_FROM_SUBCATEGORY: "DEFICIT_COVER_FROM_SUBCATEGORY",
  DEFICIT_COVER_FROM_POCKET: "DEFICIT_COVER_FROM_POCKET",
} as const;

export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export const PaymentMethod = {
  NON_CASH: "NON_CASH",
  CASH: "CASH",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
