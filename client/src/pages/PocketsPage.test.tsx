import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PocketsPage } from "./PocketsPage";
import type { SavingsPocket } from "../types";

const apiMock = vi.hoisted(() => ({
  getPockets: vi.fn(),
  createPocket: vi.fn(),
  updatePocket: vi.fn(),
  deactivatePocket: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

const emergencyPocket: SavingsPocket = {
  id: "pocket-emergency",
  name: "Emergencias",
  goalAmount: 1000,
  active: true,
  balance: 250,
  recentMovements: [
    {
      id: "movement-1",
      amount: 250,
      description: "Ahorro inicial",
      occurredAt: "2026-05-10T12:00:00.000Z",
      direction: "in",
    },
  ],
};

const travelPocket: SavingsPocket = {
  id: "pocket-travel",
  name: "Viaje",
  goalAmount: null,
  active: false,
  balance: 0,
  recentMovements: [],
};

describe("PocketsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getPockets.mockImplementation((filter: "active" | "inactive" | "all") => {
      if (filter === "inactive") return Promise.resolve([travelPocket]);
      if (filter === "all") return Promise.resolve([emergencyPocket, travelPocket]);
      return Promise.resolve([emergencyPocket]);
    });
  });

  it("shows active and inactive pockets with balances and recent movement context", async () => {
    const user = userEvent.setup();

    render(<PocketsPage />);

    expect(await screen.findByRole("heading", { name: "Bolsillos" })).toBeInTheDocument();
    expect(screen.getByText("Emergencias")).toBeInTheDocument();
    expect(screen.getByText("Balance: $250.00")).toBeInTheDocument();
    expect(screen.getByText("Meta: $1000.00")).toBeInTheDocument();
    expect(screen.getByText("Ahorro inicial · Entrada $250.00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inactivos" }));

    expect(await screen.findByText("Viaje")).toBeInTheDocument();
    expect(screen.getByText("Sin meta definida")).toBeInTheDocument();
    expect(screen.getByText("Sin movimientos recientes.")).toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenLastCalledWith("inactive");
  });

  it("renders backend outgoing pocket movements as Salida", async () => {
    apiMock.getPockets.mockResolvedValueOnce([
      {
        ...emergencyPocket,
        recentMovements: [
          {
            id: "movement-2",
            amount: 75,
            description: "Uso de emergencia",
            occurredAt: "2026-05-11T12:00:00.000Z",
            direction: "out",
          },
        ],
      },
    ]);

    render(<PocketsPage />);

    expect(await screen.findByText("Uso de emergencia · Salida $75.00")).toBeInTheDocument();
  });

  it("creates, edits, and deactivates pockets without hard deleting history", async () => {
    const user = userEvent.setup();
    apiMock.createPocket.mockResolvedValue({ ...emergencyPocket, id: "pocket-new", name: "Impuestos", goalAmount: 500 });
    apiMock.updatePocket.mockResolvedValue({ ...emergencyPocket, name: "Reserva", goalAmount: null });
    apiMock.deactivatePocket.mockResolvedValue({ ...emergencyPocket, active: false });

    render(<PocketsPage />);

    await screen.findByText("Emergencias");

    await user.type(screen.getByLabelText("Nombre del bolsillo"), "Impuestos");
    await user.type(screen.getByLabelText("Meta opcional"), "500");
    await user.click(screen.getByRole("button", { name: "Crear bolsillo" }));

    await waitFor(() =>
      expect(apiMock.createPocket).toHaveBeenCalledWith({
        name: "Impuestos",
        goalAmount: 500,
      }),
    );

    const emergencyCard = screen.getByText("Emergencias").closest("article");
    if (!emergencyCard) throw new Error("Missing pocket card.");

    await user.clear(within(emergencyCard).getByLabelText("Editar nombre"));
    await user.type(within(emergencyCard).getByLabelText("Editar nombre"), "Reserva");
    await user.clear(within(emergencyCard).getByLabelText("Editar meta"));
    await user.click(within(emergencyCard).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(apiMock.updatePocket).toHaveBeenCalledWith("pocket-emergency", {
        name: "Reserva",
        goalAmount: null,
        active: true,
      }),
    );

    await user.click(within(emergencyCard).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(apiMock.deactivatePocket).toHaveBeenCalledWith("pocket-emergency"));
    expect(await screen.findByText("Bolsillo desactivado; queda disponible para historial."));
  });

  it("removes a deactivated pocket from the active-only list immediately", async () => {
    const user = userEvent.setup();
    apiMock.deactivatePocket.mockResolvedValue({ ...emergencyPocket, active: false });

    render(<PocketsPage />);

    const emergencyCard = (await screen.findByText("Emergencias")).closest("article");
    if (!emergencyCard) throw new Error("Missing pocket card.");

    await user.click(within(emergencyCard).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(apiMock.deactivatePocket).toHaveBeenCalledWith("pocket-emergency"));
    await waitFor(() => expect(screen.queryByText("Emergencias")).not.toBeInTheDocument());
    expect(screen.getByText("No hay bolsillos para este filtro.")).toBeInTheDocument();
  });

  it("keeps a deactivated pocket visible as inactive when viewing all pockets", async () => {
    const user = userEvent.setup();
    apiMock.deactivatePocket.mockResolvedValue({ ...emergencyPocket, active: false });

    render(<PocketsPage />);

    await screen.findByText("Emergencias");
    await user.click(screen.getByRole("button", { name: "Todos" }));

    const emergencyCard = (await screen.findByText("Emergencias")).closest("article");
    if (!emergencyCard) throw new Error("Missing pocket card.");

    await user.click(within(emergencyCard).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(apiMock.deactivatePocket).toHaveBeenCalledWith("pocket-emergency"));
    expect(screen.getByText("Emergencias")).toBeInTheDocument();
    expect(within(emergencyCard).getByText("Inactivo")).toBeInTheDocument();
  });
});
