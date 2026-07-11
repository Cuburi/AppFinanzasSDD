import { MonthStatus, MovementType } from "../application/monthly-cycle-types.js";

import type { ClosureReviewView, MonthView, OpenMonthInput, TemplateInput } from "../dto/index.js";
import { mapMonth } from "../mappers/monthly-cycle-mappers.js";
import { calculateCashBalance } from "../shared/cash-ledger.js";
import { decimal } from "../shared/money.js";
import { decimalToNumber } from "../shared/money.js";
import { assertMonthIsMutable } from "../shared/month-queries.js";
import { DomainError } from "../shared/service-errors.js";
import type { MonthRecord } from "../shared/service-types.js";
import { resolveMonthlyCyclePorts, type MonthlyCycleWorkflowDependencies } from "./workflow-dependencies.js";

const assertTemplateHasSubcategories = (input: TemplateInput) => {
  const count = input.categories.reduce((total, category) => total + category.subcategories.length, 0);

  if (count === 0) {
    throw new DomainError(400, "Template must contain at least one subcategory before opening a month.");
  }
};

export const createMonthLifecycleService = (dependencies: MonthlyCycleWorkflowDependencies) => {
  const ports = resolveMonthlyCyclePorts(dependencies);

  return {
    async openMonth(input: OpenMonthInput): Promise<MonthView> {
      const month = await ports.transactionRunner.run(async (txPorts) => {
        const activeMonth = await txPorts.months.findActiveSummary(MonthStatus.ACTIVE);

        if (activeMonth) {
          throw new DomainError(409, `There is already an active month (${activeMonth.year}-${String(activeMonth.month).padStart(2, "0")}).`);
        }

        const existingTargetMonth = await txPorts.months.findByYearMonth(input.year, input.month);

        if (existingTargetMonth) {
          throw new DomainError(409, "That month already exists.");
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

        const createdMonth = await txPorts.months.createFromTemplate({
          year: input.year,
          month: input.month,
          status: MonthStatus.ACTIVE,
          template,
        });

        const priorClosedMonth = await txPorts.months.findPriorClosedBefore(input.year, input.month);

        if (priorClosedMonth) {
          const carryover = calculateCashBalance(priorClosedMonth.movements);
          if (carryover > 0) {
            await txPorts.movements.create({
              type: MovementType.CASH_CARRYOVER_IN,
              amount: decimal(carryover),
              description: "Cash carryover from previous closed month",
              occurredAt: new Date(Date.UTC(input.year, input.month - 1, 1)),
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
        const existingMonth = await txPorts.months.findById(monthId);
        assertMonthIsMutable(existingMonth);

        const review = buildClosureReview(existingMonth);

        if (!review.canClose) {
          throw new DomainError(409, "Month cannot be closed while pending subcategory balances or available money remain unresolved.");
        }

        return txPorts.months.close(monthId);
      });

      return mapMonth(month);
    },
  };
};
