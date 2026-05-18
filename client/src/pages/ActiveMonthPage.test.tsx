import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveMonthPage } from "./ActiveMonthPage";
import type { Month, SavingsPocket } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  getPockets: vi.fn(),
  openMonth: vi.fn(),
  recordExpense: vi.fn(),
  createMonthlyIncome: vi.fn(),
  updateMonthlyIncome: vi.fn(),
  deleteMonthlyIncome: vi.fn(),
  depositToPocket: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

const activeMonth: Month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: "ACTIVE",
  openedAt: "2026-05-01T00:00:00.000Z",
  closedAt: null,
  incomes: [
    {
      id: "income-1",
      monthId: "month-1",
      sourceName: "Sueldo",
      amount: 1000,
      receivedAt: "2026-05-05T00:00:00.000Z",
      notes: "neto",
      createdAt: "2026-05-05T00:00:00.000Z",
      updatedAt: "2026-05-05T00:00:00.000Z",
    },
  ],
  monthlyIncomeTotal: 1000,
  availableMoney: 375,
  categories: [
    {
      id: "cat-income",
      name: "Ingresos",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        {
          id: "sub-bonus",
          name: "Bonus",
          plannedAmount: 500,
          available: 500,
          defaultPocketId: null,
          templateSubcategoryId: null,
          sortOrder: 0,
        },
      ],
    },
  ],
};

const activePockets: SavingsPocket[] = [
  { id: "pocket-emergency", name: "Emergencias", goalAmount: 1000, active: true, balance: 250 },
  { id: "pocket-travel", name: "Viaje", goalAmount: null, active: true, balance: 0 },
];

