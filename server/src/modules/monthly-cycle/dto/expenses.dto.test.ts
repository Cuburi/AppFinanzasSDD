import test from "node:test";
import assert from "node:assert/strict";
import { PaymentMethod } from "../../../lib/prisma-client.js";

import { parseExpenseHistoryQueryInput, parseRecordExpenseInput } from "./expenses.dto.js";

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
