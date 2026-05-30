import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { routerFutureFlags } from "./router-future-flags";

vi.mock("./pages/TemplatePage", () => ({ TemplatePage: () => <h2>Plantilla test</h2> }));
vi.mock("./pages/ActiveMonthPage", () => ({ ActiveMonthPage: () => <h2>Mes activo test</h2> }));
vi.mock("./pages/CloseMonthPage", () => ({ CloseMonthPage: () => <h2>Cierre test</h2> }));
vi.mock("./pages/PocketsPage", () => ({ PocketsPage: () => <h2>Gestión de bolsillos test</h2> }));
vi.mock("./pages/DebtsPage", () => ({ DebtsPage: () => <h2>Control de deudas test</h2> }));
vi.mock("./pages/ReportsPage", () => ({ ReportsPage: () => <h2>Basic reports test</h2> }));

afterEach(() => {
  cleanup();
});

describe("App pocket route", () => {
  it("exposes Bolsillos navigation and renders the pocket management route", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/pockets"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Bolsillos" })).toHaveAttribute("href", "/pockets");
    expect(screen.getByRole("heading", { name: "Gestión de bolsillos test" })).toBeInTheDocument();
  });
});

describe("App debt route", () => {
  it("exposes Deudas navigation and renders the debt management route", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/debts"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Deudas" })).toHaveAttribute("href", "/debts");
    expect(screen.getByRole("heading", { name: "Control de deudas test" })).toBeInTheDocument();
  });
});

describe("App reports route", () => {
  it("exposes Reports navigation and renders the reports route", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/reports"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("heading", { name: "Basic reports test" })).toBeInTheDocument();
  });
});
