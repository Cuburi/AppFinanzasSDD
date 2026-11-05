import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CloseMonthPage } from "./CloseMonthPage";
import type { ClosureReview, Month } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  getMonth: vi.fn(),
  getLatestClosedMonth: vi.fn(),
  getClosureReview: vi.fn(),
  applyClosureAction: vi.fn(),
  closeMonth: vi.fn(),
  openMonth: vi.fn(),
}));
vi.mock("../lib/api", () => ({ api: apiMock }));

const month: Month = {
  id: "m1",
  year: 2026,
  month: 10,
  status: "ACTIVE",
  openedAt: "2026-10-01",
  closedAt: null,
  incomes: [],
  monthlyIncomeTotal: 1000000,
  openingBalance: 0,
  openingSourceMonthId: null,
  closureAllocation: null,
  availableMoney: 300000,
  cashBalance: 20000,
  categories: [],
};
const review: ClosureReview = {
  monthId: "m1",
  status: "ACTIVE",
  canClose: false,
  requiresDisposition: true,
  closureAllocation: null,
  availableMoney: 300000,
  availableMoneyBlocker: "SURPLUS",
  pendingDeficits: [],
  pendingSurpluses: [],
  budgetVariances: [],
};
const closed = (carryAmount = 300000, excludedAmount = 0): Month => ({
  ...month,
  status: "CLOSED",
  closedAt: "2026-10-31",
  closureAllocation: { availableMoney: 300000, carryAmount, excludedAmount },
});

async function destination() {
  await userEvent.click(await screen.findByRole("button", { name: "Elegir destino →" }));
}
async function confirmation() {
  await userEvent.click(screen.getByRole("button", { name: "Revisar cierre →" }));
}

