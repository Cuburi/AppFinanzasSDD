import test from "node:test";
import assert from "node:assert/strict";
import { PaymentMethod } from "../../../lib/prisma-client.js";

import { parseExpenseHistoryQueryInput, parseRecordExpenseInput, parseUpdateExpenseInput } from "./expenses.dto.js";

test("expense DTO parsing rejects malformed record and history dates", () => {
  assert.throws(
    () =>
      parseRecordExpenseInput("month-1", {
        sourceSubcategoryId: "subcategory-1",
        amount: 10,
        occurredAt: "not-a-date",
        paymentMethod: PaymentMethod.NON_CASH,
      }),
    /expense date must be a valid date/i,
  );

  assert.throws(
    () => parseExpenseHistoryQueryInput("month-1", { from: "2026-05-01T00:00:00.000Z", to: "definitely-not-a-date" }),
    /to date must be a valid date/i,
  );
});

test("expense DTO parsing accepts optional credit-card references on record, update, and history filters", () => {
  const recordInput = parseRecordExpenseInput("month-1", {
    sourceSubcategoryId: "subcategory-1",
    amount: 42,
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
    creditCardId: "card-1",
  });
  const updateInput = parseUpdateExpenseInput("month-1", "expense-1", {
    sourceSubcategoryId: "subcategory-1",
    amount: 50,
    occurredAt: "2026-05-11T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
    creditCardId: null,
  });
  const historyInput = parseExpenseHistoryQueryInput("month-1", { creditCardId: "card-1" });

  assert.equal(recordInput.creditCardId, "card-1");
  assert.equal(updateInput.creditCardId, null);
  assert.equal(historyInput.creditCardId, "card-1");
});
