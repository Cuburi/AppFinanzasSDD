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
vi.mock("./pages/CreditCardsPage", () => ({ CreditCardsPage: () => <h2>Credit Cards dashboard test</h2> }));

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

describe("App active month route", () => {
  it("keeps Mes activo routed to the current page contract", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/active-month"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Mes activo" })).toHaveAttribute("href", "/active-month");
    expect(screen.getByRole("heading", { name: "Mes activo test" })).toBeInTheDocument();
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

  it("keeps the premium app shell accessible while preserving reports navigation", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/reports"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("banner")).toHaveTextContent("Finance command center");
    expect(screen.getByRole("navigation", { name: "Primary sections" })).toContainElement(
      screen.getByRole("link", { name: "Reports" }),
    );
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Basic reports test" }));
  });
});

describe("App credit cards route", () => {
  it("exposes Credit Cards navigation and renders the direct route", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/credit-cards"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Credit Cards" })).toHaveAttribute("href", "/credit-cards");
    expect(screen.getByRole("heading", { name: "Credit Cards dashboard test" })).toBeInTheDocument();
  });
});