describe("guided monthly closure", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.history.replaceState(null, "", "/close-month");
    apiMock.getActiveMonth.mockResolvedValue(month);
    apiMock.getClosureReview.mockResolvedValue(review);
    apiMock.getLatestClosedMonth.mockResolvedValue(null);
    apiMock.closeMonth.mockResolvedValue(closed());
  });
  afterEach(cleanup);

  it.each([
    ["Pasar todo al siguiente mes", 300000, 0],
    ["Dejar todo fuera del seguimiento", 0, 300000],
  ])("confirms %s before sending exactly one disposition", async (label, carryAmount, excludedAmount) => {
    apiMock.closeMonth.mockResolvedValue(closed(carryAmount as number, excludedAmount as number));
    render(<CloseMonthPage />);
    await destination();
    await userEvent.click(screen.getByRole("radio", { name: new RegExp(label as string) }));
    expect(screen.queryByLabelText("Al siguiente mes (COP)")).not.toBeInTheDocument();

    await confirmation();
    expect(apiMock.closeMonth).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));
    await screen.findByRole("region", { name: "Resumen del mes cerrado" });

    expect(apiMock.closeMonth.mock.calls).toEqual([["m1", { carryAmount, excludedAmount }]]);
    expect(window.location.search).toBe("?closedMonthId=m1");
    expect(screen.getByText(/no es un gasto/i)).toBeInTheDocument();
  });

  it.each([
    ["100000", "200000", 100000, 200000],
    ["100000.01", "199999.99", 100000.01, 199999.99],
  ])("accepts exact split %s/%s preserving cents and navigation", async (a, b, carryAmount, excludedAmount) => {
    render(<CloseMonthPage />);
    await destination();
    await userEvent.click(screen.getByRole("radio", { name: /Dividir el sobrante/ }));
    await userEvent.type(screen.getByLabelText("Al siguiente mes (COP)"), a as string);
    await userEvent.type(screen.getByLabelText("Fuera del seguimiento (COP)"), b as string);
    await confirmation();
    await userEvent.click(screen.getByRole("button", { name: "← Cambiar destino" }));
    expect(screen.getByLabelText("Al siguiente mes (COP)")).toHaveValue(a);

    await confirmation();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));
    await waitFor(() => expect(apiMock.closeMonth).toHaveBeenCalledWith("m1", { carryAmount, excludedAmount }));
  });

  it.each([
    "100000", "-1", "NaN", "Infinity", "1e5", "100000xyz", "100000.001", "9007199254740991", "",
  ])('blocks invalid split "%s" without posting', async (amount) => {
    render(<CloseMonthPage />);
    await destination();
    await userEvent.click(screen.getByRole("radio", { name: /Dividir el sobrante/ }));
    if (amount) await userEvent.type(screen.getByLabelText("Al siguiente mes (COP)"), amount);
    await userEvent.type(screen.getByLabelText("Fuera del seguimiento (COP)"), "199999.99");

    expect(screen.getByRole("button", { name: "Revisar cierre →" })).toBeDisabled();
    expect(screen.getByRole("status", { name: "Distribución" })).toHaveTextContent(/sumen exactamente/);
    expect(apiMock.closeMonth).not.toHaveBeenCalled();
  });

  it("collapses native review details and excludes inactive panels accessibly", async () => {
    render(<CloseMonthPage />);
    const summary = await screen.findByText("Ver efectivo, bolsillos y presupuesto");
    await userEvent.click(summary);
    expect(summary.parentElement).toHaveAttribute("open");

    await destination();
    expect(summary.parentElement).not.toHaveAttribute("open");
    expect(screen.queryByRole("heading", { name: "Esto es lo que te queda" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "← Volver a revisar" }));
    expect(summary.parentElement).not.toHaveAttribute("open");
    expect(screen.getByText("Salidas netas").nextElementSibling).toHaveTextContent("700.000");
    expect(screen.getByText(/no se suma otra vez/)).toBeInTheDocument();
  });

  it("disables duplicate close requests while pending", async () => {
    let resolve!: (value: Month) => void;
    apiMock.closeMonth.mockReturnValue(new Promise<Month>(r => { resolve = r; }));
    render(<CloseMonthPage />);
    await destination();
    await confirmation();
    const button = screen.getByRole("button", { name: "Confirmar cierre" });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(button).toBeDisabled();
    expect(apiMock.closeMonth).toHaveBeenCalledTimes(1);

    resolve(closed());
    await screen.findByRole("region", { name: "Resumen del mes cerrado" });
  });

  it("reconciles a stale close failure and requires reviewing new totals", async () => {
    apiMock.closeMonth.mockRejectedValue(new Error("Suma desactualizada"));
    render(<CloseMonthPage />);
    await destination();
    await confirmation();
    apiMock.getActiveMonth.mockResolvedValue({ ...month, availableMoney: 200000 });
    apiMock.getClosureReview.mockResolvedValue({ ...review, availableMoney: 200000 });
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Suma desactualizada");
    expect(await screen.findByRole("heading", { name: "Esto es lo que te queda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir destino →" })).toBeEnabled();
    expect(apiMock.closeMonth).toHaveBeenCalledTimes(1);
  });

  it("preserves close and reconciliation errors and blocks stale submissions", async () => {
    render(<CloseMonthPage />);
    await destination();
    await confirmation();
    apiMock.closeMonth.mockRejectedValue(new Error("Conexión perdida"));
    apiMock.getActiveMonth.mockRejectedValue(new Error("Sin revisión"));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Conexión perdida.*Sin revisión/);
    expect(screen.queryByRole("button", { name: "Confirmar cierre" })).not.toBeInTheDocument();
  });

  it("reloads the exact closed URL before active lookup and opens with balance not income", async () => {
    window.history.replaceState(null, "", "/close-month?closedMonthId=m1");
    apiMock.getMonth.mockResolvedValue(closed());
    const next = {
      ...month, id: "m2", month: 11, openingBalance: 300000,
      monthlyIncomeTotal: 0, availableMoney: 300000,
    };
    apiMock.openMonth.mockResolvedValue(next);
    apiMock.getClosureReview.mockResolvedValue({ ...review, monthId: "m2" });
    render(<CloseMonthPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Abrir noviembre de 2026" }));
    await screen.findByRole("heading", { name: "Esto es lo que te queda" });

    expect(apiMock.getMonth).toHaveBeenCalledWith("m1");
    expect(apiMock.getActiveMonth).not.toHaveBeenCalled();
    expect(apiMock.openMonth).toHaveBeenCalledWith({ year: 2026, month: 11 });
    expect(window.location.search).toBe("");
    expect(screen.getByText("Saldo inicial").nextElementSibling).toHaveTextContent("300.000");
    expect(screen.getByText("+ Ingresos").nextElementSibling).toHaveTextContent("$0 COP");
  });

  it("rejects a different month from a stale URL response and permits retry", async () => {
    window.history.replaceState(null, "", "/close-month?closedMonthId=m1");
    apiMock.getMonth.mockResolvedValue({ ...closed(), id: "other" });
    render(<CloseMonthPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/identidad/);
    expect(screen.queryByRole("region", { name: "Resumen del mes cerrado" })).not.toBeInTheDocument();

    apiMock.getMonth.mockResolvedValue(closed());
    await userEvent.click(screen.getByRole("button", { name: "Refrescar" }));
    await screen.findByRole("region", { name: "Resumen del mes cerrado" });
  });

  it("restores legacy latest-closed history when no active month exists", async () => {
    apiMock.getActiveMonth.mockResolvedValue(null);
    apiMock.getLatestClosedMonth.mockResolvedValue({ ...closed(), closureAllocation: null });
    render(<CloseMonthPage />);
    expect(await screen.findByText(/sin distribución registrada/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resumen del mes cerrado" })).toBeInTheDocument();
  });

  it("shows no-month and accessible loading/retry errors", async () => {
    apiMock.getActiveMonth.mockRejectedValueOnce(new Error("No disponible")).mockResolvedValue(null);
    render(<CloseMonthPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(await screen.findByRole("alert")).toHaveTextContent("No disponible");
    await userEvent.click(screen.getByRole("button", { name: "Refrescar" }));
    expect(await screen.findByRole("heading", { name: "No hay mes activo" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("preserves deficit coverage and blocks negative availability", async () => {
    apiMock.getClosureReview.mockResolvedValue({
      ...review,
      availableMoney: -90,
      availableMoneyBlocker: "DEFICIT",
      pendingDeficits: [{ subcategoryId: "food", subcategoryName: "Comida", amount: 90 }],
      pendingSurpluses: [{
        subcategoryId: "fun", subcategoryName: "Salidas", amount: 100,
        defaultPocketId: null, requiresPocketSelection: true,
      }],
    });
    render(<CloseMonthPage />);
    expect(await screen.findByRole("status", { name: "Danger: Dinero disponible en déficit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir destino →" })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Subcategoría origen con sobrante"), "fun");
    await userEvent.type(screen.getByLabelText("Monto"), "90");
    await userEvent.click(screen.getByRole("button", { name: "Cubrir desfalco" }));

    await waitFor(() => expect(apiMock.applyClosureAction).toHaveBeenCalledWith({
      monthId: "m1",
      type: "DEFICIT_COVER_FROM_SUBCATEGORY",
      sourceSubcategoryId: "fun",
      targetSubcategoryId: "food",
      amount: 90,
      description: "Cobertura de desfalco al cierre",
    }));
    expect(apiMock.closeMonth).not.toHaveBeenCalled();
  });

  it("preserves zero bodyless close, December rollover, pending open and retry errors", async () => {
    apiMock.getActiveMonth.mockResolvedValue({ ...month, month: 12, availableMoney: 0 });
    apiMock.getClosureReview.mockResolvedValue({
      ...review, availableMoney: 0, requiresDisposition: false, canClose: true,
    });
    apiMock.closeMonth.mockResolvedValue({ ...closed(0, 0), month: 12 });
    render(<CloseMonthPage />);
    await destination();
    await confirmation();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));
    const open = await screen.findByRole("button", { name: "Abrir enero de 2027" });
    expect(apiMock.closeMonth.mock.calls).toEqual([["m1"]]);

    apiMock.openMonth.mockRejectedValueOnce(new Error("Ya existe"));
    await userEvent.click(open);
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe");
    let resolve!: (value: Month) => void;
    apiMock.openMonth.mockReturnValue(new Promise<Month>(r => { resolve = r; }));
    await userEvent.click(open);
    expect(open).toBeDisabled();
    await userEvent.click(open);
    expect(apiMock.openMonth).toHaveBeenCalledTimes(2);

    apiMock.getClosureReview.mockRejectedValue(new Error("Revisión falló"));
    resolve({ ...month, id: "m2", year: 2027, month: 1 });
    expect(await screen.findByRole("alert")).toHaveTextContent(/mes se abrió.*Revisión falló/i);
    expect(window.location.search).toBe("");
    expect(apiMock.openMonth).toHaveBeenLastCalledWith({ year: 2027, month: 1 });
  });
});
