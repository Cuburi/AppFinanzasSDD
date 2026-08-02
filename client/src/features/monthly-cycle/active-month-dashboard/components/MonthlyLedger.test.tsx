import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MonthlyLedger } from "./MonthlyLedger";
import type { LedgerDay, LedgerViewEntry } from "../model/monthlyLedger";

const entry = (entryKey: string, eventType: string, options: Partial<LedgerViewEntry> = {}): LedgerViewEntry => ({
  entryKey,
  occurredAt: "2026-08-02T14:30:00.000Z",
  eventType,
  direction: "OUTFLOW",
  source: { kind: "MONTH", id: "month-1" },
  destination: { kind: "EXPENSE", id: "expense-1" },
  amount: 12000,
  balanceEffects: { availableMoney: -12000, cashBalance: 0, subcategoryAvailable: -12000, pocketBalance: 0 },
  metadata: { description: "Market groceries", paymentMethod: "CASH", isSystemEvent: false },
  typeLabel: "Expense",
  isReadOnly: false,
  ...options,
});

const expenseEntry = entry("expense-b", "CASH_EXPENSE");
const days: LedgerDay[] = [{
  key: "2026-08-02",
  items: [
    { kind: "system-run", entries: [entry("system-a", "CASH_CARRYOVER", { metadata: { description: "Carryover", paymentMethod: null, isSystemEvent: true }, typeLabel: "Cash carryover", isReadOnly: true })] },
    { kind: "entry", entry: expenseEntry },
    { kind: "system-run", entries: [entry("system-c", "DEFICIT_RESOLUTION", { metadata: { description: "Deficit resolved", paymentMethod: null, isSystemEvent: true }, typeLabel: "Deficit resolution", isReadOnly: true })] },
  ],
}];

afterEach(cleanup);

