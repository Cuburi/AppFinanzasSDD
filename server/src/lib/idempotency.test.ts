import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryIdempotencyStore, runIdempotentCreate, type IdempotencyStore } from "./idempotency.js";

const request = (body: unknown, key = "request-key-1", path = "/api/months/month-1/expenses") =>
  ({
    method: "POST",
    originalUrl: path,
    body,
    header(name: string) {
      return name.toLowerCase() === "idempotency-key" ? key : undefined;
    },
  }) as never;

test("runIdempotentCreate replays the original response for the same key and fingerprint", async () => {
  const store = createMemoryIdempotencyStore();
  let calls = 0;
  const execute = async () => {
    calls += 1;
    return { statusCode: 201, body: { id: `created-${calls}` } };
  };

  const first = await runIdempotentCreate({ request: request({ amount: 10 }), scope: "expenses", store, execute });
  const replay = await runIdempotentCreate({ request: request({ amount: 10 }), scope: "expenses", store, execute });

  assert.deepEqual(first, { statusCode: 201, body: { id: "created-1" } });
  assert.deepEqual(replay, first);
  assert.equal(calls, 1);
});

test("runIdempotentCreate rejects same-key requests with a different fingerprint before execution", async () => {
  const store = createMemoryIdempotencyStore();
  let calls = 0;
  const execute = async () => {
    calls += 1;
    return { statusCode: 201, body: { id: `created-${calls}` } };
  };

  await runIdempotentCreate({ request: request({ amount: 10 }), scope: "expenses", store, execute });
  const conflict = await runIdempotentCreate({ request: request({ amount: 20 }), scope: "expenses", store, execute });

  assert.deepEqual(conflict, { statusCode: 409, body: { message: "Idempotency-Key was already used for a different request." } });
  assert.equal(calls, 1);
});

test("runIdempotentCreate preserves current behavior when the key is missing", async () => {
  const store = createMemoryIdempotencyStore();
  let calls = 0;
  const missingKeyRequest = {
    method: "POST",
    originalUrl: "/api/months/month-1/expenses",
    body: { amount: 10 },
    header() {
      return undefined;
    },
  } as never;

  await runIdempotentCreate({ request: missingKeyRequest, scope: "expenses", store, execute: async () => ({ statusCode: 201, body: { id: ++calls } }) });
  await runIdempotentCreate({ request: missingKeyRequest, scope: "expenses", store, execute: async () => ({ statusCode: 201, body: { id: ++calls } }) });

  assert.equal(calls, 2);
});


test("runIdempotentCreate abandons a reservation when execution fails before a response is stored", async () => {
  const store = createMemoryIdempotencyStore();
  let calls = 0;

  await assert.rejects(
    runIdempotentCreate({
      request: request({ amount: 10 }),
      scope: "expenses",
      store,
      execute: async () => {
        calls += 1;
        throw new Error("database timeout");
      },
    }),
    /database timeout/,
  );

  const retry = await runIdempotentCreate({
    request: request({ amount: 10 }),
    scope: "expenses",
    store,
    execute: async () => {
      calls += 1;
      return { statusCode: 201, body: { id: "created-after-retry" } };
    },
  });

  assert.deepEqual(retry, { statusCode: 201, body: { id: "created-after-retry" } });
  assert.equal(calls, 2);
});

test("runIdempotentCreate stores a replayable failure when response persistence fails", async () => {
  const memory = createMemoryIdempotencyStore();
  const store: IdempotencyStore = {
    reserve: (record) => memory.reserve(record),
    async complete() {
      throw new Error("idempotency response persistence failed");
    },
    failCompletion: (requestKey, scope) => memory.failCompletion(requestKey, scope),
    abandon: (requestKey, scope) => memory.abandon(requestKey, scope),
  };
  let calls = 0;

  await assert.rejects(
    runIdempotentCreate({
      request: request({ amount: 10 }),
      scope: "expenses",
      store,
      execute: async () => {
        calls += 1;
        return { statusCode: 201, body: { id: "created-before-persist-failure" } };
      },
    }),
    /idempotency response persistence failed/,
  );

  const retry = await runIdempotentCreate({
    request: request({ amount: 10 }),
    scope: "expenses",
    store,
    execute: async () => {
      calls += 1;
      return { statusCode: 201, body: { id: "duplicate" } };
    },
  });

  assert.deepEqual(retry, {
    statusCode: 500,
    body: { message: "Idempotent request completed, but its replay response could not be stored." },
  });
  assert.equal(calls, 1);
});
