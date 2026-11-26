import assert from "node:assert/strict";
import test from "node:test";

import { parseDepositToPocketInput } from "./pockets.dto.js";
import { SemanticError } from "../shared/service-errors.js";

const assertInvalidDepositSource = (payload: unknown) => assert.throws(() => parseDepositToPocketInput(payload), (error: unknown) =>
  error instanceof SemanticError && error.code === "INVALID_DEPOSIT_SOURCE" && error.statusCode === 400,
);

test("pocket deposit DTO parses every strict source shape", () => {
  const base = { targetPocketId: "pocket-safe", amount: 25, occurredAt: "2026-05-10" };

  assert.deepEqual(parseDepositToPocketInput({ ...base, sourceKind: "SUBCATEGORY", monthId: "month-1", sourceSubcategoryId: "subcategory-food" }), {
    ...base, description: null, sourceKind: "SUBCATEGORY", monthId: "month-1", sourceSubcategoryId: "subcategory-food",
  });
  assert.deepEqual(parseDepositToPocketInput({ ...base, sourceKind: "MONTH_AVAILABLE", monthId: "month-1" }), {
    ...base, description: null, sourceKind: "MONTH_AVAILABLE", monthId: "month-1",
  });
  assert.deepEqual(parseDepositToPocketInput({ ...base, sourceKind: "EXTERNAL" }), {
    ...base, description: null, sourceKind: "EXTERNAL",
  });
});

test("pocket deposit DTO rejects compatibility and contradictory source shapes", () => {
  const base = { targetPocketId: "pocket-safe", amount: 25, occurredAt: "2026-05-10" };

  assert.throws(() => parseDepositToPocketInput({ ...base, monthId: "month-1", sourceSubcategoryId: "subcategory-food" }), /tipo de origen del depósito al bolsillo debe/i);
  assert.throws(() => parseDepositToPocketInput({ ...base, sourceKind: "MONTH_AVAILABLE", monthId: "month-1", sourceSubcategoryId: "subcategory-food" }), /no pueden indicar/i);
  assert.throws(() => parseDepositToPocketInput({ ...base, sourceKind: "EXTERNAL", monthId: "month-1", externalSourceLabel: "Bonus" }), /no pueden indicar/i);
  for (const payload of [{ ...base, sourceKind: "MONTH_AVAILABLE", monthId: "month-1", sourceSubcategoryId: null }, { ...base, sourceKind: "EXTERNAL", monthId: null }]) assertInvalidDepositSource(payload);
});

test("pocket deposit DTO classifies missing branch-required fields as invalid sources", () => {
  const base = { targetPocketId: "pocket-safe", amount: 25, occurredAt: "2026-05-10" };

  assertInvalidDepositSource({ ...base, sourceKind: "SUBCATEGORY", monthId: "month-1" });
  assertInvalidDepositSource({ ...base, sourceKind: "MONTH_AVAILABLE" });
});

test("pocket deposit DTO rejects impossible calendar dates", () => {
  const base = { sourceKind: "EXTERNAL", targetPocketId: "pocket-safe", amount: 25 }; for (const occurredAt of ["2026-02-29", "2026-02-30", "2026-05-10T00:00:00.000Z", "2026-10-31T20:00:00.000-05:00"]) assert.throws(() => parseDepositToPocketInput({ ...base, occurredAt }), (error: unknown) => error instanceof SemanticError && error.code === "INVALID_DATE" && error.statusCode === 400);
});