describe("MonthlyLedger", () => {
  it("does not present an empty ledger while its first load is pending", () => {
    render(<MonthlyLedger days={[]} status="loading" />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando movimientos del mes.");
    expect(screen.queryByText("No hay movimientos registrados para este mes.")).not.toBeInTheDocument();
  });

  it("makes financial direction, read-only reasons, and Colombian formatting explicit", () => {
    const readOnlyDays: LedgerDay[] = [{
      key: "2026-08-02",
      items: [
        { kind: "entry", entry: entry("transfer", "CASH_WITHDRAWAL", { direction: "TRANSFER", isReadOnly: true }) },
        { kind: "entry", entry: entry("unknown", "UNRESOLVED_EVENT", { isReadOnly: true, typeLabel: "Unknown event" }) },
      ],
    }];
    render(<MonthlyLedger days={readOnlyDays} status="ready" />);

    expect(screen.getByRole("heading", { name: "2 de agosto de 2026" })).toBeInTheDocument();
    expect(screen.getByText("Transferencia")).toBeInTheDocument();
    expect(screen.getByText("Salida")).toBeInTheDocument();
    expect(screen.getAllByText("$12.000 COP")).toHaveLength(2);
    expect(screen.getByText("Esta transferencia no se puede editar ni eliminar desde este historial.")).toBeInTheDocument();
    expect(screen.getByText("Este tipo de movimiento no se reconoce y no se puede editar ni eliminar desde este historial.")).toBeInTheDocument();
  });

  it("keeps a near-midnight UTC occurrence aligned with its Colombian local-day group", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Bogota";
    const colombianDay: LedgerDay[] = [{
      key: "2026-08-01",
      items: [{ kind: "entry", entry: entry("late-utc", "CASH_EXPENSE", { occurredAt: "2026-08-02T00:30:00.000Z" }) }],
    }];

    try {
      render(<MonthlyLedger days={colombianDay} status="ready" />);

      expect(screen.getByRole("heading", { name: "1 de agosto de 2026" })).toBeInTheDocument();
      expect(screen.getByText("7:30 p. m.")).toBeInTheDocument();
      expect(document.querySelector("time")).toHaveAttribute("dateTime", "2026-08-02T00:30:00.000Z");
    } finally {
      process.env.TZ = originalTimeZone;
    }
  });

  it("preserves backend DOM order and keeps noncontiguous automatic runs as separate collapsed disclosures", async () => {
    const user = userEvent.setup();
    render(<MonthlyLedger days={days} onDelete={vi.fn()} onEdit={vi.fn()} status="ready" />);

    const ledger = screen.getByRole("region", { name: "Movimientos del mes" });
    expect(within(ledger).getByRole("heading", { name: "Movimientos del mes" })).toBeInTheDocument();
    expect(within(ledger).getByRole("heading", { name: "2 de agosto de 2026" })).toBeInTheDocument();
    expect(within(ledger).getAllByRole("button", { name: /movimientos? automáticos?/i })).toHaveLength(2);
    expect(within(ledger).queryByText("Carryover")).not.toBeInTheDocument();
    expect(within(ledger).getByText("Market groceries")).toBeInTheDocument();
    expect(Array.from(ledger.querySelectorAll("article")).map((item) => item.getAttribute("data-entry-key"))).toEqual(["expense-b"]);

    await user.click(within(ledger).getAllByRole("button", { name: /movimientos? automáticos?/i })[0]);
    expect(within(ledger).getByText("Carryover")).toBeInTheDocument();
    expect(within(ledger).queryByText("Deficit resolved")).not.toBeInTheDocument();
    expect(within(ledger).getByText("Este movimiento fue generado automáticamente y no se puede editar ni eliminar.")).toBeInTheDocument();
    expect(Array.from(ledger.querySelectorAll("[data-ledger-item]")).map((item) => item.getAttribute("data-ledger-item"))).toEqual(["system-a", "expense-b", "system-c"]);
  });

  it("shows complete entry details and only gives eligible records working actions", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<MonthlyLedger days={days} onDelete={onDelete} onEdit={onEdit} status="ready" />);

    expect(screen.getByText("Origen: Mes")).toBeInTheDocument();
    expect(screen.getByText("Destino: Gasto")).toBeInTheDocument();
    expect(screen.getByText("Medio de pago: Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Disponible del mes: $-12.000 COP")).toBeInTheDocument();
    expect(screen.getByText("Saldo en efectivo: $0 COP")).toBeInTheDocument();
    expect(screen.getByText("Disponible de subcategoría: $-12.000 COP")).toBeInTheDocument();
    expect(screen.getByText("Saldo del bolsillo: $0 COP")).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute("dateTime", "2026-08-02T14:30:00.000Z");

    await user.click(screen.getByRole("button", { name: "Editar Market groceries" }));
    await user.click(screen.getByRole("button", { name: "Eliminar Market groceries" }));
    expect(onEdit).toHaveBeenCalledWith(expenseEntry);
    expect(onDelete).toHaveBeenCalledWith(expenseEntry);
    expect(screen.queryByRole("button", { name: /Editar Carryover/ })).not.toBeInTheDocument();
  });

  it("exposes each independently available eligible action without a false read-only message", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const { rerender } = render(<MonthlyLedger days={days} onEdit={onEdit} status="ready" />);

    expect(screen.getByRole("button", { name: "Editar Market groceries" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar Market groceries" })).not.toBeInTheDocument();
    expect(screen.queryByText("Este tipo de movimiento no se puede editar ni eliminar desde este historial.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar Market groceries" }));
    expect(onEdit).toHaveBeenCalledWith(expenseEntry);

    const onDelete = vi.fn();
    rerender(<MonthlyLedger days={days} onDelete={onDelete} status="ready" />);
    expect(screen.queryByRole("button", { name: "Editar Market groceries" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar Market groceries" })).toBeInTheDocument();
    expect(screen.queryByText("Este tipo de movimiento no se puede editar ni eliminar desde este historial.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar Market groceries" }));
    expect(onDelete).toHaveBeenCalledWith(expenseEntry);
  });

  it("announces loading, refresh, empty, and retryable error states with keyboard-focusable controls", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<MonthlyLedger days={[]} onRetry={onRetry} status="loading" />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando movimientos del mes.");
    rerender(<MonthlyLedger days={days} onRetry={onRetry} status="refreshing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Actualizando movimientos del mes.");
    rerender(<MonthlyLedger days={[]} onRetry={onRetry} status="ready" />);
    expect(screen.getByText("No hay movimientos registrados para este mes.")).toBeInTheDocument();
    rerender(<MonthlyLedger days={[]} onRetry={onRetry} status="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los movimientos del mes.");
    const retry = screen.getByRole("button", { name: "Reintentar carga" });
    await user.tab();
    expect(retry).toHaveFocus();
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
