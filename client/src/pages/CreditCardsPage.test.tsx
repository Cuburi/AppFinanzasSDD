import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreditCardsPage } from "./CreditCardsPage";
import type { CreditCardStatementSummaryListView, CreditCardView } from "../types";

const apiMock = vi.hoisted(() => ({
  getCreditCards: vi.fn(),
  getCurrentCreditCardStatements: vi.fn(),
  createCreditCard: vi.fn(),
  updateCreditCard: vi.fn(),
  activateCreditCard: vi.fn(),
  inactivateCreditCard: vi.fn(),
}));

vi.mock("../lib/api", () => ({ api: apiMock }));

const cards: CreditCardView[] = [
  { id: "card-1", ownerId: "owner-1", issuer: "Visa", name: "Main card", limit: 2500, closingDay: 20, dueDay: 28, active: true },
  { id: "card-2", ownerId: "owner-1", issuer: "Mastercard", name: "Travel card", limit: null, closingDay: 5, dueDay: 12, active: false },
];

const statements: CreditCardStatementSummaryListView = {
  estimation: "APP_ESTIMATED",
  cards: [
    { creditCardId: "card-1", issuer: "Visa", name: "Main card", limit: 2500, closedStatement: { periodStart: "2026-06-21", periodEnd: "2026-07-20", cutoffDate: "2026-07-20", dueDate: "2026-07-28", amount: 410.5 }, inProgressCycle: { periodStart: "2026-07-21", periodEnd: "2026-08-20", cutoffDate: "2026-08-20", amount: 89.5 } },
    { creditCardId: "card-2", issuer: "Mastercard", name: "Travel card", limit: null, closedStatement: { periodStart: "2026-06-06", periodEnd: "2026-07-05", cutoffDate: "2026-07-05", dueDate: "2026-07-12", amount: 89.5 }, inProgressCycle: { periodStart: "2026-07-06", periodEnd: "2026-08-05", cutoffDate: "2026-08-05", amount: 0 } },
  ],
};

const fillCardForm = async (user: ReturnType<typeof userEvent.setup>, form: HTMLElement, values = { issuer: "Amex", name: "Daily card", limit: "1000", closingDay: "10", dueDay: "20" }) => {
  await user.type(within(form).getByLabelText("Issuer"), values.issuer);
  await user.type(within(form).getByLabelText("Card name"), values.name);
  await user.type(within(form).getByLabelText("Limit (optional)"), values.limit);
  await user.type(within(form).getByLabelText("Closing day"), values.closingDay);
  await user.type(within(form).getByLabelText("Due day"), values.dueDay);
};

