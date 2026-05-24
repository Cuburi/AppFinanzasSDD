import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";
import type { DebtView } from "../types";

const openDebt: DebtView = {
  id: "debt-rent",
  direction: "I_OWE",
  counterpartyName: "Laura",
  description: "Rent split",
  totalAmount: 300000,
  currency: "COP",
  originDate: "2026-05-20T00:00:00.000Z",
  remainingBalance: 200000,
  status: "OPEN",
  payments: [
    {
      id: "payment-1",
      amount: 100000,
      paidAt: "2026-05-21T00:00:00.000Z",
      notes: "First payment",
    },
  ],
};

describe("debts api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists debts from the backend list envelope", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ debts: [openDebt] }), { status: 200 }));

    await expect(api.getDebts()).resolves.toEqual([openDebt]);

    expect(fetch).toHaveBeenCalledWith("/api/debts");
  });

  it("creates debts and registers payments with the explicit backend contracts", async () => {
    const paidDebt = { ...openDebt, remainingBalance: 0, status: "PAID" as const };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(openDebt), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(paidDebt), { status: 201 }));

    await expect(
      api.createDebt({
        direction: "I_OWE",
        counterpartyName: "Laura",
        totalAmount: 300000,
        originDate: "2026-05-20",
        description: "Rent split",
      }),
    ).resolves.toEqual(openDebt);
    await expect(api.registerDebtPayment("debt-rent", { amount: 200000, paidAt: "2026-05-22", notes: "Final payment" })).resolves.toEqual(paidDebt);

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: "I_OWE",
        counterpartyName: "Laura",
        totalAmount: 300000,
        originDate: "2026-05-20",
        description: "Rent split",
      }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/debts/debt-rent/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 200000, paidAt: "2026-05-22", notes: "Final payment" }),
    });
  });

  it("propagates backend debt validation errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: "Payment exceeds remaining balance." }), { status: 409 }));

    await expect(api.registerDebtPayment("debt-rent", { amount: 999999, paidAt: "2026-05-22" })).rejects.toThrow("Payment exceeds remaining balance.");
  });
});
