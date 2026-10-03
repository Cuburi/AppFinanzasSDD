import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatePage } from "./TemplatePage";
import type { SavingsPocket, Template } from "../types";

const apiMock = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  getPockets: vi.fn(),
  updateTemplate: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

const template: Template = {
  categories: [
    {
      id: "cat-house",
      name: "Hogar",
      sortOrder: 0,
      subcategories: [
        {
          id: "sub-food",
          name: "Supermercado",
          plannedAmount: 300,
          defaultPocketId: null,
          active: true,
          sortOrder: 0,
        },
      ],
    },
  ],
};

const activePockets: SavingsPocket[] = [
  { id: "pocket-emergency", name: "Emergencias", goalAmount: 1000, active: true, balance: 250 },
  { id: "pocket-food", name: "Comida", goalAmount: null, active: true, balance: 75 },
];

describe("TemplatePage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getTemplate.mockResolvedValue(template);
    apiMock.getPockets.mockResolvedValue(activePockets);
    apiMock.updateTemplate.mockImplementation(async (input) => ({
      categories: input.categories.map((category: { name: string; subcategories: Array<{ name: string; plannedAmount: number; defaultPocketId: string | null }> }) => ({
        id: `saved-${category.name}`,
        name: category.name,
        sortOrder: 0,
        subcategories: category.subcategories.map((subcategory, index) => ({
          id: `saved-sub-${index}`,
          name: subcategory.name,
          plannedAmount: subcategory.plannedAmount,
          defaultPocketId: subcategory.defaultPocketId,
          active: true,
          sortOrder: index,
        })),
      })),
    }));
  });

  it("presents the template as a future-month budget hierarchy with planned totals", async () => {
    render(<TemplatePage />);

    expect(await screen.findByRole("heading", { name: "Estructura para meses futuros" })).toBeInTheDocument();
    expect(screen.getByText("Los meses ya abiertos no cambian.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Plan total de próximos meses" })).toHaveTextContent("$300 COP");
    expect(screen.getByRole("article", { name: "Categoría Hogar" })).toHaveTextContent("Subtotal de Hogar$300 COP");
    expect(screen.getByLabelText("Subcategoría Supermercado")).toHaveValue("Supermercado");
  });

  it("uses an initially open native disclosure for each category's editable subcategories", async () => {
    const user = userEvent.setup();

    render(<TemplatePage />);

    const disclosure = await screen.findByRole("group", { name: "Subcategorías de Hogar" });
    const trigger = disclosure.querySelector("summary");

    expect(disclosure).toHaveAttribute("open");
    expect(trigger).toHaveAttribute("aria-label", "Alternar subcategorías de Hogar");

    await user.click(trigger!);

    expect(disclosure).not.toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Agregar categoría" }));

    expect(disclosure).not.toHaveAttribute("open");
  });

  it("normalizes leading zeros in planned amounts", async () => {
    render(<TemplatePage />);

    const amount = await screen.findByLabelText("Monto planificado de Supermercado");
    fireEvent.change(amount, { target: { value: "0124" } });

    expect(amount).toHaveValue(124);

    fireEvent.change(amount, { target: { value: "000.50" } });
    expect(amount).toHaveValue(0.5);
  });

  it("keeps the default pocket optional and saves an empty selection as no default", async () => {
    const user = userEvent.setup();

    render(<TemplatePage />);

    const defaultPocketSelect = await screen.findByLabelText("Bolsillo por defecto (opcional)");
    expect(defaultPocketSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "Sin bolsillo por defecto" })).toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenCalledWith("active");

    await user.click(screen.getByRole("button", { name: "Guardar plantilla" }));

    await waitFor(() =>
      expect(apiMock.updateTemplate).toHaveBeenCalledWith({
        categories: [
          {
            name: "Hogar",
            subcategories: [{ name: "Supermercado", plannedAmount: 300, defaultPocketId: null }],
          },
        ],
      }),
    );
  });

  it("saves a selected active pocket as the optional default", async () => {
    const user = userEvent.setup();

    render(<TemplatePage />);

    await user.selectOptions(await screen.findByLabelText("Bolsillo por defecto (opcional)"), "pocket-food");

    expect(screen.getByRole("option", { name: "Comida ($75 COP)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar plantilla" }));

    await waitFor(() =>
      expect(apiMock.updateTemplate).toHaveBeenCalledWith({
        categories: [
          {
            name: "Hogar",
            subcategories: [{ name: "Supermercado", plannedAmount: 300, defaultPocketId: "pocket-food" }],
          },
        ],
      }),
    );
  });
});
