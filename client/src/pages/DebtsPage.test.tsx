import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DebtsPage } from "./DebtsPage";
import type { DebtView } from "../types";

const apiMock = vi.hoisted(() => ({
  getDebts: vi.fn(),
  createDebt: vi.fn(),
  registerDebtPayment: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

const debtToPay: DebtView = {
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
      notes: "Initial payment",
    },
  ],
};

const paidDebt: DebtView = {
  ...debtToPay,
  remainingBalance: 0,
  status: "PAID",
  payments: [...debtToPay.payments, { id: "payment-2", amount: 200000, paidAt: "2026-05-22T00:00:00.000Z", notes: "Final payment" }],
};

describe("DebtsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getDebts.mockResolvedValue([debtToPay]);
  });

  it("lists debts with COP balances, direction, status, and payment history", async () => {
    render(<DebtsPage />);

    expect(await screen.findByRole("heading", { name: "Deudas" })).toBeInTheDocument();
    expect(screen.getByText("Laura")).toBeInTheDocument();
    expect(screen.getByText("Yo debo")).toBeInTheDocument();
    expect(screen.getByText("Estado: OPEN")).toBeInTheDocument();
    expect(screen.getByText("Total: COP $300000.00")).toBeInTheDocument();
    expect(screen.getByText("Saldo: COP $200000.00")).toBeInTheDocument();
    expect(screen.getByText("Initial payment · COP $100000.00")).toBeInTheDocument();
  });

  it("exposes open debt risk and paid debt completion through semantic status labels", async () => {
    apiMock.getDebts.mockResolvedValueOnce([debtToPay, { ...paidDebt, id: "debt-rent-paid" }]);

    render(<DebtsPage />);

    expect(await screen.findByRole("status", { name: "Danger: Yo debo · OPEN" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Success: Yo debo · PAID" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Warning: Saldo pendiente COP $200000.00" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Success: Saldo liquidado COP $0.00" })).toBeInTheDocument();
  });

  it("creates a debt and keeps it visible in the MVP list", async () => {
    const user = userEvent.setup();
    const createdDebt: DebtView = {
      ...debtToPay,
      id: "debt-family",
      direction: "OWED_TO_ME",
      counterpartyName: "Carlos",
      description: null,
      totalAmount: 150000,
      remainingBalance: 150000,
      payments: [],
    };
    apiMock.createDebt.mockResolvedValue(createdDebt);

    render(<DebtsPage />);

    await screen.findByText("Laura");
    await user.selectOptions(screen.getByLabelText("Dirección"), "OWED_TO_ME");
    await user.type(screen.getByLabelText("Contraparte"), "Carlos");
    await user.type(screen.getByLabelText("Monto total"), "150000");
    await user.type(screen.getByLabelText("Fecha de origen"), "2026-05-23");
    await user.click(screen.getByRole("button", { name: "Crear deuda" }));

    await waitFor(() =>
      expect(apiMock.createDebt).toHaveBeenCalledWith({
        direction: "OWED_TO_ME",
        counterpartyName: "Carlos",
        totalAmount: 150000,
        originDate: "2026-05-23",
        description: null,
      }),
    );
    expect(await screen.findByText("Deuda creada."));
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("Me deben")).toBeInTheDocument();
  });

  it("registers a partial or full payment and refreshes displayed balance/status", async () => {
    const user = userEvent.setup();
    apiMock.registerDebtPayment.mockResolvedValue(paidDebt);

    render(<DebtsPage />);

    const debtCard = (await screen.findByText("Laura")).closest("article");
    if (!debtCard) throw new Error("Missing debt card.");

    await user.type(within(debtCard).getByLabelText("Monto del pago"), "200000");
    await user.type(within(debtCard).getByLabelText("Fecha de pago"), "2026-05-22");
    await user.type(within(debtCard).getByLabelText("Notas del pago"), "Final payment");
    await user.click(within(debtCard).getByRole("button", { name: "Registrar pago" }));

    await waitFor(() =>
      expect(apiMock.registerDebtPayment).toHaveBeenCalledWith("debt-rent", {
        amount: 200000,
        paidAt: "2026-05-22",
        notes: "Final payment",
      }),
    );
    expect(await screen.findByText("Pago registrado."));
    expect(within(debtCard).getByText("Estado: PAID")).toBeInTheDocument();
    expect(within(debtCard).getByText("Saldo: COP $0.00")).toBeInTheDocument();
  });

  it("surfaces backend validation errors without pretending success", async () => {
    const user = userEvent.setup();
    apiMock.registerDebtPayment.mockRejectedValue(new Error("Payment exceeds remaining balance."));

    render(<DebtsPage />);

    const debtCard = (await screen.findByText("Laura")).closest("article");
    if (!debtCard) throw new Error("Missing debt card.");

    await user.type(within(debtCard).getByLabelText("Monto del pago"), "999999");
    await user.type(within(debtCard).getByLabelText("Fecha de pago"), "2026-05-22");
    await user.click(within(debtCard).getByRole("button", { name: "Registrar pago" }));

    expect(await screen.findByText("Payment exceeds remaining balance.")).toBeInTheDocument();
    expect(screen.queryByText("Pago registrado.")).not.toBeInTheDocument();
    expect(within(debtCard).getByText("Saldo: COP $200000.00")).toBeInTheDocument();
  });
});
