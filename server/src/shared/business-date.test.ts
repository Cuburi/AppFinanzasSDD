import assert from "node:assert/strict";
import test from "node:test";
import { businessDateToPrisma, businessDateFromPrisma, isBusinessDateInMonth, parseBusinessDate, todayInBogota } from "./business-date.js";
import { parseRecordExpenseInput, parseExpenseHistoryQueryInput } from "../modules/monthly-cycle/dto/expenses.dto.js";
import { parseCreateDebtInput, parseRegisterDebtPaymentInput } from "../modules/debts/http/debts.schemas.js";

test("business dates strictly parse real calendar days and round-trip Prisma UTC dates", () => {
  for (const day of ["2026-10-31", "2028-02-29", "2000-02-29", "0099-01-01"]) {
    assert.equal(parseBusinessDate(day), day);
    assert.equal(businessDateFromPrisma(businessDateToPrisma(day)), day);
  }
  for (const value of [undefined, null, new Date(), "2026-02-29", "1900-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-01", " 2026-10-31", "2026-10-31 ", "2026-10-31T20:00:00.000-05:00", "2026-10-31T00:00:00Z", "garbage"]) {
    assert.throws(() => parseBusinessDate(value), /YYYY-MM-DD/);
  }
  assert.equal(isBusinessDateInMonth("2026-10-31", { year: 2026, month: 10 }), true);
  assert.equal(isBusinessDateInMonth("2026-11-01", { year: 2026, month: 10 }), false);
});

test("Bogota today uses the local calendar day across UTC midnight", () => {
  assert.equal(todayInBogota(new Date("2026-11-01T04:59:59.999Z")), "2026-10-31");
  assert.equal(todayInBogota(new Date("2026-11-01T05:00:00.000Z")), "2026-11-01");
});

test("expense and history DTOs accept days and reject instants", () => {
  assert.equal(parseRecordExpenseInput("month", { amount: 1, occurredAt: "2026-10-31", paymentMethod: "NON_CASH" }).occurredAt, "2026-10-31");
  assert.deepEqual(parseExpenseHistoryQueryInput("month", { from: "2026-10-01", to: "2026-10-31" }), { monthId: "month", from: "2026-10-01", to: "2026-10-31", paymentMethod: undefined, subcategoryId: undefined, classification: undefined });
  assert.throws(() => parseRecordExpenseInput("month", { amount: 1, occurredAt: "2026-10-31T20:00:00.000-05:00", paymentMethod: "NON_CASH" }), /YYYY-MM-DD/);
  for (const field of ["from", "to"]) assert.throws(() => parseExpenseHistoryQueryInput("month", { [field]: "2026-10-31T00:00:00Z" }), /YYYY-MM-DD/);
});

test("debt DTOs round-trip days and reject timestamp payments", () => {
  const debt = parseCreateDebtInput({ direction: "I_OWE", counterpartyName: "Banco", totalAmount: 100, originDate: "2026-10-31" });
  assert.equal(businessDateFromPrisma(debt.originDate), "2026-10-31");
  assert.equal(businessDateFromPrisma(parseRegisterDebtPaymentInput({ amount: 1, paidAt: "2026-10-31" }).paidAt), "2026-10-31");
  assert.throws(() => parseRegisterDebtPaymentInput({ amount: 1, paidAt: "2026-10-31T20:00:00.000-05:00" }), /YYYY-MM-DD/);
});
