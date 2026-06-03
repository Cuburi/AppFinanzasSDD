import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createHealthRouter } from "./health.js";

const createTestServer = (checkDatabase: () => Promise<void>) => {
  const app = express();
  app.use(createHealthRouter({ checkDatabase }));

  return app.listen(0);
};

const request = async (server: ReturnType<typeof createTestServer>, path: string) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

  return fetch(`http://127.0.0.1:${address.port}${path}`);
};

test("health route reports API and database readiness", async () => {
  let calls = 0;
  const server = createTestServer(async () => {
    calls += 1;
  });

  try {
    const response = await request(server, "/health");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", database: "ok" });
    assert.equal(calls, 1);
  } finally {
    server.close();
  }
});

test("health route distinguishes database failure from API process readiness", async () => {
  const server = createTestServer(async () => {
    throw new Error("database unavailable");
  });

  try {
    const response = await request(server, "/health");

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: "degraded",
      database: "error",
      message: "database unavailable",
    });
  } finally {
    server.close();
  }
});

test("health route is available through the API proxy path", async () => {
  const server = createTestServer(async () => undefined);

  try {
    const response = await request(server, "/api/health");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", database: "ok" });
  } finally {
    server.close();
  }
});
