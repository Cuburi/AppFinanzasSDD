import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActiveMonthDashboard } from "./ActiveMonthDashboard";
import { DashboardActivationForm } from "./DashboardSections";
import type { DashboardViewModel } from "../model/contracts";
import type { Month } from "../../../../types";

const activeMonth: Month = {
  id: "month-1",
  year: 2026,
  month: 7,
  status: "ACTIVE",
  openedAt: "2026-07-01T00:00:00.000Z",
  closedAt: null,
  incomes: [],
  monthlyIncomeTotal: 1_000,
  availableMoney: 375,
  cashBalance: 80,
  categories: [],
};

afterEach(cleanup);

describe("ActiveMonthDashboard", () => {
  it("announces loading and blocks operations until authority resolves", () => {
    render(<ActiveMonthDashboard onOpenMonth={vi.fn()} onRetry={vi.fn()} viewModel={{ lifecycle: "loading", action: { kind: "none" } }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando mes activo...");
    expect(screen.queryByRole("region", { name: "Panel del mes activo" })).not.toBeInTheDocument();
  });

  it("guides an unopened month through the only permitted activation action", async () => {
    const user = userEvent.setup();
    const openMonth = vi.fn();

    render(<ActiveMonthDashboard onOpenMonth={openMonth} onRetry={vi.fn()} viewModel={{ lifecycle: "unopened", action: { kind: "open-month" } }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Todavía no hay un mes activo.");
    await user.click(screen.getByRole("button", { name: "Abrir mes" }));
    expect(openMonth).toHaveBeenCalledWith({ year: expect.any(Number), month: expect.any(Number) });
    expect(screen.queryByRole("region", { name: "Panel del mes activo" })).not.toBeInTheDocument();
  });

  it("renders operations only with active authority and retries only blocking authority failures", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(
      <ActiveMonthDashboard onOpenMonth={vi.fn()} onRetry={retry} viewModel={{ lifecycle: "active", month: activeMonth, action: { kind: "none" } }}>
        <p>Legacy operation</p>
      </ActiveMonthDashboard>,
    );

    expect(screen.getByRole("region", { name: "Panel del mes activo" })).toHaveTextContent("Legacy operation");

    rerender(<ActiveMonthDashboard onOpenMonth={vi.fn()} onRetry={retry} viewModel={{ lifecycle: "blocking", action: { kind: "retry-authority" } }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el mes activo.");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "Panel del mes activo" })).not.toBeInTheDocument();
  });

  it("gives the active operational area one contextual month heading and current-status context", () => {
    render(
      <ActiveMonthDashboard onOpenMonth={vi.fn()} onRetry={vi.fn()} viewModel={{ lifecycle: "active", month: activeMonth, action: { kind: "none" } }}>
        <button type="button">Registrar gasto</button>
      </ActiveMonthDashboard>,
    );

    const dashboard = screen.getByRole("region", { name: "Panel del mes activo" });
    expect(within(dashboard).getByRole("heading", { level: 1, name: "Julio 2026" })).toBeInTheDocument();
    expect(within(dashboard).getByRole("status", { name: /Mes abierto/i })).toBeInTheDocument();
    expect(within(dashboard).getByRole("button", { name: "Registrar gasto" })).toBeInTheDocument();
  });

  it("renders a closed month with its closed status instead of the active status", () => {
    render(
      <ActiveMonthDashboard
        onOpenMonth={vi.fn()}
        onRetry={vi.fn()}
        viewModel={{ lifecycle: "closed", month: { ...activeMonth, status: "CLOSED", closedAt: "2026-07-31T00:00:00.000Z" }, action: { kind: "none" } }}
      />,
    );

    const dashboard = screen.getByRole("region", { name: "Panel del mes activo" });
    expect(within(dashboard).getByRole("status", { name: /Mes cerrado/i })).toBeInTheDocument();
    expect(within(dashboard).queryByRole("status", { name: /Mes abierto/i })).not.toBeInTheDocument();
  });

  it("keeps operations visible while announcing a degraded support source with a targeted retry", async () => {
    const user = userEvent.setup();
    const retrySupport = vi.fn();

    render(
      <ActiveMonthDashboard
        onOpenMonth={vi.fn()}
        onRetry={vi.fn()}
        onRetrySupport={retrySupport}
        viewModel={{ lifecycle: "degraded", month: activeMonth, action: { kind: "retry-support", source: "report" }, supportFailures: ["report"] }}
      >
        <p>Legacy operation</p>
      </ActiveMonthDashboard>,
    );

    expect(screen.getByRole("region", { name: "Panel del mes activo" })).toHaveTextContent("Legacy operation");
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el reporte.");
    await user.click(screen.getByRole("button", { name: "Reintentar reporte" }));
    expect(retrySupport).toHaveBeenCalledWith("report");
  });

  it("orders financial truth, the next action, quick actions, warnings, and activity while retrying only the failed support", async () => {
    const user = userEvent.setup();
    const retrySupport = vi.fn();
    const refresh = vi.fn();

    render(
      <ActiveMonthDashboard
        financialContent={<p>Disponible $375 COP</p>}
        onOpenMonth={vi.fn()}
        onRefresh={refresh}
        onRetry={vi.fn()}
        onRetrySupport={retrySupport}
        primaryAction={<button type="button">Registrar gasto</button>}
        viewModel={{ lifecycle: "degraded", month: activeMonth, action: { kind: "retry-support", source: "report" }, supportFailures: ["report"] }}
      >
        <p>Actividad reciente</p>
      </ActiveMonthDashboard>,
    );

    const financial = screen.getByRole("region", { name: "Resumen financiero" });
    const nextAction = screen.getByRole("region", { name: "Próxima acción" });
    const quickActions = screen.getByRole("region", { name: "Acciones rápidas" });
    const warning = screen.getByRole("alert");
    const activity = screen.getByRole("region", { name: "Actividad y contexto" });

    expect(financial.compareDocumentPosition(nextAction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nextAction.compareDocumentPosition(quickActions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(quickActions.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(warning.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Disponible $375 COP")).toBeInTheDocument();
    expect(screen.getByText("Actividad reciente")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actualizar información" }));
    await user.click(screen.getByRole("button", { name: "Reintentar reporte" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(retrySupport).toHaveBeenCalledWith("report");
  });

  it("keeps quick-action controls keyboard reachable when supporting context is absent", async () => {
    const user = userEvent.setup();

    render(
      <ActiveMonthDashboard
        financialContent={<p>Disponible $375 COP</p>}
        onOpenMonth={vi.fn()}
        onRefresh={vi.fn()}
        onRetry={vi.fn()}
        primaryAction={<button type="button">Registrar gasto</button>}
        viewModel={{ lifecycle: "active", month: activeMonth, action: { kind: "none" } }}
      />,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Registrar gasto" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Actualizar información" })).toHaveFocus();
    expect(screen.queryByRole("region", { name: "Actividad y contexto" })).not.toBeInTheDocument();
  });

  it("uses native form submission for Enter and rejects out-of-range months before activation", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    const { rerender } = render(<DashboardActivationForm input={{ year: 2026, month: 7 }} onChange={vi.fn()} onSubmit={submit} pending={false} />);

    await user.type(screen.getByLabelText("Mes"), "{enter}");
    expect(submit).toHaveBeenCalledTimes(1);

    rerender(<DashboardActivationForm input={{ year: 2026, month: 13 }} onChange={vi.fn()} onSubmit={submit} pending={false} />);
    await user.click(screen.getByRole("button", { name: "Abrir mes" }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("keeps the mobile activation controls reachable in their reading order", async () => {
    const user = userEvent.setup();
    render(<DashboardActivationForm input={{ year: 2026, month: 7 }} onChange={vi.fn()} onSubmit={vi.fn()} pending={false} />);

    const year = screen.getByLabelText("Año");
    const month = screen.getByLabelText("Mes");
    const action = screen.getByRole("button", { name: "Abrir mes" });
    await user.tab();
    expect(year).toHaveFocus();
    await user.tab();
    expect(month).toHaveFocus();
    await user.tab();
    expect(action).toHaveFocus();
  });
});
