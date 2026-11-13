import { MonthStatus, MovementType } from "../application/monthly-cycle-types.js";

import type { ClosureReviewView, MonthView, OpenMonthInput, TemplateInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { calculateCashBalance } from "../shared/cash-ledger.js";
import { decimal } from "../shared/money.js";
import { decimalToNumber } from "../shared/money.js";
import { lockMutableMonthForMutation } from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MonthRecord } from "../shared/service-types.js";
import { resolveMonthlyCyclePorts, type MonthlyCycleWorkflowDependencies } from "./workflow-dependencies.js";

import { businessDateToPrisma } from "../../../shared/business-date.js";

const assertTemplateHasSubcategories = (input: TemplateInput) => {
  const count = input.categories.reduce((total, category) => total + category.subcategories.length, 0);

  if (count === 0) {
    throw new DomainError(400, "La plantilla debe contener al menos una subcategoría antes de abrir un mes.");
  }
};

export const createMonthLifecycleService = (dependencies: MonthlyCycleWorkflowDependencies) => {
  const ports = resolveMonthlyCyclePorts(dependencies);

  return {
    async openMonth(input: OpenMonthInput): Promise<MonthView> {
      const month = await ports.transactionRunner.runSerializable(async (txPorts) => {
        const activeMonth = await txPorts.months.findActiveSummary(MonthStatus.ACTIVE);

        if (activeMonth) {
          throw new DomainError(409, `Ya existe un mes activo (${activeMonth.year}-${String(activeMonth.month).padStart(2, "0")}).`);
        }

        const existingTargetMonth = await txPorts.months.findByYearMonth(input.year, input.month);

        if (existingTargetMonth) {
          throw new DomainError(409, "Ese mes ya existe.");
        }

        const template = await txPorts.templates.readCategories();
        const templateInput = {
          categories: template.map((category) => ({
            name: category.name,
            subcategories: category.subcategories.map((subcategory) => ({
              name: subcategory.name,
              plannedAmount: decimalToNumber(subcategory.plannedAmount),
              defaultPocketId: subcategory.defaultPocketId,
            })),
          })),
        };
        assertTemplateHasSubcategories(templateInput);
        await txPorts.pockets.ensureTemplateDefaultPocketsAreActive(templateInput);

        const priorClosedMonth = await txPorts.months.findPriorClosedBefore(input.year, input.month);
        if (priorClosedMonth) {
          await txPorts.months.lockForMutation(priorClosedMonth.id);
          if (await txPorts.months.findOpeningRecipient(priorClosedMonth.id)) {
            throw new DomainError(409, "El mes cerrado anterior ya financió otro mes.");
          }
        }

        const createdMonth = await txPorts.months.createFromTemplate({
          year: input.year,
          month: input.month,
          status: MonthStatus.ACTIVE,
          template,
          ...(priorClosedMonth ? {
            openingBalance: priorClosedMonth.closureCarryAmount ?? decimal(0),
            openingSourceMonthId: priorClosedMonth.id,
          } : {}),
        });

        if (priorClosedMonth) {
          const carryover = calculateCashBalance(priorClosedMonth.movements);
          if (carryover > 0) {
            await txPorts.movements.create({
              type: MovementType.CASH_CARRYOVER_IN,
              amount: decimal(carryover),
              description: "Cash carryover from previous closed month",
              occurredAt: businessDateToPrisma(`${String(input.year).padStart(4, "0")}-${String(input.month).padStart(2, "0")}-01`),
              monthId: createdMonth.id,
            });

            return txPorts.months.findById(createdMonth.id);
          }
        }

        return createdMonth;
      });

      return mapMonth(month);
    },

    async getActiveMonth(): Promise<MonthView | null> {
      const month = await ports.months.findActive();

      if (!month) {
        return null;
      }

      return mapMonth(month);
    },

    async closeMonth(monthId: string, buildClosureReview: (month: MonthRecord) => ClosureReviewView): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const existingMonth = await lockMutableMonthForMutation(txPorts.months, monthId);

        const review = buildClosureReview(existingMonth);

        if (!review.canClose) {
          throw new DomainError(409, "No se puede cerrar el mes mientras haya saldos pendientes de subcategorías o dinero disponible sin resolver.");
        }

        return txPorts.months.close(monthId);
      });

      return mapMonth(month);
    },
  };
};
