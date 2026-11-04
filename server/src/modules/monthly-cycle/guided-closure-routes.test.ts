import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createMonthlyCycleRouter } from "./routes.js";
import { parseCloseMonthInput } from "./dto/closure.dto.js";
import { DomainError } from "./shared/service-errors.js";

test("closure DTO preserves bodyless zero compatibility and validates exact cents without coercion", () => {
  assert.equal(parseCloseMonthInput(undefined), undefined);
  assert.deepEqual(parseCloseMonthInput({ carryAmount: 0.1, excludedAmount: 0.2 }), { carryAmount: 0.1, excludedAmount: 0.2 });
  for (const payload of [null, [], {}, { carryAmount: 1 }, { carryAmount: "1", excludedAmount: 0 },
    { carryAmount: -1, excludedAmount: 2 }, { carryAmount: 0.001, excludedAmount: 0 },
    { carryAmount: NaN, excludedAmount: 0 }, { carryAmount: Infinity, excludedAmount: 0 }]) {
    assert.throws(() => parseCloseMonthInput(payload), { statusCode: 400 });
  }
});
