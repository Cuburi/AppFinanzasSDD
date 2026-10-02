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

test("expense DTO parsing accepts an absent classification and preserves explicit null", () => {
  const omittedClassification = parseRecordExpenseInput("month-1", {
    amount: 42,
    occurredAt: "2026-05-10T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });
  const explicitNullClassification = parseUpdateExpenseInput("month-1", "expense-1", {
    sourceSubcategoryId: null,
    amount: 50,
    occurredAt: "2026-05-11T00:00:00.000Z",
    paymentMethod: PaymentMethod.NON_CASH,
  });

  assert.equal(omittedClassification.sourceSubcategoryId, null);
  assert.equal(explicitNullClassification.sourceSubcategoryId, null);
});

test("expense DTO parsing accepts only the explicit uncategorized history filter", () => {
  assert.deepEqual(parseExpenseHistoryQueryInput("month-1", { classification: "UNCATEGORIZED" }), {
    monthId: "month-1",
    from: undefined,
    to: undefined,
    paymentMethod: undefined,
    subcategoryId: undefined,
    classification: "UNCATEGORIZED",
  });
  assert.throws(() => parseExpenseHistoryQueryInput("month-1", { classification: "uncategorized" }), /classification must be uncategorized/i);
});
