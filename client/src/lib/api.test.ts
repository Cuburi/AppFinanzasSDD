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

describe("credit cards api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists credit cards with the backend active filter and unwraps cards", async () => {
    const cards = [
      {
        id: "card-1",
        ownerId: "owner-1",
        issuer: "Visa",
        name: "Main",
        limit: 2500,
        closingDay: 20,
        dueDay: 28,
        active: true,
      },
    ];
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ cards }), { status: 200 }));

    await expect(api.getCreditCards("all")).resolves.toEqual(cards);

    expect(fetch).toHaveBeenCalledWith("/api/credit-cards?active=all");
  });

  it("reads current statement summaries without unwrapping the estimation label", async () => {
    const statementPayload = {
      estimation: "APP_ESTIMATED",
      cards: [
        {
          creditCardId: "card-1",
          issuer: "Visa",
          name: "Main",
          limit: 2500,
          cycleStart: "2026-07-21",
          cycleEnd: "2026-08-20",
          cutoffDate: "2026-08-20",
          dueDate: "2026-08-28",
          estimatedSpent: 410.5,
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(statementPayload), { status: 200 }));

    await expect(api.getCurrentCreditCardStatements()).resolves.toEqual(statementPayload);

    expect(fetch).toHaveBeenCalledWith("/api/credit-cards/statements/current");
  });

  it("propagates backend error messages from credit-card endpoints", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: "Credit cards unavailable." }), { status: 503 }));

    await expect(api.getCreditCards()).rejects.toThrow("Credit cards unavailable.");
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

  it("updates and deletes active-month expenses through correction endpoints", async () => {
    const monthPayload = { id: "month-1", availableMoney: 425, cashBalance: 95 };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...monthPayload, availableMoney: 450 }), { status: 200 }));

    await expect(
      api.updateExpense({
        monthId: "month-1",
        expenseId: "expense-1",
        sourceSubcategoryId: "sub-food",
        amount: 30,
        description: "Dinner",
        occurredAt: "2026-05-14",
        paymentMethod: "NON_CASH",
      }),
    ).resolves.toEqual(monthPayload);
    await expect(api.deleteExpense("month-1", "expense-1")).resolves.toMatchObject({ availableMoney: 450 });

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/months/month-1/expenses/expense-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceSubcategoryId: "sub-food",
        amount: 30,
        description: "Dinner",
        occurredAt: "2026-05-14",
        paymentMethod: "NON_CASH",
      }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/months/month-1/expenses/expense-1", { method: "DELETE" });
  });

  it("updates and deletes active-month snapshot categories and subcategories", async () => {
    const monthPayload = { id: "month-1", categories: [{ id: "cat-food", name: "Food" }] };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...monthPayload, categories: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 200 }));

    await expect(api.updateMonthCategory({ monthId: "month-1", categoryId: "cat-food", name: "Food updated" })).resolves.toEqual(monthPayload);
    await expect(api.deleteMonthCategory("month-1", "cat-food")).resolves.toMatchObject({ categories: [] });
    await expect(
      api.updateMonthSubcategory({
        monthId: "month-1",
        subcategoryId: "sub-groceries",
        name: "Groceries updated",
        plannedAmount: 225,
        defaultPocketId: null,
      }),
    ).resolves.toEqual(monthPayload);
    await expect(api.deleteMonthSubcategory("month-1", "sub-groceries")).resolves.toEqual(monthPayload);

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/months/month-1/categories/cat-food", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Food updated" }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/months/month-1/categories/cat-food", { method: "DELETE" });
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/months/month-1/subcategories/sub-groceries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Groceries updated", plannedAmount: 225, defaultPocketId: null }),
    });
    expect(fetch).toHaveBeenNthCalledWith(4, "/api/months/month-1/subcategories/sub-groceries", { method: "DELETE" });
  });

  it("creates active-month categories with explicit template promotion intent", async () => {
    const monthPayload = { id: "month-1", categories: [{ id: "cat-gifts", name: "Gifts" }] };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 201 }));

    await expect(api.createMonthCategory({ monthId: "month-1", name: "Gifts", addToTemplate: false })).resolves.toEqual(monthPayload);

    expect(fetch).toHaveBeenCalledWith("/api/months/month-1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gifts", addToTemplate: false }),
    });
  });

  it("creates active-month subcategories under the selected parent with zero planned amount and optional pocket", async () => {
    const monthPayload = { id: "month-1", categories: [{ id: "cat-food", subcategories: [{ id: "sub-snacks", name: "Snacks" }] }] };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(monthPayload), { status: 201 }));

    await expect(
      api.createMonthSubcategory({
        monthId: "month-1",
        categoryId: "cat-food",
        name: "Snacks",
        plannedAmount: 0,
        defaultPocketId: "pocket-emergency",
        addToTemplate: true,
      }),
    ).resolves.toEqual(monthPayload);

    expect(fetch).toHaveBeenCalledWith("/api/months/month-1/categories/cat-food/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Snacks", plannedAmount: 0, defaultPocketId: "pocket-emergency", addToTemplate: true }),
    });
  });

  it("surfaces 409 deletion guard messages from month correction endpoints", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: "Cannot delete subcategory because associated movements exist." }), { status: 409 }));

    await expect(api.deleteMonthSubcategory("month-1", "sub-groceries")).rejects.toThrow("Cannot delete subcategory because associated movements exist.");
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

  it("reads the basic monthly report from the month report endpoint", async () => {
    const reportPayload = {
      summary: {
        monthId: "month-1",
        year: 2026,
        month: 5,
        status: "ACTIVE",
        monthlyIncomeTotal: 3200,
        availableMoney: 850,
        cashBalance: 120,
        totalPlanned: 2100,
        totalSpentCash: 75,
        totalSpentNonCash: 225,
      },
      topSpendingSubcategories: [
        {
          subcategoryId: "sub-groceries",
          subcategoryName: "Groceries",
          categoryId: "cat-living",
          categoryName: "Living",
          amount: 225,
        },
      ],
      surplusSubcategories: [
        {
          subcategoryId: "sub-savings",
          subcategoryName: "Savings",
          categoryId: "cat-future",
          categoryName: "Future",
          amount: 300,
        },
      ],
      deficitSubcategories: [
        {
          subcategoryId: "sub-rent",
          subcategoryName: "Rent",
          categoryId: "cat-home",
          categoryName: "Home",
          amount: -50,
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(reportPayload), { status: 200 }));

    await expect(api.getBasicReport("month-1")).resolves.toEqual(reportPayload);

    expect(fetch).toHaveBeenCalledWith("/api/months/month-1/reports/basic");
  });
});
