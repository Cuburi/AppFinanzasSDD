import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  it("combines inclusive expense filters, excludes other movements, and restores the full ledger on reset", async () => {
    const user = userEvent.setup();
    const history = [
      { id: "cash", occurredAt: "2026-08-02T14:30:00Z", amount: 12000, description: "Cash food", paymentMethod: "CASH" as const, creditCardId: null, category: { id: "food", name: "Alimentación" }, subcategory: { id: "market", name: "Mercado" } },
      { id: "card", occurredAt: "2026-08-03T14:30:00Z", amount: 12000, description: "Card food", paymentMethod: "NON_CASH" as const, creditCardId: null, category: { id: "food", name: "Alimentación" }, subcategory: { id: "restaurant", name: "Restaurantes" } },
      { id: "other", occurredAt: "2026-08-04T14:30:00Z", amount: 12000, description: "Other expense", paymentMethod: "CASH" as const, creditCardId: null, category: null, subcategory: null },
    ];
    const filterDays: LedgerDay[] = history.map((expense) => ({ key: expense.occurredAt.slice(0, 10), items: [{ kind: "entry", entry: entry(expense.id, expense.paymentMethod === "CASH" ? "CASH_EXPENSE" : "NON_CASH_EXPENSE", { occurredAt: expense.occurredAt, metadata: { description: expense.description, paymentMethod: expense.paymentMethod, isSystemEvent: false } }) }] }));
    filterDays[0].items.unshift({ kind: "entry", entry: entry("income", "MONTHLY_INCOME", { metadata: { description: "Salary", paymentMethod: null, isSystemEvent: false } }) });
    render(<MonthlyLedger days={filterDays} expenseHistory={history} status="ready" />);
    expect(screen.getByText("Salary")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-02" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-08-03" } });
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
    expect(screen.queryByText("Other expense")).not.toBeInTheDocument();
    expect(screen.getByText("Cash food")).toBeInTheDocument();
    expect(screen.getByText("Card food")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrar por categoría"), "food");
    await user.selectOptions(screen.getByLabelText("Filtrar por subcategoría"), "market");
    expect(screen.queryByText("Card food")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrar por medio de pago"), "NON_CASH");
    expect(screen.getByText("No hay gastos que coincidan con los filtros.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrar por categoría"), "");
    expect(screen.getByLabelText("Filtrar por subcategoría")).toHaveValue("");
    expect(screen.getByText("Card food")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Other expense")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrar por categoría"), "uncategorized");
    expect(screen.getByText("Other expense")).toBeInTheDocument();
    expect(screen.queryByText("Cash food")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-05" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-08-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha desde no puede ser posterior a la fecha hasta.");
    expect(screen.queryByText("Other expense")).not.toBeInTheDocument();
  });

  it("keeps expense filters disabled until classification data is available", () => {
    render(<MonthlyLedger days={days} expenseHistory={[]} expenseHistoryReady={false} status="ready" />);
    expect(screen.getByLabelText("Filtrar por categoría")).toBeDisabled();
    expect(screen.getByText("Market groceries")).toBeInTheDocument();
    expect(screen.getByText("Los filtros estarán disponibles cuando se cargue el historial de gastos.")).toBeInTheDocument();
  });

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
      expect(document.querySelector("time")).toHaveTextContent("1/08/2026");
      expect(document.querySelector("time")).toHaveTextContent("7:30 p. m.");
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

  it("uses a native details summary and keeps complete details collapsed by default", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<MonthlyLedger days={days} onDelete={onDelete} onEdit={onEdit} status="ready" />);

    const details = document.querySelector<HTMLDetailsElement>(".monthly-ledger-entry details");
    const disclosure = details?.querySelector("summary");
    expect(details).toBeInTheDocument();
    expect(details).not.toHaveAttribute("open");
    expect(disclosure).toHaveTextContent("Ver detalles de Market groceries");
    expect(disclosure).not.toHaveAttribute("aria-controls");
    expect(document.querySelector("time")).toHaveAttribute("dateTime", "2026-08-02T14:30:00.000Z");
    expect(screen.getByRole("button", { name: "Editar Market groceries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar Market groceries" })).toBeInTheDocument();

    await user.click(disclosure!);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Origen: Mes")).toBeInTheDocument();
    expect(screen.getByText("Destino: Gasto")).toBeInTheDocument();
    expect(screen.getByText("Medio de pago: Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Disponible del mes: $-12.000 COP")).toBeInTheDocument();
    expect(screen.getByText("Saldo en efectivo: $0 COP")).toBeInTheDocument();
    expect(screen.getByText("Disponible de subcategoría: $-12.000 COP")).toBeInTheDocument();
    expect(screen.getByText("Saldo del bolsillo: $0 COP")).toBeInTheDocument();

    await user.click(disclosure!);
    expect(details).not.toHaveAttribute("open");

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