describe("CreditCardsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getCreditCards.mockResolvedValue(cards);
    apiMock.getCurrentCreditCardStatements.mockResolvedValue(statements);
  });

  it("renders backend-owned closed and in-progress totals as peer financial blocks", async () => {
    render(<CreditCardsPage />);

    const closedStatement = await screen.findByRole("region", { name: "Closed statement total" });
    expect(within(closedStatement).getByText("$500.00")).toBeInTheDocument();
    expect(within(closedStatement).getByText("Amount from 2 closed statement periods")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "In-progress cycle total" })).getByText("$89.50")).toBeInTheDocument();
    const breakdown = screen.getByRole("region", { name: "Statement breakdown by card" });
    expect(within(breakdown).getByText("Closed statement: $410.50 · Jun 21, 2026 – Jul 20, 2026")).toBeInTheDocument();
    expect(within(breakdown).getByText("Due date: Jul 28, 2026 · Cutoff: Jul 20, 2026")).toBeInTheDocument();
  });

  it("keeps successful statement data visible when the card list fails", async () => {
    apiMock.getCreditCards.mockRejectedValue(new Error("Cards unavailable."));
    render(<CreditCardsPage />);

    expect(await screen.findByRole("region", { name: "Closed statement total" })).toHaveTextContent("$500.00");
    expect(screen.getByRole("alert")).toHaveTextContent("Cards unavailable.");
    expect(screen.getByText("Statement data remains visible while card inventory could not load.")).toBeInTheDocument();
  });

  it("renders unavailable labels for missing or unparseable dates", async () => {
    apiMock.getCurrentCreditCardStatements.mockResolvedValue({ estimation: "APP_ESTIMATED", cards: [{ ...statements.cards[0], closedStatement: { periodStart: "not-a-date", periodEnd: "", cutoffDate: "", dueDate: "not-a-date", amount: 125 }, inProgressCycle: { periodStart: "not-a-date", periodEnd: "", cutoffDate: "", amount: 0 } }] });
    render(<CreditCardsPage />);

    expect(await screen.findByText("Closed statement: $125.00 · unavailable")).toBeInTheDocument();
    expect(screen.getByText("Due date: unavailable · Cutoff: unavailable")).toBeInTheDocument();
  });

  it("offers the create form in an empty state, creates a card, and refreshes cards and statements", async () => {
    const user = userEvent.setup();
    const created = { ...cards[0], id: "card-new", issuer: "Amex", name: "Daily card", limit: 1000, closingDay: 10, dueDay: 20 };
    apiMock.getCreditCards.mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    apiMock.getCurrentCreditCardStatements.mockResolvedValueOnce({ estimation: "APP_ESTIMATED", cards: [] }).mockResolvedValueOnce(statements);
    apiMock.createCreditCard.mockResolvedValue(created);
    render(<CreditCardsPage />);

    expect(await screen.findByText("No credit cards are registered yet.")).toBeInTheDocument();
    const form = screen.getByRole("form", { name: "Create credit card" });
    await fillCardForm(user, form);
    await user.click(within(form).getByRole("button", { name: "Create card" }));

    expect(await screen.findByText("Credit card created.")).toBeInTheDocument();
    expect(apiMock.createCreditCard).toHaveBeenCalledWith({ issuer: "Amex", name: "Daily card", limit: 1000, closingDay: 10, dueDay: 20 });
    expect(apiMock.getCreditCards).toHaveBeenCalledTimes(2);
    expect(apiMock.getCurrentCreditCardStatements).toHaveBeenCalledTimes(2);
  });

  it("surfaces a create backend validation error without pretending success or losing the form", async () => {
    const user = userEvent.setup();
    apiMock.createCreditCard.mockRejectedValue(new Error("Issuer is required."));
    render(<CreditCardsPage />);
    const form = await screen.findByRole("form", { name: "Create credit card" });
    await fillCardForm(user, form);
    await user.click(within(form).getByRole("button", { name: "Create card" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Issuer is required.");
    expect(screen.queryByText("Credit card created.")).not.toBeInTheDocument();
    expect(within(form).getByLabelText("Issuer")).toHaveValue("Amex");
  });

  it("edits a card and refreshes cards and statements", async () => {
    const user = userEvent.setup();
    const updated = { ...cards[0], issuer: "Visa Platinum", name: "Primary card", limit: 3000, closingDay: 21, dueDay: 29 };
    apiMock.updateCreditCard.mockResolvedValue(updated);
    apiMock.getCreditCards.mockResolvedValueOnce(cards).mockResolvedValueOnce([updated, cards[1]]);
    render(<CreditCardsPage />);
    const form = await screen.findByRole("form", { name: "Edit Main card" });
    for (const [label, value] of Object.entries({ Issuer: "Visa Platinum", "Card name": "Primary card", "Limit (optional)": "3000", "Closing day": "21", "Due day": "29" })) {
      const input = within(form).getByLabelText(label);
      await user.clear(input);
      await user.type(input, value);
    }
    await user.click(within(form).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Credit card updated.")).toBeInTheDocument();
    expect(apiMock.updateCreditCard).toHaveBeenCalledWith("card-1", { issuer: "Visa Platinum", name: "Primary card", limit: 3000, closingDay: 21, dueDay: 29 });
    expect(apiMock.getCreditCards).toHaveBeenCalledTimes(2);
    expect(apiMock.getCurrentCreditCardStatements).toHaveBeenCalledTimes(2);
  });

  it("inactivates active cards and reactivates inactive cards with dedicated APIs and refreshes", async () => {
    const user = userEvent.setup();
    apiMock.inactivateCreditCard.mockResolvedValue({ ...cards[0], active: false });
    apiMock.activateCreditCard.mockResolvedValue({ ...cards[1], active: true });
    render(<CreditCardsPage />);
    const activeForm = await screen.findByRole("form", { name: "Edit Main card" });
    await user.click(within(activeForm).getByRole("button", { name: "Inactivate" }));
    expect(await screen.findByText("Credit card inactivated.")).toBeInTheDocument();
    expect(apiMock.inactivateCreditCard).toHaveBeenCalledWith("card-1");

    const inactiveForm = screen.getByRole("form", { name: "Edit Travel card" });
    await user.click(within(inactiveForm).getByRole("button", { name: "Reactivate" }));
    expect(await screen.findByText("Credit card reactivated.")).toBeInTheDocument();
    expect(apiMock.activateCreditCard).toHaveBeenCalledWith("card-2");
    expect(apiMock.getCreditCards).toHaveBeenCalledTimes(3);
    expect(apiMock.getCurrentCreditCardStatements).toHaveBeenCalledTimes(3);
  });

  it("reports partial success when a saved mutation cannot refresh safe displayed data", async () => {
    const user = userEvent.setup();
    apiMock.createCreditCard.mockResolvedValue({ ...cards[0], id: "card-new" });
    apiMock.getCreditCards.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Refresh unavailable."));
    apiMock.getCurrentCreditCardStatements.mockResolvedValueOnce({ estimation: "APP_ESTIMATED", cards: [] }).mockResolvedValueOnce(statements);
    render(<CreditCardsPage />);
    const form = await screen.findByRole("form", { name: "Create credit card" });
    await fillCardForm(user, form);
    await user.click(within(form).getByRole("button", { name: "Create card" }));

    expect(await screen.findByText("Credit card created.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The credit card change was saved, but cards and statement periods could not be refreshed.");
    expect(screen.getByText("No credit cards are registered yet.")).toBeInTheDocument();
  });
});
