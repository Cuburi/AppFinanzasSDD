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
      cycleStart: "2026-07-21",
      cycleEnd: "2026-08-20",
      cutoffDate: "2026-08-20",
      dueDate: "2026-08-28",
      estimatedSpent: 410.5,
    },
    {
      creditCardId: "card-2",
      issuer: "Mastercard",
      name: "Travel card",
      limit: null,
      cycleStart: "2026-07-06",
      cycleEnd: "2026-08-05",
      cutoffDate: "2026-08-05",
      dueDate: "2026-08-12",
      estimatedSpent: 89.5,
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

  it("renders a statement-first dashboard with an aggregate app-estimated amount before card details", async () => {
    render(<CreditCardsPage />);

    expect(screen.getByText("Loading current statement...")).toBeInTheDocument();
    expect(screen.getByText("Loading credit cards...")).toBeInTheDocument();

    const total = await screen.findByRole("region", { name: "Current statement total" });
    expect(within(total).getByText("$500.00")).toBeInTheDocument();
    expect(within(total).getByText("App-estimated from 2 current card statements")).toBeInTheDocument();

    expect(screen.getByText("Cycle: Jul 21, 2026 – Aug 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("Cutoff: Aug 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("Due: Aug 28, 2026")).toBeInTheDocument();

    const breakdown = screen.getByRole("region", { name: "Statement breakdown by card" });
    expect(within(breakdown).getByText("Main card")).toBeInTheDocument();
    expect(within(breakdown).getByText("Visa · $410.50 app-estimated")).toBeInTheDocument();
    expect(within(breakdown).getByText("Travel card")).toBeInTheDocument();
    expect(within(breakdown).getByText("Mastercard · $89.50 app-estimated")).toBeInTheDocument();
  });

  it("keeps successful statement data visible when the card list fails", async () => {
    apiMock.getCreditCards.mockRejectedValue(new Error("Cards unavailable."));

    render(<CreditCardsPage />);

    expect(await screen.findByRole("region", { name: "Current statement total" })).toHaveTextContent("$500.00");
    expect(screen.getByRole("alert")).toHaveTextContent("Cards unavailable.");
    expect(screen.getByText("Statement data remains visible while card inventory could not load.")).toBeInTheDocument();
  });

  it("renders unavailable labels for missing or unparseable dates", async () => {
    apiMock.getCurrentCreditCardStatements.mockResolvedValue({
      estimation: "APP_ESTIMATED",
      cards: [
        {
          ...statements.cards[0],
          cycleStart: "not-a-date",
          cycleEnd: "",
          cutoffDate: "",
          dueDate: "not-a-date",
          estimatedSpent: 125,
        },
      ],
    });

    render(<CreditCardsPage />);

    expect(await screen.findByRole("region", { name: "Current statement total" })).toHaveTextContent("$125.00");
    expect(screen.getByText("Cycle: unavailable")).toBeInTheDocument();
    expect(screen.getByText("Cutoff: unavailable")).toBeInTheDocument();
    expect(screen.getByText("Due: unavailable")).toBeInTheDocument();
  });

  it("shows empty read-only states without mutation controls", async () => {
    apiMock.getCreditCards.mockResolvedValue([]);
    apiMock.getCurrentCreditCardStatements.mockResolvedValue({ estimation: "APP_ESTIMATED", cards: [] });

    render(<CreditCardsPage />);

    expect(await screen.findByText("No current credit-card statement usage yet.")).toBeInTheDocument();
    expect(screen.getByText("No credit cards are registered yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|edit|inactivate|delete|expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create|edit|inactivate|delete|expense/i })).not.toBeInTheDocument();
  });
});
