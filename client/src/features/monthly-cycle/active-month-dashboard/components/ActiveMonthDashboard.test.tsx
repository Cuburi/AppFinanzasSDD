import { cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.queryByRole("region", { name: "Operación del mes" })).not.toBeInTheDocument();
  });

  it("guides an unopened month through the only permitted activation action", async () => {
    const user = userEvent.setup();
    const openMonth = vi.fn();

    render(<ActiveMonthDashboard onOpenMonth={openMonth} onRetry={vi.fn()} viewModel={{ lifecycle: "unopened", action: { kind: "open-month" } }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Todavía no hay un mes activo.");
    await user.click(screen.getByRole("button", { name: "Abrir mes" }));
    expect(openMonth).toHaveBeenCalledWith({ year: expect.any(Number), month: expect.any(Number) });
    expect(screen.queryByRole("region", { name: "Operación del mes" })).not.toBeInTheDocument();
  });

  it("renders operations only with active authority and retries only blocking authority failures", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(
      <ActiveMonthDashboard onOpenMonth={vi.fn()} onRetry={retry} viewModel={{ lifecycle: "active", month: activeMonth, action: { kind: "none" } }}>
        <p>Legacy operation</p>
      </ActiveMonthDashboard>,
    );

    expect(screen.getByRole("region", { name: "Operación del mes" })).toHaveTextContent("Legacy operation");

    rerender(<ActiveMonthDashboard onOpenMonth={vi.fn()} onRetry={retry} viewModel={{ lifecycle: "blocking", action: { kind: "retry-authority" } }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el mes activo.");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "Operación del mes" })).not.toBeInTheDocument();
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

    expect(screen.getByRole("region", { name: "Operación del mes" })).toHaveTextContent("Legacy operation");
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el reporte.");
    await user.click(screen.getByRole("button", { name: "Reintentar reporte" }));
    expect(retrySupport).toHaveBeenCalledWith("report");
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
});
