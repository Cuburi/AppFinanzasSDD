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

test("closure HTTP validates before delegation, supports bodyless baseline, and reloads persisted results", async () => {
  const calls: unknown[] = [];
  const closed = { id: "month-1", status: "CLOSED", openingBalance: 0, openingSourceMonthId: null,
    closureAllocation: { availableMoney: 0.3, carryAmount: 0.1, excludedAmount: 0.2 } };
  const app = express();
  app.use(express.json());
  app.use("/api", createMonthlyCycleRouter({
    async closeMonth(...args) { calls.push(args); return closed as never; },
    async getMonth(id) {
      if (id === "missing") throw new DomainError(404, "No se encontró el mes.");
      calls.push(["read", id]); return closed as never;
    },
    async getLatestClosedMonth() { calls.push(["latest"]); return closed as never; },
    async getActiveMonth() { calls.push(["active"]); return null; },
  }));
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}/api`;
    for (const payload of [{}, { carryAmount: 0.1 }, { carryAmount: 0.001, excludedAmount: 0.299 }, { carryAmount: "0.1", excludedAmount: 0.2 }]) {
      const response = await fetch(`${url}/months/month-1/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { message: "Los montos del cierre deben ser números finitos no negativos con máximo dos decimales." });
      assert.deepEqual(calls, []);
    }
    const response = await fetch(`${url}/months/month-1/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ carryAmount: 0.1, excludedAmount: 0.2 }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), closed);
    const bodyless = await fetch(`${url}/months/month-1/close`, { method: "POST" });
    assert.equal(bodyless.status, 200);
    assert.deepEqual(await bodyless.json(), closed);
    for (const [path, expected] of [["/months/month-1", closed], ["/months/latest-closed", { month: closed }], ["/months/active", { month: null }]] as const) {
      const read = await fetch(`${url}${path}`);
      assert.equal(read.status, 200);
      assert.deepEqual(await read.json(), expected);
    }
    const missing = await fetch(`${url}/months/missing`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { message: "No se encontró el mes." });
    assert.deepEqual(calls, [["month-1", { carryAmount: 0.1, excludedAmount: 0.2 }], ["month-1"], ["read", "month-1"], ["latest"], ["active"]]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
