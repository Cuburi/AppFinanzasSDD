import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActivityLedger } from "./ActivityLedger";
import type { ActivityRow } from "../model/buildActivityRows";

const rows: ActivityRow[] = [
  {
    id: "income-1",
    type: "income",
    date: "2026-05-05T00:00:00.000Z",
    concept: "Sueldo",
    metadata: "Neto",
    amount: 1000,
    record: { id: "income-1", monthId: "month-1", sourceName: "Sueldo", amount: 1000, receivedAt: "2026-05-05T00:00:00.000Z", notes: "Neto", createdAt: "", updatedAt: "" },
  },
  {
    id: "expense-1",
    type: "expense",
    date: "2026-05-03T00:00:00.000Z",
    concept: "Café",
    metadata: "Cafeterías · Comida · Efectivo",
    amount: -20,
    record: { id: "expense-1", occurredAt: "2026-05-03T00:00:00.000Z", paymentMethod: "CASH", amount: 20, description: "Café", creditCardId: null, category: { id: "category-1", name: "Comida" }, subcategory: { id: "subcategory-1", name: "Cafeterías" } },
  },
];

afterEach(cleanup);

describe("ActivityLedger", () => {
  it("names the limited activity honestly and exposes text-led income and expense rows", () => {
    render(<ActivityLedger canMutate getExpenseCardLabel={() => null} onDeleteExpense={vi.fn()} onDeleteIncome={vi.fn()} onEditExpense={vi.fn()} onEditIncome={vi.fn()} rows={rows} />);

    const ledger = screen.getByRole("region", { name: "Gastos e ingresos" });
    expect(within(ledger).getByRole("heading", { name: "Gastos e ingresos" })).toBeInTheDocument();
    expect(within(ledger).getByText("Incluye gastos e ingresos registrados; no incluye retiros ni depósitos a bolsillos.")).toBeInTheDocument();
    expect(within(ledger).getByText("Ingreso")).toBeInTheDocument();
    expect(within(ledger).getByText("Gasto")).toBeInTheDocument();
    expect(within(ledger).getByText("$1.000 COP")).toBeInTheDocument();
    expect(within(ledger).getByText("$-20 COP")).toBeInTheDocument();
  });

  it("keeps record-specific edit actions available", async () => {
    const user = userEvent.setup();
    const onEditIncome = vi.fn();
    const onEditExpense = vi.fn();
    render(<ActivityLedger canMutate getExpenseCardLabel={() => null} onDeleteExpense={vi.fn()} onDeleteIncome={vi.fn()} onEditExpense={onEditExpense} onEditIncome={onEditIncome} rows={rows} />);

    await user.click(screen.getByRole("button", { name: "Editar ingreso Sueldo" }));
    await user.click(screen.getByRole("button", { name: "Editar gasto Café" }));

    expect(onEditIncome).toHaveBeenCalledWith(rows[0].record);
    expect(onEditExpense).toHaveBeenCalledWith(rows[1].record);
  });
});
