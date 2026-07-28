import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
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
  vi.unstubAllGlobals();
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
  it("redirects the root route to Mes activo", async () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Mes activo test" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Mes activo" })[0]).toHaveAttribute("aria-current", "page");
  });

  it("keeps Mes activo routed to the current page contract", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/active-month"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Mes activo" })).toHaveAttribute("href", "/active-month");
    expect(screen.getByRole("heading", { name: "Mes activo test" })).toBeInTheDocument();
  });

  it("uses the compact shell landmark and marks the active navigation route", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/active-month"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("banner")).toHaveTextContent("AppFinanzas");
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toContainElement(
      screen.getByRole("link", { name: "Mes activo" }),
    );
    expect(screen.getByRole("link", { name: "Mes activo" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Mes activo test" }));
  });

  it("orders Mes activo first in desktop navigation", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/reports"]}>
        <App />
      </MemoryRouter>,
    );

    const desktopNavigation = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(desktopNavigation).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Mes activo",
      "Plantilla",
      "Bolsillos",
      "Deudas",
      "Tarjetas de crédito",
      "Cierre",
      "Reportes",
    ]);
  });

  it("opens an accessible menu drawer, closes it on Escape, and restores focus to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/active-month"]}>
        <App />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Menú" });
    await user.click(trigger);

    const drawer = screen.getByRole("dialog", { name: "Navegación principal" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(drawer).toContainElement(within(drawer).getByRole("link", { name: "Plantilla" }));
    expect(drawer).toHaveFocus();

    fireEvent(drawer, new Event("cancel", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    expect(trigger).toHaveFocus();
  });

  it("closes the menu drawer and restores document interaction when the desktop layout becomes active", async () => {
    const user = userEvent.setup();
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(min-width: 1120px)",
      addEventListener: (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
        changeListener = listener;
      },
      removeEventListener: (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
        if (changeListener === listener) changeListener = undefined;
      },
    })));

    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/active-month"]}>
        <App />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Menú" });
    await user.click(trigger);
    const drawer = screen.getByRole("dialog", { name: "Navegación principal" }) as HTMLDialogElement;

    changeListener?.({ matches: true } as MediaQueryListEvent);

    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    expect(drawer.open).toBe(false);
    expect(trigger).toHaveFocus();

    await user.click(screen.getAllByRole("link", { name: "Reportes" })[0]);
    expect(await screen.findByRole("heading", { name: "Basic reports test" })).toBeInTheDocument();
  });

  it("removes its desktop breakpoint listener when the navigation shell unmounts", () => {
    const removeEventListener = vi.fn();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(min-width: 1120px)",
      addEventListener: vi.fn(),
      removeEventListener,
    })));

    const { unmount } = render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/active-month"]}>
        <App />
      </MemoryRouter>,
    );

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("closes the drawer when a route is selected while preserving active-route semantics", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/active-month"]}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Menú" }));
    const drawer = screen.getByRole("dialog", { name: "Navegación principal" });
    await user.click(within(drawer).getByRole("link", { name: "Reportes" }));

    expect(await screen.findByRole("heading", { name: "Basic reports test" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menú" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("link", { name: "Reportes" })[0]).toHaveAttribute("aria-current", "page");
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
  it("exposes Reportes navigation and renders the reports route", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/reports"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Reportes" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("heading", { name: "Basic reports test" })).toBeInTheDocument();
  });

  it("keeps the shared shell accessible on unaffected routes", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/reports"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("banner")).toHaveTextContent("AppFinanzas");
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toContainElement(
      screen.getByRole("link", { name: "Reportes" }),
    );
    expect(screen.getByRole("link", { name: "Reportes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Basic reports test" }));
  });
});

describe("App credit cards route", () => {
  it("exposes Tarjetas de crédito navigation and renders the direct route", () => {
    render(
      <MemoryRouter future={routerFutureFlags} initialEntries={["/credit-cards"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Tarjetas de crédito" })).toHaveAttribute("href", "/credit-cards");
    expect(screen.getByRole("heading", { name: "Credit Cards dashboard test" })).toBeInTheDocument();
  });
});
