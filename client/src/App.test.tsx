import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./pages/TemplatePage", () => ({ TemplatePage: () => <h2>Plantilla test</h2> }));
vi.mock("./pages/ActiveMonthPage", () => ({ ActiveMonthPage: () => <h2>Mes activo test</h2> }));
vi.mock("./pages/CloseMonthPage", () => ({ CloseMonthPage: () => <h2>Cierre test</h2> }));
vi.mock("./pages/PocketsPage", () => ({ PocketsPage: () => <h2>Gestión de bolsillos test</h2> }));

describe("App pocket route", () => {
  it("exposes Bolsillos navigation and renders the pocket management route", () => {
    render(
      <MemoryRouter initialEntries={["/pockets"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Bolsillos" })).toHaveAttribute("href", "/pockets");
    expect(screen.getByRole("heading", { name: "Gestión de bolsillos test" })).toBeInTheDocument();
  });
});
