import assert from "node:assert/strict";
import test from "node:test";

import { parseDepositToPocketInput } from "./pockets.dto.js";

test("pocket deposit DTO preserves legacy external input while accepting the month-available compatibility shape", () => {
  const legacyExternal = parseDepositToPocketInput({
    targetPocketId: "pocket-safe",
    amount: 25,
    externalSourceLabel: "Bonus",
  });
  const monthAvailable = parseDepositToPocketInput({
    sourceKind: "MONTH_AVAILABLE",
    monthId: "month-1",
    targetPocketId: "pocket-safe",
    amount: 25,
  });

  assert.deepEqual(legacyExternal, {
    monthId: null,
    sourceSubcategoryId: null,
    targetPocketId: "pocket-safe",
    amount: 25,
    description: null,
    externalSourceLabel: "Bonus",
  });
  assert.deepEqual(monthAvailable, {
    sourceKind: "MONTH_AVAILABLE",
    monthId: "month-1",
    sourceSubcategoryId: null,
    targetPocketId: "pocket-safe",
    amount: 25,
    description: null,
    externalSourceLabel: null,
  });
});

test("pocket deposit DTO requires a month for the month-available compatibility shape", () => {
  assert.throws(
    () =>
      parseDepositToPocketInput({
        sourceKind: "MONTH_AVAILABLE",
        targetPocketId: "pocket-safe",
        amount: 25,
      }),
    /month id is required/i,
  );
});

test("pocket deposit DTO rejects source fields that contradict the month-available compatibility shape", () => {
  assert.throws(
    () =>
      parseDepositToPocketInput({
        sourceKind: "MONTH_AVAILABLE",
        monthId: "month-1",
        sourceSubcategoryId: "subcategory-food",
        targetPocketId: "pocket-safe",
        amount: 25,
      }),
    /source subcategory/i,
  );
  assert.throws(
    () =>
      parseDepositToPocketInput({
        sourceKind: "MONTH_AVAILABLE",
        monthId: "month-1",
        externalSourceLabel: "Bonus",
        targetPocketId: "pocket-safe",
        amount: 25,
      }),
    /external source label/i,
  );
});
