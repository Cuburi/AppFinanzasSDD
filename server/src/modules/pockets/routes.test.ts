import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { DomainError } from "./domain/pocket-errors.js";
import { createPocketsRouter, type PocketsHttpService } from "./http/pockets.routes.js";

const createTestServer = (service: PocketsHttpService) => {
  const app = express();
  app.use(express.json());
  app.use("/api", createPocketsRouter(service));

  return app.listen(0);
};

const request = async (server: ReturnType<typeof createTestServer>, path: string, init?: RequestInit) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
};

const pocketView = (overrides: Partial<Awaited<ReturnType<PocketsHttpService["getPocket"]>>> = {}) => ({
  id: "pocket-1",
  name: "Auto",
  goalAmount: null,
  active: true,
  balance: 0,
  recentMovements: [],
  ...overrides,
});

test("pocketsRouter exposes list, get, and create endpoints under /api/pockets", async () => {
  const calls: unknown[] = [];
  const service = {
    async listPockets(filter: unknown) {
      calls.push(filter);
      return { pockets: [pocketView()] };
    },
    async getPocket(id: string) {
      calls.push({ id });
      return pocketView({ id, balance: 25 });
    },
    async createPocket(input: unknown) {
      calls.push(input);
      return pocketView({ id: "pocket-2", name: "Viaje", goalAmount: 1500 });
    },
    async updatePocket() {
      throw new Error("Not used in this test.");
    },
    async deactivatePocket() {
      throw new Error("Not used in this test.");
    },
  };
  const server = createTestServer(service);

  try {
    const listResponse = await request(server, "/api/pockets?active=all");
    const detailResponse = await request(server, "/api/pockets/pocket-1");
    const createResponse = await request(server, "/api/pockets", {
      method: "POST",
      body: JSON.stringify({ name: "Viaje", goalAmount: "1500" }),
    });

    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), {
      pockets: [pocketView()],
    });
    assert.equal(detailResponse.status, 200);
    assert.deepEqual(await detailResponse.json(), pocketView({ id: "pocket-1", balance: 25 }));
    assert.equal(createResponse.status, 201);
    assert.equal((await createResponse.json()).name, "Viaje");
    assert.deepEqual(calls, [{ active: "all" }, { id: "pocket-1" }, { name: "Viaje", goalAmount: 1500 }]);
  } finally {
    server.close();
  }
});

test("pocketsRouter maps domain errors and supports soft deactivation", async () => {
  const service = {
    async listPockets() {
      throw new Error("Not used in this test.");
    },
    async getPocket() {
      throw new Error("Not used in this test.");
    },
    async createPocket() {
      throw new DomainError(409, "A pocket with that name already exists.");
    },
    async updatePocket() {
      throw new Error("Not used in this test.");
    },
    async deactivatePocket(id: string) {
      return { id, name: "Auto", goalAmount: null, active: false, balance: 25, recentMovements: [] };
    },
  };
  const server = createTestServer(service);

  try {
    const duplicateResponse = await request(server, "/api/pockets", {
      method: "POST",
      body: JSON.stringify({ name: "Auto" }),
    });
    const deactivateResponse = await request(server, "/api/pockets/pocket-1", { method: "DELETE" });

    assert.equal(duplicateResponse.status, 409);
    assert.deepEqual(await duplicateResponse.json(), { message: "A pocket with that name already exists." });
    assert.equal(deactivateResponse.status, 200);
    assert.equal((await deactivateResponse.json()).active, false);
  } finally {
    server.close();
  }
});

test("pocketsRouter rejects invalid create and update payloads with existing messages", async () => {
  const service = {
    async listPockets() {
      throw new Error("Not used in this test.");
    },
    async getPocket() {
      throw new Error("Not used in this test.");
    },
    async createPocket() {
      throw new Error("Invalid create payload should not reach service.");
    },
    async updatePocket() {
      throw new Error("Invalid update payload should not reach service.");
    },
    async deactivatePocket() {
      throw new Error("Not used in this test.");
    },
  };
  const server = createTestServer(service);

  try {
    const createResponse = await request(server, "/api/pockets", { method: "POST", body: JSON.stringify({ name: "", goalAmount: -1 }) });
    const updateResponse = await request(server, "/api/pockets/pocket-1", { method: "PATCH", body: JSON.stringify({ active: "maybe" }) });

    assert.equal(createResponse.status, 400);
    assert.deepEqual(await createResponse.json(), { message: "Pocket name is required." });
    assert.equal(updateResponse.status, 400);
    assert.deepEqual(await updateResponse.json(), { message: "Pocket active flag must be a boolean." });
  } finally {
    server.close();
  }
});

test("pocketsRouter PATCH passes active semantics through unchanged", async () => {
  const calls: unknown[] = [];
  const service = {
    async listPockets() {
      throw new Error("Not used in this test.");
    },
    async getPocket() {
      throw new Error("Not used in this test.");
    },
    async createPocket() {
      throw new Error("Not used in this test.");
    },
    async updatePocket(id: string, input: unknown) {
      calls.push({ id, input });
      return pocketView({ id, active: false });
    },
    async deactivatePocket() {
      throw new Error("Not used in this test.");
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/pockets/pocket-1", { method: "PATCH", body: JSON.stringify({ active: false }) });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), pocketView({ id: "pocket-1", active: false }));
    assert.deepEqual(calls, [{ id: "pocket-1", input: { active: false } }]);
  } finally {
    server.close();
  }
});

test("pocketsRouter does not expose action-style deactivate endpoint", async () => {
  const service = {
    async listPockets() {
      throw new Error("Not used in this test.");
    },
    async getPocket() {
      throw new Error("Not used in this test.");
    },
    async createPocket() {
      throw new Error("Not used in this test.");
    },
    async updatePocket() {
      throw new Error("Not used in this test.");
    },
    async deactivatePocket() {
      throw new Error("DELETE /pockets/:id should be the only deactivation endpoint.");
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/pockets/pocket-1/deactivate", { method: "POST" });

    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});
