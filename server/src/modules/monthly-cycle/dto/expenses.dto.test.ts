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
    /Fecha del gasto debe ser una fecha válida/i,
  );

  assert.throws(
    () => parseExpenseHistoryQueryInput("month-1", { from: "2026-05-01T00:00:00.000Z", to: "definitely-not-a-date" }),
    /Fecha final debe ser una fecha válida/i,
  );
});

test("expense DTO parsing preserves explicit offsets and rejects impossible calendar dates", () => {
  for (const occurredAt of ["2026-10-31T20:14:15.250-05:00", "2026-01-01T01:00:00.000+05:30", "2028-02-29T20:00:00.000-05:00"]) {
    const payload = { amount: 20, occurredAt, paymentMethod: PaymentMethod.NON_CASH };
    assert.equal(parseRecordExpenseInput("month-1", payload).occurredAt, occurredAt);
    assert.equal(parseUpdateExpenseInput("month-1", "expense-1", payload).occurredAt, occurredAt);
  }
  for (const occurredAt of ["2026-02-29T20:00:00.000-05:00", "2026-04-31T20:00:00.000-05:00", "2026-10-31T20:00:00.000-25:00"]) {
    const payload = { amount: 20, occurredAt, paymentMethod: PaymentMethod.NON_CASH };
    assert.throws(() => parseRecordExpenseInput("month-1", payload), { message: "Fecha del gasto debe ser una fecha válida." });
    assert.throws(() => parseUpdateExpenseInput("month-1", "expense-1", payload), { message: "Fecha del gasto debe ser una fecha válida." });
  }
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
  assert.throws(() => parseExpenseHistoryQueryInput("month-1", { classification: "uncategorized" }), /La clasificación debe ser UNCATEGORIZED/i);
});
