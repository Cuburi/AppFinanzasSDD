import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";

const pocketPayload = {
  id: "pocket-emergency",
  name: "Emergencias",
  goalAmount: 1000,
  active: true,
  balance: 250,
  recentMovements: [
    {
      id: "move-1",
      amount: 250,
      description: "Ahorro inicial",
      occurredAt: "2026-05-10T12:00:00.000Z",
      direction: "in",
    },
  ],
};

describe("pockets api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists active pockets using the backend active filter", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ pockets: [pocketPayload] }), { status: 200 }));

    await expect(api.getPockets("active")).resolves.toEqual([pocketPayload]);

    expect(fetch).toHaveBeenCalledWith("/api/pockets?active=true");
  });

  it("creates, updates, deactivates, and reads pocket details with explicit contracts", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(pocketPayload), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...pocketPayload, name: "Reserva" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...pocketPayload, active: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(pocketPayload), { status: 200 }));

    await expect(api.createPocket({ name: "Emergencias", goalAmount: 1000 })).resolves.toEqual(pocketPayload);
    await expect(api.updatePocket("pocket-emergency", { name: "Reserva", goalAmount: null })).resolves.toMatchObject({ name: "Reserva" });
    await expect(api.deactivatePocket("pocket-emergency")).resolves.toMatchObject({ active: false });
    await expect(api.getPocket("pocket-emergency")).resolves.toEqual(pocketPayload);

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/pockets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Emergencias", goalAmount: 1000 }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/pockets/pocket-emergency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Reserva", goalAmount: null }),
    });
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/pockets/pocket-emergency", { method: "DELETE" });
    expect(fetch).toHaveBeenNthCalledWith(4, "/api/pockets/pocket-emergency");
  });
});

describe("monthly cash and expense api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records expenses with payment method and occurred date", async () => {
    const monthPayload = { id: "month-1", cashBalance: 40 };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 200 }));

    await expect(
      api.recordExpense({
        monthId: "month-1",
        sourceSubcategoryId: "sub-food",
        amount: 25,
        description: "Lunch",
        occurredAt: "2026-05-12",
        paymentMethod: "CASH",
      }),
    ).resolves.toEqual(monthPayload);

    expect(fetch).toHaveBeenCalledWith("/api/months/month-1/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceSubcategoryId: "sub-food",
        amount: 25,
        description: "Lunch",
        occurredAt: "2026-05-12",
        paymentMethod: "CASH",
      }),
    });
  });

  it("lists expense history using optional filters", async () => {
    const historyPayload = {
      expenses: [
        {
          id: "expense-1",
          occurredAt: "2026-05-12T00:00:00.000Z",
          paymentMethod: "NON_CASH",
          amount: 75,
          description: "Groceries",
          category: { id: "cat-food", name: "Food" },
          subcategory: { id: "sub-grocery", name: "Groceries" },
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(historyPayload), { status: 200 }));

    await expect(
      api.getExpenseHistory("month-1", {
        from: "2026-05-01",
        to: "2026-05-31",
        paymentMethod: "NON_CASH",
        subcategoryId: "sub-grocery",
      }),
    ).resolves.toEqual(historyPayload.expenses);

    expect(fetch).toHaveBeenCalledWith("/api/months/month-1/expenses?from=2026-05-01&to=2026-05-31&paymentMethod=NON_CASH&subcategoryId=sub-grocery");
  });

  it("withdraws cash and reads the cash summary contract", async () => {
    const monthPayload = { month: { id: "month-1", cashBalance: 125 } };
    const cashPayload = {
      monthId: "month-1",
      cashBalance: 125,
      events: [
        {
          id: "cash-1",
          type: "CASH_WITHDRAWAL",
          amount: 125,
          occurredAt: "2026-05-10T00:00:00.000Z",
          description: "ATM",
        },
      ],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(cashPayload), { status: 200 }));

    await expect(api.withdrawCash({ monthId: "month-1", amount: 125, occurredAt: "2026-05-10", description: "ATM" })).resolves.toEqual(monthPayload.month);
    await expect(api.getCashSummary("month-1")).resolves.toEqual(cashPayload);

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/months/month-1/cash-withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 125, occurredAt: "2026-05-10", description: "ATM" }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/months/month-1/cash");
  });
});
