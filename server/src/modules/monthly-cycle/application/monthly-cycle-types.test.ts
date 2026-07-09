import test from "node:test";
import assert from "node:assert/strict";
import { MonthStatus as PrismaMonthStatus, MovementType as PrismaMovementType, PaymentMethod as PrismaPaymentMethod } from "../../../lib/prisma-client.js";

import { MonthStatus, MovementType, PaymentMethod } from "./monthly-cycle-types.js";

test("monthly-cycle application enum vocabulary preserves persisted Prisma month status values", () => {
  assert.deepEqual(MonthStatus, {
    ACTIVE: PrismaMonthStatus.ACTIVE,
    CLOSED: PrismaMonthStatus.CLOSED,
  });
});

test("monthly-cycle application enum vocabulary preserves persisted Prisma movement type values", () => {
  assert.deepEqual(MovementType, {
    EXPENSE: PrismaMovementType.EXPENSE,
    CASH_WITHDRAWAL: PrismaMovementType.CASH_WITHDRAWAL,
    CASH_CARRYOVER_IN: PrismaMovementType.CASH_CARRYOVER_IN,
    POCKET_DEPOSIT_FROM_SUBCATEGORY: PrismaMovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY,
    POCKET_DEPOSIT_EXTERNAL: PrismaMovementType.POCKET_DEPOSIT_EXTERNAL,
    SURPLUS_TO_POCKET_ON_CLOSE: PrismaMovementType.SURPLUS_TO_POCKET_ON_CLOSE,
    DEFICIT_COVER_FROM_SUBCATEGORY: PrismaMovementType.DEFICIT_COVER_FROM_SUBCATEGORY,
    DEFICIT_COVER_FROM_POCKET: PrismaMovementType.DEFICIT_COVER_FROM_POCKET,
  });
});

test("monthly-cycle application enum vocabulary preserves persisted Prisma payment method values", () => {
  assert.deepEqual(PaymentMethod, {
    NON_CASH: PrismaPaymentMethod.NON_CASH,
    CASH: PrismaPaymentMethod.CASH,
  });
});
