import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createCreditCardsRouter, type CreditCardsHttpService } from "./credit-cards.routes.js";

const card = { id: "card-1", ownerId: "owner-1", issuer: "Visa", name: "Main", limit: null, closingDay: 15, dueDay: 28, active: true };

const createTestServer = (service: CreditCardsHttpService) => {
  const app = express();
  app.use(express.json());
  app.use("/api", createCreditCardsRouter({ service, ownerProvider: () => "owner-1" }));
  return app.listen(0);
};

const request = async (server: ReturnType<typeof createTestServer>, path: string, init?: RequestInit) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");
  return fetch(`http://127.0.0.1:${address.port}${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
};

test("credit card router exposes lifecycle endpoints with owner seam", async () => {
  const owners: string[] = [];
  const service: CreditCardsHttpService = {
    async listCreditCards(ownerId) {
      owners.push(ownerId);
      return { cards: [card] };
    },
    async getCreditCard(ownerId) {
      owners.push(ownerId);
      return card;
    },
    async createCreditCard(ownerId) {
      owners.push(ownerId);
      return card;
    },
    async updateCreditCard(ownerId) {
      owners.push(ownerId);
      return { ...card, name: "Renamed" };
    },
    async activateCreditCard(ownerId) {
      owners.push(ownerId);
      return card;
    },
    async inactivateCreditCard(ownerId) {
      owners.push(ownerId);
      return { ...card, active: false };
    },
  };
  const server = createTestServer(service);

  try {
    const list = await request(server, "/api/credit-cards");
    const created = await request(server, "/api/credit-cards", { method: "POST", body: JSON.stringify({ issuer: "Visa", name: "Main", closingDay: 15, dueDay: 28 }) });
    const inactive = await request(server, "/api/credit-cards/card-1/inactivate", { method: "PATCH" });

    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), { cards: [card] });
    assert.equal(created.status, 201);
    assert.equal((await inactive.json()).active, false);
    assert.deepEqual(owners, ["owner-1", "owner-1", "owner-1"]);
  } finally {
    server.close();
  }
});

test("credit card router rejects invalid create payload before persistence", async () => {
  const service: CreditCardsHttpService = {
    async listCreditCards() {
      return { cards: [] };
    },
    async getCreditCard() {
      return card;
    },
    async createCreditCard() {
      throw new Error("Should not persist invalid payload.");
    },
    async updateCreditCard() {
      return card;
    },
    async activateCreditCard() {
      return card;
    },
    async inactivateCreditCard() {
      return card;
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/credit-cards", { method: "POST", body: JSON.stringify({ issuer: "", name: "Main", closingDay: 0, dueDay: 28 }) });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /issuer/i);
  } finally {
    server.close();
  }
});

test("credit card router returns one owned card by id", async () => {
  const calls: unknown[] = [];
  const service: CreditCardsHttpService = {
    async listCreditCards() {
      return { cards: [] };
    },
    async getCreditCard(ownerId, id) {
      calls.push({ ownerId, id });
      return card;
    },
    async createCreditCard() {
      return card;
    },
    async updateCreditCard() {
      return card;
    },
    async activateCreditCard() {
      return card;
    },
    async inactivateCreditCard() {
      return card;
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/credit-cards/card-1");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), card);
    assert.deepEqual(calls, [{ ownerId: "owner-1", id: "card-1" }]);
  } finally {
    server.close();
  }
});

test("credit card router patches one owned card with parsed update input", async () => {
  const calls: unknown[] = [];
  const service: CreditCardsHttpService = {
    async listCreditCards() {
      return { cards: [] };
    },
    async getCreditCard() {
      return card;
    },
    async createCreditCard() {
      return card;
    },
    async updateCreditCard(ownerId, id, input) {
      calls.push({ ownerId, id, input });
      return { ...card, name: "Renamed", limit: 999.99 };
    },
    async activateCreditCard() {
      return card;
    },
    async inactivateCreditCard() {
      return card;
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/credit-cards/card-1", { method: "PATCH", body: JSON.stringify({ name: "Renamed", limit: 999.99 }) });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).name, "Renamed");
    assert.deepEqual(calls, [{ ownerId: "owner-1", id: "card-1", input: { name: "Renamed", limit: 999.99 } }]);
  } finally {
    server.close();
  }
});

test("credit card router activates one owned card", async () => {
  const calls: unknown[] = [];
  const service: CreditCardsHttpService = {
    async listCreditCards() {
      return { cards: [] };
    },
    async getCreditCard() {
      return card;
    },
    async createCreditCard() {
      return card;
    },
    async updateCreditCard() {
      return card;
    },
    async activateCreditCard(ownerId, id) {
      calls.push({ ownerId, id });
      return { ...card, active: true };
    },
    async inactivateCreditCard() {
      return { ...card, active: false };
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/credit-cards/card-1/activate", { method: "PATCH" });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).active, true);
    assert.deepEqual(calls, [{ ownerId: "owner-1", id: "card-1" }]);
  } finally {
    server.close();
  }
});
