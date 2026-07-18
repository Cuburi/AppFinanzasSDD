import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreditCardsPage } from "./CreditCardsPage";
import type { CreditCardStatementSummaryListView, CreditCardView } from "../types";

const apiMock = vi.hoisted(() => ({
  getCreditCards: vi.fn(),
  getCurrentCreditCardStatements: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

const cards: CreditCardView[] = [
  {
    id: "card-1",
    ownerId: "owner-1",
    issuer: "Visa",
    name: "Main card",
    limit: 2500,
    closingDay: 20,
    dueDay: 28,
    active: true,
  },
  {
    id: "card-2",
    ownerId: "owner-1",
    issuer: "Mastercard",
    name: "Travel card",
    limit: null,
    closingDay: 5,
    dueDay: 12,
    active: false,
  },
];

const statements: CreditCardStatementSummaryListView = {
  estimation: "APP_ESTIMATED",
  cards: [
    {
      creditCardId: "card-1",
      issuer: "Visa",
      name: "Main card",
      limit: 2500,
      closedStatement: {
        periodStart: "2026-06-21",
        periodEnd: "2026-07-20",
        cutoffDate: "2026-07-20",
        dueDate: "2026-07-28",
        amount: 410.5,
      },
      inProgressCycle: {
        periodStart: "2026-07-21",
        periodEnd: "2026-08-20",
        cutoffDate: "2026-08-20",
        amount: 89.5,
      },
    },
    {
      creditCardId: "card-2",
      issuer: "Mastercard",
      name: "Travel card",
      limit: null,
      closedStatement: {
        periodStart: "2026-06-06",
        periodEnd: "2026-07-05",
        cutoffDate: "2026-07-05",
        dueDate: "2026-07-12",
        amount: 89.5,
      },
      inProgressCycle: {
        periodStart: "2026-07-06",
        periodEnd: "2026-08-05",
        cutoffDate: "2026-08-05",
        amount: 0,
      },
    },
  ],
};

describe("CreditCardsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getCreditCards.mockResolvedValue(cards);
    apiMock.getCurrentCreditCardStatements.mockResolvedValue(statements);
  });

  it("renders backend-owned closed and in-progress totals as peer financial blocks", async () => {
    render(<CreditCardsPage />);

    expect(screen.getByText("Loading credit card statement periods...")).toBeInTheDocument();
    expect(screen.getByText("Loading credit cards...")).toBeInTheDocument();

    const closedStatement = await screen.findByRole("region", { name: "Closed statement total" });
    expect(within(closedStatement).getByText("$500.00")).toBeInTheDocument();
    expect(within(closedStatement).getByText("Amount from 2 closed statement periods")).toBeInTheDocument();
    const inProgressCycle = screen.getByRole("region", { name: "In-progress cycle total" });
    expect(within(inProgressCycle).getByText("$89.50")).toBeInTheDocument();
    expect(within(inProgressCycle).getByText("New consumption from 2 open cycles")).toBeInTheDocument();

    const breakdown = screen.getByRole("region", { name: "Statement breakdown by card" });
    expect(within(breakdown).getByText("Main card")).toBeInTheDocument();
    expect(within(breakdown).getByText("Closed statement: $410.50 · Jun 21, 2026 – Jul 20, 2026")).toBeInTheDocument();
    expect(within(breakdown).getByText("Due date: Jul 28, 2026 · Cutoff: Jul 20, 2026")).toBeInTheDocument();
    expect(within(breakdown).getByText("In-progress cycle: $89.50 · Jul 21, 2026 – Aug 20, 2026")).toBeInTheDocument();
    expect(within(breakdown).getByText("Cutoff: Aug 20, 2026")).toBeInTheDocument();
    expect(within(breakdown).getByText("Travel card")).toBeInTheDocument();
    expect(within(breakdown).getByText("Closed statement: $89.50 · Jun 6, 2026 – Jul 5, 2026")).toBeInTheDocument();
    expect(within(breakdown).getByText("In-progress cycle: $0.00 · Jul 6, 2026 – Aug 5, 2026")).toBeInTheDocument();
  });

  it("keeps successful statement data visible when the card list fails", async () => {
    apiMock.getCreditCards.mockRejectedValue(new Error("Cards unavailable."));

    render(<CreditCardsPage />);

    expect(await screen.findByRole("region", { name: "Closed statement total" })).toHaveTextContent("$500.00");
    expect(screen.getByRole("alert")).toHaveTextContent("Cards unavailable.");
    expect(screen.getByText("Statement data remains visible while card inventory could not load.")).toBeInTheDocument();
  });

  it("renders unavailable labels for missing or unparseable dates", async () => {
    apiMock.getCurrentCreditCardStatements.mockResolvedValue({
      estimation: "APP_ESTIMATED",
      cards: [
        {
          ...statements.cards[0],
          closedStatement: {
            periodStart: "not-a-date",
            periodEnd: "",
            cutoffDate: "",
            dueDate: "not-a-date",
            amount: 125,
          },
          inProgressCycle: {
            periodStart: "not-a-date",
            periodEnd: "",
            cutoffDate: "",
            amount: 0,
          },
        },
      ],
    });

    render(<CreditCardsPage />);

    expect(await screen.findByRole("region", { name: "Closed statement total" })).toHaveTextContent("$125.00");
    expect(screen.getByText("Closed statement: $125.00 · unavailable")).toBeInTheDocument();
    expect(screen.getByText("Due date: unavailable · Cutoff: unavailable")).toBeInTheDocument();
    expect(screen.getByText("In-progress cycle: $0.00 · unavailable")).toBeInTheDocument();
  });

  it("shows empty read-only states without mutation controls", async () => {
    apiMock.getCreditCards.mockResolvedValue([]);
    apiMock.getCurrentCreditCardStatements.mockResolvedValue({ estimation: "APP_ESTIMATED", cards: [] });

    render(<CreditCardsPage />);

    expect(await screen.findByText("No credit-card statement periods are available yet.")).toBeInTheDocument();
    expect(screen.getByText("No credit cards are registered yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|edit|inactivate|delete|expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create|edit|inactivate|delete|expense/i })).not.toBeInTheDocument();
  });
});
