import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { debtsRouter } from "./routes.js";
import { DomainError } from "./service.js";
import type { DebtView } from "./shared/types.js";

const openDebt: DebtView = {
  id: "debt-1",
  direction: "I_OWE",
  counterpartyName: "Banco",
  description: "Crédito",
  totalAmount: 100,
  currency: "COP",
  originDate: "2026-05-01T00:00:00.000Z",
  remainingBalance: 70,
  status: "OPEN",
  payments: [{ id: "payment-1", amount: 30, paidAt: "2026-05-03T00:00:00.000Z", notes: "Abono" }],
};

const createTestServer = (service: Parameters<typeof debtsRouter>[0]) => {
  const app = express();
  app.use(express.json());
  app.use("/api", debtsRouter(service));

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

test("debtsRouter exposes GET /api/debts with stable debt API shape", async () => {
  const service = {
    async listDebts() {
      return [openDebt];
    },
    async createDebt() {
      throw new Error("Not used in this test.");
    },
    async registerPayment() {
      throw new Error("Not used in this test.");
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/debts");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { debts: [openDebt] });
  } finally {
    server.close();
  }
});

test("debtsRouter parses POST /api/debts payloads and fixes currency to COP", async () => {
  const calls: unknown[] = [];
  const service = {
    async listDebts() {
      throw new Error("Not used in this test.");
    },
    async createDebt(input: unknown) {
      calls.push(input);
      return { ...openDebt, payments: [], remainingBalance: 100 };
    },
    async registerPayment() {
      throw new Error("Not used in this test.");
    },
  };
  const server = createTestServer(service);

  try {
    const response = await request(server, "/api/debts", {
      method: "POST",
      body: JSON.stringify({
        direction: "I_OWE",
        counterpartyName: "Banco",
        description: "Crédito",
        totalAmount: "100",
        originDate: "2026-05-01T00:00:00.000Z",
      }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ...openDebt, payments: [], remainingBalance: 100 });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      direction: "I_OWE",
      counterpartyName: "Banco",
      description: "Crédito",
      totalAmount: 100,
      currency: "COP",
      originDate: new Date("2026-05-01T00:00:00.000Z"),
    });
  } finally {
    server.close();
  }
});

test("debtsRouter rejects invalid create shapes before workflow execution", async () => {
  let createCalls = 0;
  const service = {
    async listDebts() {
      throw new Error("Not used in this test.");
    },
    async createDebt() {
      createCalls += 1;
      throw new Error("Invalid create payload should not reach the workflow.");
    },
    async registerPayment() {
      throw new Error("Not used in this test.");
    },
  };
  const server = createTestServer(service);

  try {
    const amountResponse = await request(server, "/api/debts", {
      method: "POST",
      body: JSON.stringify({ direction: "I_OWE", counterpartyName: "Banco", totalAmount: 0, originDate: "2026-05-01T00:00:00.000Z" }),
    });
    const currencyResponse = await request(server, "/api/debts", {
      method: "POST",
      body: JSON.stringify({ direction: "I_OWE", counterpartyName: "Banco", totalAmount: 100, currency: "USD", originDate: "2026-05-01T00:00:00.000Z" }),
    });

    assert.equal(amountResponse.status, 400);
    assert.deepEqual(await amountResponse.json(), { message: "Debt amount must be positive." });
    assert.equal(currencyResponse.status, 400);
    assert.deepEqual(await currencyResponse.json(), { message: "Debt currency must be COP." });
    assert.equal(createCalls, 0);
  } finally {
    server.close();
  }
});

test("debtsRouter parses payment payloads and maps overpayment domain errors", async () => {
  const calls: unknown[] = [];
  const service = {
    async listDebts() {
      throw new Error("Not used in this test.");
    },
    async createDebt() {
      throw new Error("Not used in this test.");
    },
    async registerPayment(debtId: string, input: unknown) {
      calls.push({ debtId, input });
      if (calls.length === 2) {
        throw new DomainError(409, "Payment exceeds remaining debt balance.");
      }
      return { ...openDebt, remainingBalance: 50, payments: [...openDebt.payments, { id: "payment-2", amount: 20, paidAt: "2026-05-04T00:00:00.000Z", notes: null }] };
    },
  };
  const server = createTestServer(service);

  try {
    const validResponse = await request(server, "/api/debts/debt-1/payments", {
      method: "POST",
      body: JSON.stringify({ amount: "20", paidAt: "2026-05-04T00:00:00.000Z" }),
    });
    const overpaymentResponse = await request(server, "/api/debts/debt-1/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 80, paidAt: "2026-05-05T00:00:00.000Z" }),
    });

    assert.equal(validResponse.status, 201);
    assert.equal((await validResponse.json()).remainingBalance, 50);
    assert.equal(overpaymentResponse.status, 409);
    assert.deepEqual(await overpaymentResponse.json(), { message: "Payment exceeds remaining debt balance." });
    assert.deepEqual(calls, [
      { debtId: "debt-1", input: { amount: 20, paidAt: new Date("2026-05-04T00:00:00.000Z"), notes: null } },
      { debtId: "debt-1", input: { amount: 80, paidAt: new Date("2026-05-05T00:00:00.000Z"), notes: null } },
    ]);
  } finally {
    server.close();
  }
});

test("debtsRouter rejects invalid payment shapes before workflow execution", async () => {
  let paymentCalls = 0;
  const service = {
    async listDebts() {
      throw new Error("Not used in this test.");
    },
    async createDebt() {
      throw new Error("Not used in this test.");
    },
    async registerPayment() {
      paymentCalls += 1;
      throw new Error("Invalid payment payload should not reach the workflow.");
    },
  };
  const server = createTestServer(service);

  try {
    const amountResponse = await request(server, "/api/debts/debt-1/payments", {
      method: "POST",
      body: JSON.stringify({ amount: -1, paidAt: "2026-05-04T00:00:00.000Z" }),
    });
    const dateResponse = await request(server, "/api/debts/debt-1/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 20, paidAt: "not-a-date" }),
    });

    assert.equal(amountResponse.status, 400);
    assert.deepEqual(await amountResponse.json(), { message: "Payment amount must be positive." });
    assert.equal(dateResponse.status, 400);
    assert.deepEqual(await dateResponse.json(), { message: "Payment date must be a valid date." });
    assert.equal(paymentCalls, 0);
  } finally {
    server.close();
  }
});
