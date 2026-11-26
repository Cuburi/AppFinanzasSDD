import { MovementType, PaymentMethod } from "../application/monthly-cycle-types.js";

import type { DepositToPocketInput, MonthView, RecordExpenseInput, UpdateExpenseInput } from "../dto/index.js";
import { readIsoDateString } from "../dto/shared-parsers.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { assertOccurredAtWithinMonth, calculateCashBalance } from "../shared/cash-ledger.js";
import { decimal } from "../shared/money.js";
import { findMonthSubcategory, lockMutableMonthForMutation } from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MovementRecord } from "../application/ports/monthly-cycle-ports.js";
import { resolveMonthlyCyclePorts, type MonthlyCycleWorkflowDependencies } from "./workflow-dependencies.js";

import { businessDateToPrisma, isBusinessDateInMonth, todayInBogota } from "../../../shared/business-date.js";

const SINGLE_USER_OWNER_ID = "single-user";

const assertExpenseDateWithinMonth = (value: string, month: Parameters<typeof assertOccurredAtWithinMonth>[1]) => {
  const day = readIsoDateString(value, "Fecha del gasto");
  if (!isBusinessDateInMonth(day, month)) {
    throw new DomainError(400, "La fecha del gasto debe estar dentro del mes vinculado.");
  }
};

const assertExpenseBelongsToMonth = (
  movement: MovementRecord | null,
  monthId: string,
) => {
  if (!movement || movement.type !== MovementType.EXPENSE || movement.monthId !== monthId) {
    throw new DomainError(404, "No se encontró el gasto en este mes.");
  }

  return movement;
};

export const createMovementService = (dependencies: MonthlyCycleWorkflowDependencies) => {
  const ports = resolveMonthlyCyclePorts(dependencies);

  return {
    async recordExpense(input: RecordExpenseInput): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);

        if (input.sourceSubcategoryId && !findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
          throw new DomainError(404, "No se encontró la subcategoría en este mes.");
        }

        assertExpenseDateWithinMonth(input.occurredAt, existingMonth);
        const occurredAt = businessDateToPrisma(input.occurredAt);

        if (input.paymentMethod === PaymentMethod.CASH && calculateCashBalance(existingMonth.movements) < input.amount) {
          throw new DomainError(409, "Efectivo insuficiente para este gasto.");
        }

        if (input.creditCardId) {
          await txPorts.creditCards.ensureCreditCardIsActive(SINGLE_USER_OWNER_ID, input.creditCardId);
        }

        await txPorts.movements.create({
          type: MovementType.EXPENSE,
          amount: decimal(input.amount),
          description: input.description,
          occurredAt,
          paymentMethod: input.paymentMethod,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
          creditCardId: input.creditCardId ?? null,
        });

        return txPorts.months.findById(input.monthId);
      });

      return mapMonth(month);
    },

    async updateExpense(input: UpdateExpenseInput): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const existingMonth = await lockMutableMonthForMutation(txPorts.months, input.monthId);

        const existingExpense = assertExpenseBelongsToMonth(await txPorts.movements.findById(input.expenseId), input.monthId);

        if (input.sourceSubcategoryId && !findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
          throw new DomainError(404, "No se encontró la subcategoría en este mes.");
        }

        assertExpenseDateWithinMonth(input.occurredAt, existingMonth);
        const occurredAt = businessDateToPrisma(input.occurredAt);

        const movementsWithoutCurrentExpense = existingMonth.movements.filter((movement) => movement.id !== existingExpense.id);
        if (input.paymentMethod === PaymentMethod.CASH && calculateCashBalance(movementsWithoutCurrentExpense) < input.amount) {
          throw new DomainError(409, "Efectivo insuficiente para este gasto.");
        }

        if (input.creditCardId) {
          await txPorts.creditCards.ensureCreditCardIsActive(SINGLE_USER_OWNER_ID, input.creditCardId);
        }

        await txPorts.movements.updateExpense({
          expenseId: input.expenseId,
          amount: decimal(input.amount),
          description: input.description,
          occurredAt,
          paymentMethod: input.paymentMethod,
          sourceSubcategoryId: input.sourceSubcategoryId,
          creditCardId: input.creditCardId ?? null,
        });

        return txPorts.months.findById(input.monthId);
      });

      return mapMonth(month);
    },

    async deleteExpense(monthId: string, expenseId: string): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId);

        assertExpenseBelongsToMonth(await txPorts.movements.findById(expenseId), monthId);

        await txPorts.movements.delete(expenseId);

        return txPorts.months.findById(monthId);
      });

      return mapMonth(month);
    },

    async depositToPocket(input: DepositToPocketInput): Promise<MonthView | null> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        if (!await txPorts.depositWriterGate.isEnabled()) {
          throw new DomainError(409, "Los depósitos a bolsillos están deshabilitados temporalmente.");
        }
        await txPorts.pockets.ensurePocketIsActive(input.targetPocketId, "Bolsillo de destino");

        const existingMonth = input.monthId ? await lockMutableMonthForMutation(txPorts.months, input.monthId) : null;

        if (input.sourceSubcategoryId) {
          if (!existingMonth) {
            throw new DomainError(400, "Se requiere el identificador del mes al depositar desde una subcategoría.");
          }

          if (!findMonthSubcategory(existingMonth, input.sourceSubcategoryId)) {
            throw new DomainError(400, "La subcategoría de origen no pertenece a este mes.");
          }
        }

        await txPorts.movements.create({
          type: input.sourceSubcategoryId ? MovementType.POCKET_DEPOSIT_FROM_SUBCATEGORY : MovementType.POCKET_DEPOSIT_EXTERNAL,
          occurredAt: businessDateToPrisma(todayInBogota()),
          amount: decimal(input.amount),
          description: input.description,
          monthId: input.monthId,
          sourceSubcategoryId: input.sourceSubcategoryId,
          targetPocketId: input.targetPocketId,
          externalSourceLabel: input.sourceSubcategoryId ? null : input.externalSourceLabel,
        });

        return input.monthId ? txPorts.months.findById(input.monthId) : null;
      });

      return month ? mapMonth(month) : null;
    },
  };
};
