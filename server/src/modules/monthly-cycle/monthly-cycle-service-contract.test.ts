import { strict as assert } from "node:assert";
import test from "node:test";

import { composeMonthlyCycleService } from "./monthly-cycle-service-contract.js";

const noop = async () => null;

test("composeMonthlyCycleService exposes pocket withdrawal from movement use cases", () => {
  const service = composeMonthlyCycleService({
    lifecycleUseCases: { openMonth: noop, getActiveMonth: noop } as never,
    movementUseCases: {
      recordExpense: noop,
      updateExpense: noop,
      deleteExpense: noop,
      depositToPocket: noop,
      withdrawFromPocket: noop,
    } as never,
    templateUseCases: { getTemplate: noop, updateTemplate: noop } as never,
    incomeUseCases: { createMonthlyIncome: noop, updateMonthlyIncome: noop, deleteMonthlyIncome: noop } as never,
    ledgerUseCases: { getMonthlyLedger: noop } as never,
    cashUseCases: { withdrawCash: noop, getCashSummary: noop } as never,
    reportsUseCases: { getBasicReport: noop } as never,
    expenseHistoryUseCases: { listExpenseHistory: noop } as never,
    closureUseCases: { getClosureReview: noop, applyClosureAction: noop, closeMonth: noop } as never,
    monthStructureUseCases: {
      createMonthCategory: noop,
      updateMonthCategory: noop,
      deleteMonthCategory: noop,
      createMonthSubcategory: noop,
      updateMonthSubcategory: noop,
      deleteMonthSubcategory: noop,
    } as never,
  });

  assert.equal(service.withdrawFromPocket, noop);
});