describe("ActiveMonthPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getActiveMonth.mockResolvedValue(activeMonth);
    apiMock.getPockets.mockResolvedValue(activePockets);
    apiMock.depositToPocket.mockResolvedValue(activeMonth);
    apiMock.createMonthlyIncome.mockResolvedValue(activeMonth);
    apiMock.updateMonthlyIncome.mockResolvedValue(activeMonth);
    apiMock.deleteMonthlyIncome.mockResolvedValue(activeMonth);
  });

  it("uses an active-pocket selector for deposits instead of a manual pocket ID", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    expect(await screen.findAllByRole("option", { name: "Bonus ($500.00)" })).toHaveLength(2);
    expect(screen.queryByLabelText("ID bolsillo destino")).not.toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenCalledWith("active");

    const depositForm = screen.getByRole("button", { name: "Depositar en bolsillo" }).closest("form");
    if (!depositForm) throw new Error("Missing deposit form.");

    await user.selectOptions(within(depositForm).getByLabelText("Origen subcategoría (opcional)"), "sub-bonus");
    await user.selectOptions(within(depositForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(within(depositForm).getByLabelText("Monto", { selector: "input" }), "125");
    await user.click(within(depositForm).getByRole("button", { name: "Depositar en bolsillo" }));

    await waitFor(() =>
      expect(apiMock.depositToPocket).toHaveBeenCalledWith({
        monthId: "month-1",
        sourceSubcategoryId: "sub-bonus",
        targetPocketId: "pocket-emergency",
        amount: 125,
        externalSourceLabel: undefined,
      }),
    );
  });

  it("offers only the loaded active pockets as deposit destinations", async () => {
    render(<ActiveMonthPage />);

    const pocketSelect = await screen.findByLabelText("Bolsillo destino");
    expect(pocketSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "Elegí un bolsillo activo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Emergencias ($250.00)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Viaje ($0.00)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /inactivo/i })).not.toBeInTheDocument();
  });

  it("renders backend-computed income totals and available money", async () => {
    render(<ActiveMonthPage />);

    expect(await screen.findByText("Ingresos: $1000.00")).toBeInTheDocument();
    expect(screen.getByText("Disponible del mes: $375.00")).toBeInTheDocument();
    expect(screen.getByText("Sueldo")).toBeInTheDocument();
    expect(screen.getByText(/neto/)).toBeInTheDocument();
  });

  it("creates, edits, and deletes monthly incomes through typed API calls", async () => {
    const user = userEvent.setup();
    const withFreelanceIncome: Month = {
      ...activeMonth,
      incomes: [
        ...activeMonth.incomes,
        {
          id: "income-2",
          monthId: "month-1",
          sourceName: "Freelance",
          amount: 250,
          receivedAt: "2026-05-08T00:00:00.000Z",
          notes: null,
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
        },
      ],
      monthlyIncomeTotal: 1250,
      availableMoney: 625,
    };
    const updatedIncomeMonth: Month = {
      ...withFreelanceIncome,
      incomes: withFreelanceIncome.incomes.map((income) => (income.id === "income-1" ? { ...income, sourceName: "Sueldo neto", amount: 1100, notes: "ajustado" } : income)),
      monthlyIncomeTotal: 1350,
      availableMoney: 725,
    };
    const deletedIncomeMonth: Month = {
      ...updatedIncomeMonth,
      incomes: updatedIncomeMonth.incomes.filter((income) => income.id !== "income-1"),
      monthlyIncomeTotal: 250,
      availableMoney: -125,
    };
    apiMock.createMonthlyIncome.mockResolvedValueOnce(withFreelanceIncome);
    apiMock.updateMonthlyIncome.mockResolvedValueOnce(updatedIncomeMonth);
    apiMock.deleteMonthlyIncome.mockResolvedValueOnce(deletedIncomeMonth);

    render(<ActiveMonthPage />);

    const incomeForm = (await screen.findByRole("button", { name: "Registrar ingreso" })).closest("form");
    if (!incomeForm) throw new Error("Missing income form.");

    await user.type(within(incomeForm).getByLabelText("Fuente del ingreso"), "Freelance");
    await user.type(within(incomeForm).getByLabelText("Monto", { selector: "input" }), "250");
    fireEvent.change(within(incomeForm).getByLabelText("Fecha"), { target: { value: "2026-05-08" } });
    await user.click(within(incomeForm).getByRole("button", { name: "Registrar ingreso" }));

    await waitFor(() =>
      expect(apiMock.createMonthlyIncome).toHaveBeenCalledWith({
        monthId: "month-1",
        sourceName: "Freelance",
        amount: 250,
        receivedAt: "2026-05-08",
        notes: null,
      }),
    );

    await user.click(screen.getAllByRole("button", { name: "Editar ingreso" })[0]);
    const editForm = screen.getByRole("button", { name: "Actualizar ingreso" }).closest("form");
    if (!editForm) throw new Error("Missing edit income form.");
    await user.clear(within(editForm).getByLabelText("Fuente del ingreso"));
    await user.type(within(editForm).getByLabelText("Fuente del ingreso"), "Sueldo neto");
    await user.clear(within(editForm).getByLabelText("Monto", { selector: "input" }));
    await user.type(within(editForm).getByLabelText("Monto", { selector: "input" }), "1100");
    await user.clear(within(editForm).getByLabelText("Notas"));
    await user.type(within(editForm).getByLabelText("Notas"), "ajustado");
    await user.click(within(editForm).getByRole("button", { name: "Actualizar ingreso" }));

    await waitFor(() =>
      expect(apiMock.updateMonthlyIncome).toHaveBeenCalledWith({
        monthId: "month-1",
        incomeId: "income-1",
        sourceName: "Sueldo neto",
        amount: 1100,
        receivedAt: "2026-05-05",
        notes: "ajustado",
      }),
    );

    await user.click(screen.getAllByRole("button", { name: "Eliminar ingreso" })[0]);
    await waitFor(() => expect(apiMock.deleteMonthlyIncome).toHaveBeenCalledWith("month-1", "income-1"));
  });

  it("does not show income mutation controls for closed months", async () => {
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });

    render(<ActiveMonthPage />);

    expect(await screen.findByText(/ingresos son de solo lectura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar ingreso" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar ingreso" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar ingreso" })).not.toBeInTheDocument();
  });
});
