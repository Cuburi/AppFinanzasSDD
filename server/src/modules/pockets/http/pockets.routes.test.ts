import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createPocketsRouter, type PocketsHttpService } from "./pockets.routes.js";

const compatiblePocket = {
  id: "pocket-contract",
  name: "Emergency",
  goalAmount: 1000,
  active: true,
  balance: 275,
  recentMovements: [
    {
      id: "movement-1",
      type: "POCKET_DEPOSIT_EXTERNAL",
      sourceKind: "EXTERNAL" as const,
      sourceLabel: "Tax refund",
      amount: 50,
      occurredAt: "2026-05-13T00:00:00.000Z",
      description: null,
      direction: "in" as const,
    },
  ],
};

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

test("createPocketsRouter preserves byte-compatible list and detail response shapes", async () => {
  const service: PocketsHttpService = {
    async listPockets() {
      return { pockets: [compatiblePocket] };
    },
    async getPocket() {
      return compatiblePocket;
    },
    async createPocket() {
      return compatiblePocket;
    },
    async updatePocket() {
      return compatiblePocket;
    },
    async deactivatePocket() {
      return { ...compatiblePocket, active: false };
    },
  };
  const server = createTestServer(service);

  try {
    const listResponse = await request(server, "/api/pockets");
    const detailResponse = await request(server, "/api/pockets/pocket-contract");
    const deleteResponse = await request(server, "/api/pockets/pocket-contract", { method: "DELETE" });

    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), { pockets: [compatiblePocket] });
    assert.equal(detailResponse.status, 200);
    assert.deepEqual(await detailResponse.json(), compatiblePocket);
    assert.equal(deleteResponse.status, 200);
    assert.equal((await deleteResponse.json()).active, false);
  } finally {
    server.close();
  }
});
