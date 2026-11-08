import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PocketRecentMovements } from "./PocketRecentMovements";

const expandMovements = async (user = userEvent.setup()) => {
  await user.click(screen.getByRole("button", { name: /Ver movimientos/ }));
  return user;
};

describe("PocketRecentMovements", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps movements collapsed until the pocket is expanded, then collapses them again", async () => {
    const user = userEvent.setup();
    render(
      <PocketRecentMovements
        movements={[
          { id: "one", type: "POCKET_DEPOSIT_EXTERNAL", sourceKind: "EXTERNAL", amount: 50, occurredAt: "2026-05-14T12:00:00.000Z", description: "Ahorro", direction: "in" },
          { id: "two", type: "POCKET_TRANSFER", amount: 20, occurredAt: "2026-05-13T12:00:00.000Z", description: "Transfer", direction: "out" },
        ]}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Ver movimientos (2)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByText("2 recientes")).toBeInTheDocument();

    await user.click(toggle);

    const hide = screen.getByRole("button", { name: "Ocultar movimientos" });
    expect(hide).toHaveAttribute("aria-expanded", "true");
    expect(hide).toHaveAttribute("aria-controls", screen.getByRole("list").id);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await user.click(hide);

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver movimientos (2)" })).toHaveAttribute("aria-expanded", "false");
  });

  it("expands each pocket's movements independently", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PocketRecentMovements movements={[{ id: "a", type: "POCKET_TRANSFER", amount: 10, occurredAt: "2026-05-14T12:00:00.000Z", description: "First pocket", direction: "in" }]} />
        <PocketRecentMovements movements={[{ id: "b", type: "POCKET_TRANSFER", amount: 20, occurredAt: "2026-05-14T12:00:00.000Z", description: "Second pocket", direction: "in" }]} />
      </>,
    );

    await user.click(screen.getAllByRole("button", { name: "Ver movimientos (1)" })[0]!);

    expect(screen.getByText("First pocket")).toBeInTheDocument();
    expect(screen.queryByText("Second pocket")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ver movimientos (1)" })).toHaveLength(1);
  });

  it("previews three movements, then expands the remaining supplied movements in response order", async () => {
    const user = userEvent.setup();
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
    await expandMovements(user);

    const movements = screen.getAllByRole("listitem");
    expect(movements).toHaveLength(3);
    expect(movements[0]).toHaveTextContent("Externo — Employer");
    expect(movements[1]).toHaveTextContent("Origen externo");
    expect(movements[1]).toHaveTextContent("Movimiento sin descripción");
    expect(movements[2]).toHaveTextContent("Financiado por mes — Disponible del mes");
    expect(within(movements[0]!).getByRole("time")).toHaveAttribute("dateTime", "2026-05-14T12:00:00.000Z");
    expect(screen.queryByText("Not shown")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver 3 movimientos más" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver 3 movimientos más" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByText("Not shown")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar menos movimientos" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });

  it("labels a pocket withdrawal as an understandable outgoing spend", async () => {
    render(
      <PocketRecentMovements
        movements={[{ id: "withdrawal", type: "DEFICIT_COVER_FROM_POCKET", amount: 25, occurredAt: "2026-05-14T12:00:00.000Z", description: "Groceries", direction: "out" }]}
      />,
    );
    await expandMovements();

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
    expect(screen.queryByRole("button", { name: /movimientos/ })).not.toBeInTheDocument();
  });

  it("preserves the UTC calendar date for a movement recorded at midnight", async () => {
    const { container } = render(
      <PocketRecentMovements
        movements={[
          { id: "midnight", type: "POCKET_DEPOSIT_EXTERNAL", sourceKind: "EXTERNAL", amount: 50, occurredAt: "2026-05-14T00:00:00.000Z", description: "Ingreso", direction: "in" },
        ]}
      />,
    );
    await expandMovements();

    expect(within(container).getByRole("time")).toHaveTextContent("14/05/2026");
  });
});
