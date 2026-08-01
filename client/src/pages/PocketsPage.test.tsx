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
  depositExternalToPocket: vi.fn(),
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
      type: "POCKET_DEPOSIT_FROM_SUBCATEGORY",
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

const localCalendarDate = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
    let resolveActivePockets!: (pockets: SavingsPocket[]) => void;
    apiMock.getPockets.mockImplementation((filter: "active" | "inactive" | "all") => {
      if (filter === "active") {
        return new Promise<SavingsPocket[]>((resolve) => {
          resolveActivePockets = resolve;
        });
      }
      if (filter === "inactive") return Promise.resolve([travelPocket]);
      return Promise.resolve([emergencyPocket, travelPocket]);
    });

    render(<PocketsPage />);

    expect(await screen.findByRole("heading", { name: "Bolsillos" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando bolsillos...");
    resolveActivePockets([emergencyPocket]);
    expect(await screen.findByText("Emergencias")).toBeInTheDocument();
    expect(screen.getByText("Balance: $250.00")).toBeInTheDocument();
    expect(screen.getByText("Meta: $1000.00")).toBeInTheDocument();
    expect(screen.getByText(/Ahorro inicial/)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Success: Activo" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Success: Balance $250.00" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inactivos" }));

    expect(await screen.findByText("Viaje")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Neutral: Inactivo" })).toBeInTheDocument();
    expect(screen.getByText("Sin meta definida")).toBeInTheDocument();
    expect(screen.getByText("No se recibieron movimientos recientes.")).toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenLastCalledWith("inactive");
  });

  it("renders backend outgoing pocket movements as Salida", async () => {
    apiMock.getPockets.mockResolvedValueOnce([
      {
        ...emergencyPocket,
        recentMovements: [
          {
            id: "movement-2",
            type: "POCKET_TRANSFER",
            amount: 75,
            description: "Uso de emergencia",
            occurredAt: "2026-05-11T12:00:00.000Z",
            direction: "out",
          },
        ],
      },
    ]);

    render(<PocketsPage />);

    expect(await screen.findByText(/Uso de emergencia/)).toBeInTheDocument();
  });

  it("submits an external deposit only from Pockets and refreshes the displayed pockets", async () => {
    const user = userEvent.setup();
    apiMock.depositExternalToPocket.mockResolvedValue(null);
    apiMock.getPockets
      .mockResolvedValueOnce([emergencyPocket])
      .mockResolvedValueOnce([{ ...emergencyPocket, balance: 375 }]);

    render(<PocketsPage />);

    await screen.findByText("Emergencias");
    await user.selectOptions(screen.getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(screen.getByLabelText("Monto del ingreso externo"), "125");
    await user.clear(screen.getByLabelText("Fecha del ingreso externo"));
    await user.type(screen.getByLabelText("Fecha del ingreso externo"), "2026-05-14");
    await user.type(screen.getByLabelText("Origen externo (opcional)"), "Employer");
    await user.click(screen.getByRole("button", { name: "Registrar ingreso externo" }));

    await waitFor(() =>
      expect(apiMock.depositExternalToPocket).toHaveBeenCalledWith({
        sourceKind: "EXTERNAL",
        targetPocketId: "pocket-emergency",
        amount: 125,
        occurredAt: "2026-05-14",
        externalSourceLabel: "Employer",
      }),
    );
    expect(await screen.findByText("Balance: $375.00")).toBeInTheDocument();
  });

  it("keeps the persisted external deposit successful when its refresh fails", async () => {
    const user = userEvent.setup();
    apiMock.depositExternalToPocket.mockResolvedValue(null);
    apiMock.getPockets
      .mockResolvedValueOnce([emergencyPocket])
      .mockRejectedValueOnce(new Error("Refresh unavailable."));

    render(<PocketsPage />);

    await screen.findByText("Emergencias");
    await user.selectOptions(screen.getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(screen.getByLabelText("Monto del ingreso externo"), "125");
    await user.click(screen.getByRole("button", { name: "Registrar ingreso externo" }));

    expect(await screen.findByText("Ingreso externo registrado.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("El ingreso externo se registró, pero no se pudieron actualizar los bolsillos.");
    expect(screen.getByRole("alert")).toHaveTextContent("Refresh unavailable.");
    expect(screen.getByLabelText("Bolsillo destino")).toHaveValue("");
    expect(screen.getByLabelText("Monto del ingreso externo")).toHaveValue(null);
    expect(screen.getByLabelText("Origen externo (opcional)")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Registrar ingreso externo" }));
    expect(apiMock.depositExternalToPocket).toHaveBeenCalledTimes(1);
  });

  it("defaults the external deposit date to the user's local calendar day", async () => {
    vi.useFakeTimers();
    const currentTime = new Date("2026-05-14T01:30:00.000Z");
    vi.setSystemTime(currentTime);

    try {
      render(<PocketsPage />);

      expect(screen.getByLabelText("Fecha del ingreso externo")).toHaveValue(localCalendarDate(currentTime));
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the local date when the UTC day has already begun locally", () => {
    vi.useFakeTimers();
    const currentTime = new Date("2026-05-14T18:30:00.000Z");
    vi.setSystemTime(currentTime);

    try {
      render(<PocketsPage />);

      expect(screen.getByLabelText("Fecha del ingreso externo")).toHaveValue(localCalendarDate(currentTime));
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the external form available after a retryable pockets load failure", async () => {
    const user = userEvent.setup();
    apiMock.getPockets.mockRejectedValueOnce(new Error("Pockets unavailable.")).mockResolvedValueOnce([emergencyPocket]);

    render(<PocketsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Pockets unavailable.");
    await user.click(screen.getByRole("button", { name: "Reintentar bolsillos" }));

    expect(await screen.findByLabelText("Bolsillo destino")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar ingreso externo" })).toBeEnabled();
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
