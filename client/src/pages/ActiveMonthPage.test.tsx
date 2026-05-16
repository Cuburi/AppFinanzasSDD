import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveMonthPage } from "./ActiveMonthPage";
import type { Month, SavingsPocket } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  getPockets: vi.fn(),
  openMonth: vi.fn(),
  recordExpense: vi.fn(),
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
});
