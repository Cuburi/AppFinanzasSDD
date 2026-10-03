import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PocketRecentMovements } from "./PocketRecentMovements";

describe("PocketRecentMovements", () => {
  it("keeps the first five supplied movements in response order with accurate provenance", () => {
    render(
      <PocketRecentMovements
        movements={[
          { id: "external", type: "POCKET_DEPOSIT_EXTERNAL", sourceKind: "EXTERNAL", sourceLabel: "Employer", amount: 500, occurredAt: "2026-05-14T12:00:00.000Z", description: "Payroll", direction: "in" },
          { id: "external-unlabelled", type: "POCKET_DEPOSIT_EXTERNAL", sourceKind: "EXTERNAL", amount: 75, occurredAt: "2026-05-13T12:00:00.000Z", description: null, direction: "in" },
          { id: "month", type: "POCKET_DEPOSIT_FROM_AVAILABLE", amount: 50, occurredAt: "2026-05-12T12:00:00.000Z", description: "Savings", direction: "in" },
          { id: "four", type: "POCKET_TRANSFER", amount: 20, occurredAt: "2026-05-11T12:00:00.000Z", description: "Transfer", direction: "out" },
          { id: "five", type: "POCKET_TRANSFER", amount: 10, occurredAt: "2026-05-10T12:00:00.000Z", description: "Transfer two", direction: "out" },
          { id: "six", type: "POCKET_TRANSFER", amount: 5, occurredAt: "2026-05-09T12:00:00.000Z", description: "Not shown", direction: "out" },
        ]}
      />,
    );

    const movements = screen.getAllByRole("listitem");
    expect(movements).toHaveLength(5);
    expect(movements[0]).toHaveTextContent("Externo — Employer");
    expect(movements[1]).toHaveTextContent("Origen externo");
    expect(movements[1]).toHaveTextContent("Movimiento sin descripción");
    expect(movements[2]).toHaveTextContent("Financiado por mes — Disponible del mes");
    expect(within(movements[0]!).getByRole("time")).toHaveAttribute("dateTime", "2026-05-14T12:00:00.000Z");
    expect(screen.queryByText("Not shown")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });

  it("labels a pocket withdrawal as an understandable outgoing spend", () => {
    render(
      <PocketRecentMovements
        movements={[{ id: "withdrawal", type: "DEFICIT_COVER_FROM_POCKET", amount: 25, occurredAt: "2026-05-14T12:00:00.000Z", description: "Groceries", direction: "out" }]}
      />,
    );

    const movement = screen.getByText(/Retiro o gasto del bolsillo/).closest("li");

    expect(movement).toHaveClass("pocket-movement-out");
    expect(within(movement!).getByText("Salida")).toHaveClass("pocket-movement-direction");
    expect(movement).toHaveTextContent("Salida");
    expect(movement).toHaveTextContent("$25.00");
    expect(movement).toHaveTextContent("Groceries");
    expect(movement).toHaveTextContent("Retiro o gasto del bolsillo");
  });

  it("explains when the current response has no recent movements", () => {
    render(<PocketRecentMovements movements={[]} />);

    expect(screen.getByText("No se recibieron movimientos recientes.")).toBeInTheDocument();
  });

  it("preserves the UTC calendar date for a movement recorded at midnight", () => {
    const { container } = render(
      <PocketRecentMovements
        movements={[
          { id: "midnight", type: "POCKET_DEPOSIT_EXTERNAL", sourceKind: "EXTERNAL", amount: 50, occurredAt: "2026-05-14T00:00:00.000Z", description: "Ingreso", direction: "in" },
        ]}
      />,
    );

    expect(within(container).getByRole("time")).toHaveTextContent("14/05/2026");
  });
});
