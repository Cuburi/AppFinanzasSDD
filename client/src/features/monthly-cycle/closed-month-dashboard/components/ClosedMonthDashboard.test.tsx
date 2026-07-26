import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClosedMonthDashboard } from "./ClosedMonthDashboard";
import type { Month } from "../../../../types";

const closedMonth: Month = {
  id: "closed-month-1",
  year: 2026,
  month: 12,
  status: "CLOSED",
  openedAt: "2026-12-01T00:00:00.000Z",
  closedAt: "2026-12-31T00:00:00.000Z",
  incomes: [],
  monthlyIncomeTotal: 1_250.5,
  availableMoney: 300.25,
  cashBalance: 85,
  categories: [],
};

describe("ClosedMonthDashboard", () => {
  afterEach(cleanup);

  it("renders the supplied closed-month values as read-only information", () => {
    render(<ClosedMonthDashboard month={closedMonth} onOpenNextMonth={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Diciembre 2026" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /mes cerrado/i })).toBeInTheDocument();
    expect(screen.getByText("Ingresos del mes").nextElementSibling).toHaveTextContent("$1250.50");
    expect(screen.getByText("Dinero disponible").nextElementSibling).toHaveTextContent("$300.25");
    expect(screen.queryByRole("button", { name: /cerrar|transferir|cubrir|registrar/i })).not.toBeInTheDocument();
  });

  it("offers progression without changing the closed month", async () => {
    const user = userEvent.setup();
    const openNextMonth = vi.fn();

    render(<ClosedMonthDashboard month={closedMonth} onOpenNextMonth={openNextMonth} />);

    await user.click(screen.getByRole("button", { name: "Abrir enero de 2027" }));
    expect(openNextMonth).toHaveBeenCalledTimes(1);
    expect(closedMonth).toMatchObject({ id: "closed-month-1", year: 2026, month: 12, status: "CLOSED" });
  });

  it("labels progression within the same year for a non-December closed month", () => {
    render(<ClosedMonthDashboard month={{ ...closedMonth, month: 5, year: 2027 }} onOpenNextMonth={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Abrir junio de 2027" })).toBeInTheDocument();
  });
});
