import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveMonthPage } from "./ActiveMonthPage";
import type { CreditCardView, Month, SavingsPocket } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  getPockets: vi.fn(),
  getCreditCards: vi.fn(),
  openMonth: vi.fn(),
  recordExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  updateMonthCategory: vi.fn(),
  createMonthCategory: vi.fn(),
  deleteMonthCategory: vi.fn(),
  updateMonthSubcategory: vi.fn(),
  createMonthSubcategory: vi.fn(),
  deleteMonthSubcategory: vi.fn(),
  createMonthlyIncome: vi.fn(),
  updateMonthlyIncome: vi.fn(),
  deleteMonthlyIncome: vi.fn(),
  depositToPocket: vi.fn(),
  withdrawCash: vi.fn(),
  getExpenseHistory: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

const activeMonth: Month = {
  id: "month-1",
  year: 2026,
  month: 5,
  status: "ACTIVE",
  openedAt: "2026-05-01T00:00:00.000Z",
  closedAt: null,
  incomes: [
    {
      id: "income-1",
      monthId: "month-1",
      sourceName: "Sueldo",
      amount: 1000,
      receivedAt: "2026-05-05T00:00:00.000Z",
      notes: "neto",
      createdAt: "2026-05-05T00:00:00.000Z",
      updatedAt: "2026-05-05T00:00:00.000Z",
    },
  ],
  monthlyIncomeTotal: 1000,
  availableMoney: 375,
  cashBalance: 80,
  categories: [
    {
      id: "cat-income",
      name: "Ingresos",
      sortOrder: 0,
      templateCategoryId: null,
      subcategories: [
        {
          id: "sub-bonus",
          name: "Bonus",
          plannedAmount: 500,
          available: 500,
          defaultPocketId: null,
          templateSubcategoryId: null,
          sortOrder: 0,
        },
      ],
    },
  ],
};

const activePockets: SavingsPocket[] = [
  { id: "pocket-emergency", name: "Emergencias", goalAmount: 1000, active: true, balance: 250 },
  { id: "pocket-travel", name: "Viaje", goalAmount: null, active: true, balance: 0 },
];

const activeCreditCards: CreditCardView[] = [
  { id: "card-1", ownerId: "owner-1", issuer: "Visa", name: "Daily", limit: 2500, closingDay: 20, dueDay: 28, active: true },
  { id: "card-2", ownerId: "owner-1", issuer: "Mastercard", name: "Travel", limit: null, closingDay: 10, dueDay: 18, active: true },
];

describe("ActiveMonthPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getActiveMonth.mockResolvedValue(activeMonth);
    apiMock.getPockets.mockResolvedValue(activePockets);
    apiMock.getCreditCards.mockResolvedValue(activeCreditCards);
    apiMock.depositToPocket.mockResolvedValue(activeMonth);
    apiMock.createMonthlyIncome.mockResolvedValue(activeMonth);
    apiMock.updateMonthlyIncome.mockResolvedValue(activeMonth);
    apiMock.deleteMonthlyIncome.mockResolvedValue(activeMonth);
    apiMock.recordExpense.mockResolvedValue(activeMonth);
    apiMock.updateExpense.mockResolvedValue(activeMonth);
    apiMock.deleteExpense.mockResolvedValue(activeMonth);
    apiMock.updateMonthCategory.mockResolvedValue(activeMonth);
    apiMock.createMonthCategory.mockResolvedValue(activeMonth);
    apiMock.deleteMonthCategory.mockResolvedValue(activeMonth);
    apiMock.updateMonthSubcategory.mockResolvedValue(activeMonth);
    apiMock.createMonthSubcategory.mockResolvedValue(activeMonth);
    apiMock.deleteMonthSubcategory.mockResolvedValue(activeMonth);
    apiMock.withdrawCash.mockResolvedValue(activeMonth);
    apiMock.getExpenseHistory.mockResolvedValue([
      {
        id: "expense-1",
        occurredAt: "2026-05-12T00:00:00.000Z",
        paymentMethod: "CASH",
        amount: 20,
        description: "Café",
        creditCardId: null,
        category: { id: "cat-income", name: "Ingresos" },
        subcategory: { id: "sub-bonus", name: "Bonus" },
      },
      {
        id: "expense-2",
        occurredAt: "2026-05-15T00:00:00.000Z",
        paymentMethod: "NON_CASH",
        amount: 35,
        description: null,
        creditCardId: "card-1",
        category: { id: "cat-income", name: "Ingresos" },
        subcategory: { id: "sub-bonus", name: "Bonus" },
      },
    ]);
  });

  it("uses an active-pocket selector for deposits instead of a manual pocket ID", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    expect(await screen.findAllByRole("option", { name: "Bonus ($500.00)" })).toHaveLength(2);
    expect(screen.queryByLabelText("ID bolsillo destino")).not.toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenCalledWith("active");

    const depositForm = screen.getByRole("button", { name: "Depositar en bolsillo" }).closest("form");
    if (!depositForm) throw new Error("Missing deposit form.");

    await user.selectOptions(within(depositForm).getByLabelText("Origen subcategoría (opcional)"), "sub-bonus");
    await user.selectOptions(within(depositForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(within(depositForm).getByLabelText("Monto", { selector: "input" }), "125");
    await user.click(within(depositForm).getByRole("button", { name: "Depositar en bolsillo" }));

    await waitFor(() =>
      expect(apiMock.depositToPocket).toHaveBeenCalledWith({
        monthId: "month-1",
        sourceSubcategoryId: "sub-bonus",
        targetPocketId: "pocket-emergency",
        amount: 125,
        externalSourceLabel: undefined,
      }),
    );
  });

  it("offers only the loaded active pockets as deposit destinations", async () => {
    render(<ActiveMonthPage />);

    const pocketSelect = await screen.findByLabelText("Bolsillo destino");
    expect(pocketSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "Elegí un bolsillo activo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Emergencias ($250.00)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Viaje ($0.00)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /inactivo/i })).not.toBeInTheDocument();
  });

  it("renders backend-computed income totals and available money", async () => {
    render(<ActiveMonthPage />);

    expect(await screen.findByRole("region", { name: "Ingresos del mes" })).toHaveTextContent("$1000.00");
    expect(screen.getByRole("region", { name: "Disponible del mes" })).toHaveTextContent("$375.00");
    expect(screen.getByText("Sueldo")).toBeInTheDocument();
    expect(screen.getByText(/neto/)).toBeInTheDocument();
  });

  it("exposes negative monthly balances as semantic risk instead of color-only pills", async () => {
    apiMock.getActiveMonth.mockResolvedValueOnce({ ...activeMonth, availableMoney: -125, cashBalance: -15 });

    render(<ActiveMonthPage />);

    expect(await screen.findByRole("region", { name: "Disponible del mes" })).toHaveTextContent("$-125.00");
    expect(screen.getByRole("region", { name: "Efectivo físico" })).toHaveTextContent("$-15.00");
    expect(screen.getAllByText("Negative trend")).toHaveLength(2);
  });

  it("shows physical cash balance and month expense history", async () => {
    render(<ActiveMonthPage />);

    expect(await screen.findByRole("region", { name: "Efectivo físico" })).toHaveTextContent("$80.00");
    expect(apiMock.getExpenseHistory).toHaveBeenCalledWith("month-1");
    expect(await screen.findByText("Café")).toBeInTheDocument();
    expect(screen.getByText("Card: Visa Daily")).toBeInTheDocument();
    expect(screen.getByText("12/5/2026 · Bonus · Ingresos · Efectivo")).toBeInTheDocument();
    expect(screen.getByText("15/5/2026 · Bonus · Ingresos · No efectivo")).toBeInTheDocument();
  });

  it("offers active credit cards while keeping the default cash/no-card expense path", async () => {
    render(<ActiveMonthPage />);

    const cardSelect = await screen.findByLabelText("Tarjeta de crédito (opcional)");

    expect(apiMock.getCreditCards).toHaveBeenCalledWith("active");
    expect(cardSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "Sin tarjeta / efectivo" })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "Visa Daily" })).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: "Mastercard Travel" })).toHaveLength(2);
  });

  it("records a card-linked expense as non-cash", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    const expenseForm = (await screen.findByRole("button", { name: "Registrar gasto" })).closest("form");
    if (!expenseForm) throw new Error("Missing expense form.");

    await user.selectOptions(within(expenseForm).getByLabelText("Subcategoría del gasto"), "sub-bonus");
    await user.type(within(expenseForm).getByLabelText("Monto", { selector: "input" }), "35");
    fireEvent.change(within(expenseForm).getByLabelText("Fecha del gasto"), { target: { value: "2026-05-15" } });
    await user.selectOptions(within(expenseForm).getByLabelText("Tarjeta de crédito (opcional)"), "card-1");
    await user.type(within(expenseForm).getByLabelText("Descripción"), "Groceries");
    await user.click(within(expenseForm).getByRole("button", { name: "Registrar gasto" }));

    await waitFor(() =>
      expect(apiMock.recordExpense).toHaveBeenCalledWith({
        monthId: "month-1",
        sourceSubcategoryId: "sub-bonus",
        amount: 35,
        description: "Groceries",
        occurredAt: "2026-05-15",
        paymentMethod: "NON_CASH",
        creditCardId: "card-1",
      }),
    );
  });

  it("clears the selected credit card when recording a cash expense", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    const expenseForm = (await screen.findByRole("button", { name: "Registrar gasto" })).closest("form");
    if (!expenseForm) throw new Error("Missing expense form.");

    await user.selectOptions(within(expenseForm).getByLabelText("Subcategoría del gasto"), "sub-bonus");
    await user.type(within(expenseForm).getByLabelText("Monto", { selector: "input" }), "20");
    await user.selectOptions(within(expenseForm).getByLabelText("Tarjeta de crédito (opcional)"), "card-1");
    await user.selectOptions(within(expenseForm).getByLabelText("Método de pago"), "CASH");
    expect(within(expenseForm).getByLabelText("Tarjeta de crédito (opcional)")).toHaveValue("");
    await user.click(within(expenseForm).getByRole("button", { name: "Registrar gasto" }));

    await waitFor(() =>
      expect(apiMock.recordExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: "CASH",
          creditCardId: null,
        }),
      ),
    );
  });

  it("filters expense history by selected credit card", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    const historyFilter = await screen.findByLabelText("Filtrar historial por tarjeta");
    await user.selectOptions(historyFilter, "card-1");

    await waitFor(() => expect(apiMock.getExpenseHistory).toHaveBeenLastCalledWith("month-1", { creditCardId: "card-1" }));
  });

  it("keeps the active month usable when credit cards cannot be loaded", async () => {
    apiMock.getCreditCards.mockRejectedValueOnce(new Error("Credit cards unavailable."));

    render(<ActiveMonthPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las tarjetas activas. Podés registrar gastos sin tarjeta.");
    expect(screen.getByRole("button", { name: "Registrar gasto" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sin tarjeta / efectivo" })).toBeInTheDocument();
  });

  it("records an expense with date and payment method", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    const expenseForm = (await screen.findByRole("button", { name: "Registrar gasto" })).closest("form");
    if (!expenseForm) throw new Error("Missing expense form.");

    await user.selectOptions(within(expenseForm).getByLabelText("Subcategoría del gasto"), "sub-bonus");
    await user.type(within(expenseForm).getByLabelText("Monto", { selector: "input" }), "20");
    fireEvent.change(within(expenseForm).getByLabelText("Fecha del gasto"), { target: { value: "2026-05-12" } });
    await user.selectOptions(within(expenseForm).getByLabelText("Método de pago"), "CASH");
    await user.type(within(expenseForm).getByLabelText("Descripción"), "Café");
    await user.click(within(expenseForm).getByRole("button", { name: "Registrar gasto" }));

    await waitFor(() =>
      expect(apiMock.recordExpense).toHaveBeenCalledWith({
        monthId: "month-1",
        sourceSubcategoryId: "sub-bonus",
        amount: 20,
        description: "Café",
        occurredAt: "2026-05-12",
        paymentMethod: "CASH",
        creditCardId: null,
      }),
    );
  });

  it("keeps a successful expense mutation separate from a failed history refresh", async () => {
    const user = userEvent.setup();
    apiMock.getExpenseHistory.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("No se pudo consultar el historial."));

    render(<ActiveMonthPage />);

    const expenseForm = (await screen.findByRole("button", { name: "Registrar gasto" })).closest("form");
    if (!expenseForm) throw new Error("Missing expense form.");

    await user.selectOptions(within(expenseForm).getByLabelText("Subcategoría del gasto"), "sub-bonus");
    await user.type(within(expenseForm).getByLabelText("Monto", { selector: "input" }), "20");
    await user.click(within(expenseForm).getByRole("button", { name: "Registrar gasto" }));

    expect(await screen.findByText("Gasto registrado y saldos recalculados.")).toBeInTheDocument();
    expect(screen.queryByText("No se pudo registrar el gasto.")).not.toBeInTheDocument();
    expect(screen.queryByText("No se pudo consultar el historial.")).not.toBeInTheDocument();
  });

  it("edits and deletes registered expenses from the active month only", async () => {
    const user = userEvent.setup();
    apiMock.updateExpense.mockResolvedValueOnce({ ...activeMonth, availableMoney: 390 });
    apiMock.deleteExpense.mockResolvedValueOnce({ ...activeMonth, availableMoney: 410 });

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Editar gasto Café" }));
    const expenseForm = screen.getByRole("button", { name: "Actualizar gasto" }).closest("form");
    if (!expenseForm) throw new Error("Missing expense edit form.");

    await user.clear(within(expenseForm).getByLabelText("Monto", { selector: "input" }));
    await user.type(within(expenseForm).getByLabelText("Monto", { selector: "input" }), "30");
    await user.clear(within(expenseForm).getByLabelText("Descripción"));
    await user.type(within(expenseForm).getByLabelText("Descripción"), "Café corregido");
    await user.click(within(expenseForm).getByRole("button", { name: "Actualizar gasto" }));

    await waitFor(() =>
      expect(apiMock.updateExpense).toHaveBeenCalledWith({
        monthId: "month-1",
        expenseId: "expense-1",
        sourceSubcategoryId: "sub-bonus",
        amount: 30,
        description: "Café corregido",
        occurredAt: "2026-05-12",
        paymentMethod: "CASH",
        creditCardId: null,
      }),
    );
    expect(await screen.findByText("Gasto actualizado en el mes activo y saldos recalculados.")).toBeInTheDocument();
    expect(apiMock.getExpenseHistory).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Registrar gasto" })).toBeInTheDocument();
    expect(within(expenseForm).getByLabelText("Monto", { selector: "input" })).toHaveValue(null);

    await user.click(screen.getByRole("button", { name: "Eliminar gasto Café" }));
    await waitFor(() => expect(apiMock.deleteExpense).toHaveBeenCalledWith("month-1", "expense-1"));
    expect(await screen.findByText("Gasto eliminado del mes activo y saldos recalculados.")).toBeInTheDocument();
    expect(apiMock.getExpenseHistory).toHaveBeenCalledTimes(3);
  });

  it("does not submit expense corrections when the active month is closed", async () => {
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });

    render(<ActiveMonthPage />);

    const expenseForm = (await screen.findByRole("button", { name: "Registrar gasto" })).closest("form");
    if (!expenseForm) throw new Error("Missing expense form.");

    fireEvent.submit(expenseForm);

    expect(apiMock.recordExpense).not.toHaveBeenCalled();
    expect(apiMock.updateExpense).not.toHaveBeenCalled();
  });

  it("does not submit stale category or subcategory corrections after the active month becomes closed", async () => {
    const user = userEvent.setup();
    apiMock.createMonthlyIncome.mockResolvedValueOnce({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Editar categoría Ingresos" }));
    await user.click(screen.getByRole("button", { name: "Editar subcategoría Bonus" }));
    expect(screen.getByRole("form", { name: "Editar categoría del mes activo" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Editar subcategoría del mes activo" })).toBeInTheDocument();

    const incomeForm = screen.getByRole("button", { name: "Registrar ingreso" }).closest("form");
    if (!incomeForm) throw new Error("Missing income form.");
    fireEvent.submit(incomeForm);

    expect(await screen.findByText("El mes está cerrado: los ingresos son de solo lectura.")).toBeInTheDocument();

    fireEvent.submit(screen.getByRole("form", { name: "Editar categoría del mes activo" }));
    fireEvent.submit(screen.getByRole("form", { name: "Editar subcategoría del mes activo" }));

    expect(apiMock.updateMonthCategory).not.toHaveBeenCalled();
    expect(apiMock.updateMonthSubcategory).not.toHaveBeenCalled();
  });

  it("edits and deletes month snapshot categories and subcategories without implying template changes", async () => {
    const user = userEvent.setup();
    const afterCategoryUpdate: Month = {
      ...activeMonth,
      categories: activeMonth.categories.map((category) => (category.id === "cat-income" ? { ...category, name: "Ingresos activos" } : category)),
    };
    const afterSubcategoryUpdate: Month = {
      ...afterCategoryUpdate,
      categories: afterCategoryUpdate.categories.map((category) => ({
        ...category,
        subcategories: category.subcategories.map((subcategory) => (subcategory.id === "sub-bonus" ? { ...subcategory, name: "Bonus activo", plannedAmount: 450 } : subcategory)),
      })),
    };
    const afterSubcategoryDelete: Month = {
      ...afterSubcategoryUpdate,
      categories: afterSubcategoryUpdate.categories.map((category) => ({ ...category, subcategories: [] })),
    };
    const afterCategoryDelete: Month = {
      ...afterSubcategoryDelete,
      categories: [],
    };
    apiMock.updateMonthCategory.mockResolvedValueOnce(afterCategoryUpdate);
    apiMock.updateMonthSubcategory.mockResolvedValueOnce(afterSubcategoryUpdate);
    apiMock.deleteMonthSubcategory.mockResolvedValueOnce(afterSubcategoryDelete);
    apiMock.deleteMonthCategory.mockResolvedValueOnce(afterCategoryDelete);

    render(<ActiveMonthPage />);

    expect(await screen.findByText("Estos cambios corrigen solo el snapshot del mes activo; no modifican la plantilla global.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar categoría Ingresos" }));
    await user.clear(screen.getByLabelText("Nombre categoría"));
    await user.type(screen.getByLabelText("Nombre categoría"), "Ingresos activos");
    await user.click(screen.getByRole("button", { name: "Guardar categoría" }));

    await waitFor(() => expect(apiMock.updateMonthCategory).toHaveBeenCalledWith({ monthId: "month-1", categoryId: "cat-income", name: "Ingresos activos" }));
    expect(await screen.findByRole("button", { name: "Editar categoría Ingresos activos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar subcategoría Bonus" }));
    await user.clear(screen.getByLabelText("Nombre subcategoría"));
    await user.type(screen.getByLabelText("Nombre subcategoría"), "Bonus activo");
    await user.clear(screen.getByLabelText("Planificado", { selector: "input" }));
    await user.type(screen.getByLabelText("Planificado", { selector: "input" }), "450");
    await user.selectOptions(screen.getByLabelText("Bolsillo predeterminado"), "");
    await user.click(screen.getByRole("button", { name: "Guardar subcategoría" }));

    await waitFor(() =>
      expect(apiMock.updateMonthSubcategory).toHaveBeenCalledWith({
        monthId: "month-1",
        subcategoryId: "sub-bonus",
        name: "Bonus activo",
        plannedAmount: 450,
        defaultPocketId: null,
      }),
    );
    expect(await screen.findByRole("button", { name: "Editar categoría Ingresos activos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar subcategoría Bonus activo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar subcategoría Bonus activo" }));
    await waitFor(() => expect(apiMock.deleteMonthSubcategory).toHaveBeenCalledWith("month-1", "sub-bonus"));
    expect(screen.getByRole("button", { name: "Eliminar categoría Ingresos activos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar categoría Ingresos activos" }));
    await waitFor(() => expect(apiMock.deleteMonthCategory).toHaveBeenCalledWith("month-1", "cat-income"));
    expect(screen.queryByRole("button", { name: "Editar categoría Ingresos activos" })).not.toBeInTheDocument();
    expect(apiMock.getExpenseHistory).toHaveBeenCalledTimes(5);
  });

  it("creates a month-only category and refreshes the snapshot with explicit copy guidance", async () => {
    const user = userEvent.setup();
    const afterCreate: Month = {
      ...activeMonth,
      categories: [...activeMonth.categories, { id: "cat-gifts", name: "Regalos", sortOrder: 1, templateCategoryId: null, subcategories: [] }],
    };
    apiMock.createMonthCategory.mockResolvedValueOnce(afterCreate);

    render(<ActiveMonthPage />);

    expect(await screen.findByText(/Creá categorías y subcategorías solo en este mes/i)).toBeInTheDocument();
    expect(screen.getByText(/Copiar a plantilla también/i)).toBeInTheDocument();

    const categoryForm = screen.getByRole("form", { name: "Crear categoría del mes activo" });
    await user.type(within(categoryForm).getByLabelText("Nueva categoría"), "Regalos");
    await user.click(within(categoryForm).getByRole("button", { name: "Crear categoría" }));

    await waitFor(() =>
      expect(apiMock.createMonthCategory).toHaveBeenCalledWith({
        monthId: "month-1",
        name: "Regalos",
        addToTemplate: false,
      }),
    );
    expect(await screen.findByText("Categoría creada solo en el snapshot del mes activo; la plantilla global no cambió.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar categoría Regalos" })).toBeInTheDocument();
    expect(apiMock.getExpenseHistory).toHaveBeenCalledTimes(2);
  });

  it("creates a promoted subcategory under the selected parent with zero planned amount and optional pocket", async () => {
    const user = userEvent.setup();
    const afterCreate: Month = {
      ...activeMonth,
      categories: activeMonth.categories.map((category) =>
        category.id === "cat-income"
          ? {
              ...category,
              subcategories: [
                ...category.subcategories,
                {
                  id: "sub-refunds",
                  name: "Reintegros",
                  plannedAmount: 0,
                  available: 0,
                  defaultPocketId: "pocket-emergency",
                  templateSubcategoryId: "tpl-sub-refunds",
                  sortOrder: 1,
                },
              ],
            }
          : category,
      ),
    };
    apiMock.createMonthSubcategory.mockResolvedValueOnce(afterCreate);

    render(<ActiveMonthPage />);

    const subcategoryForm = await screen.findByRole("form", { name: "Crear subcategoría del mes activo" });
    await user.selectOptions(within(subcategoryForm).getByLabelText("Categoría padre"), "cat-income");
    await user.type(within(subcategoryForm).getByLabelText("Nueva subcategoría"), "Reintegros");
    await user.type(within(subcategoryForm).getByLabelText("Planificado inicial", { selector: "input" }), "0");
    await user.selectOptions(within(subcategoryForm).getByLabelText("Bolsillo predeterminado inicial"), "pocket-emergency");
    await user.click(within(subcategoryForm).getByLabelText("Copiar a plantilla también"));
    await user.click(within(subcategoryForm).getByRole("button", { name: "Crear subcategoría" }));

    await waitFor(() =>
      expect(apiMock.createMonthSubcategory).toHaveBeenCalledWith({
        monthId: "month-1",
        categoryId: "cat-income",
        name: "Reintegros",
        plannedAmount: 0,
        defaultPocketId: "pocket-emergency",
        addToTemplate: true,
      }),
    );
    expect(await screen.findByText("Subcategoría creada en este mes y copiada a la plantilla global para próximos meses.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar subcategoría Reintegros" })).toBeInTheDocument();
    expect(apiMock.getExpenseHistory).toHaveBeenCalledTimes(2);
  });

  it("hides active-month structure create actions when the active month is closed", async () => {
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });

    render(<ActiveMonthPage />);

    expect(await screen.findByText("El mes está cerrado: la estructura es de solo lectura y no se pueden crear categorías ni subcategorías.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Crear categoría del mes activo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Crear subcategoría del mes activo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear categoría" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear subcategoría" })).not.toBeInTheDocument();
  });

  it("resets correction edit state when cancelling or refreshing the active month", async () => {
    const user = userEvent.setup();
    apiMock.getActiveMonth.mockResolvedValueOnce(activeMonth).mockResolvedValueOnce({
      ...activeMonth,
      categories: activeMonth.categories.map((category) => ({
        ...category,
        name: "Ingresos refrescados",
      })),
    });

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Editar gasto Café" }));
    expect(screen.getByRole("button", { name: "Actualizar gasto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar edición de gasto" }));
    expect(screen.getByRole("button", { name: "Registrar gasto" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar categoría Ingresos" }));
    expect(screen.getByRole("form", { name: "Editar categoría del mes activo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar subcategoría Bonus" }));
    expect(screen.getByRole("form", { name: "Editar subcategoría del mes activo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refrescar" }));

    expect(await screen.findByRole("button", { name: "Editar categoría Ingresos refrescados" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Editar categoría del mes activo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Editar subcategoría del mes activo" })).not.toBeInTheDocument();
  });

  it("keeps server deletion guard failures visible without removing month snapshot items", async () => {
    const user = userEvent.setup();
    apiMock.deleteMonthSubcategory.mockRejectedValueOnce(new Error("No se puede eliminar la subcategoría porque tiene movimientos asociados."));

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Eliminar subcategoría Bonus" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se puede eliminar la subcategoría porque tiene movimientos asociados.");
    expect(screen.getByText("Bonus")).toBeInTheDocument();
  });

  it("keeps category deletion guard failures visible without removing the category", async () => {
    const user = userEvent.setup();
    apiMock.deleteMonthCategory.mockRejectedValueOnce(new Error("No se puede eliminar la categoría porque todavía tiene subcategorías o movimientos asociados."));

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Eliminar categoría Ingresos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se puede eliminar la categoría porque todavía tiene subcategorías o movimientos asociados.");
    expect(screen.getByRole("button", { name: "Editar categoría Ingresos" })).toBeInTheDocument();
  });

  it("withdraws cash from monthly available money", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    const withdrawalForm = (await screen.findByRole("button", { name: "Retirar efectivo" })).closest("form");
    if (!withdrawalForm) throw new Error("Missing withdrawal form.");

    await user.type(within(withdrawalForm).getByLabelText("Monto a retirar", { selector: "input" }), "50");
    fireEvent.change(within(withdrawalForm).getByLabelText("Fecha del retiro"), { target: { value: "2026-05-10" } });
    await user.type(within(withdrawalForm).getByLabelText("Descripción del retiro"), "ATM");
    await user.click(within(withdrawalForm).getByRole("button", { name: "Retirar efectivo" }));

    await waitFor(() =>
      expect(apiMock.withdrawCash).toHaveBeenCalledWith({
        monthId: "month-1",
        amount: 50,
        occurredAt: "2026-05-10",
        description: "ATM",
      }),
    );
  });

  it("creates, edits, and deletes monthly incomes through typed API calls", async () => {
    const user = userEvent.setup();
    const withFreelanceIncome: Month = {
      ...activeMonth,
      incomes: [
        ...activeMonth.incomes,
        {
          id: "income-2",
          monthId: "month-1",
          sourceName: "Freelance",
          amount: 250,
          receivedAt: "2026-05-08T00:00:00.000Z",
          notes: null,
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
        },
      ],
      monthlyIncomeTotal: 1250,
      availableMoney: 625,
    };
    const updatedIncomeMonth: Month = {
      ...withFreelanceIncome,
      incomes: withFreelanceIncome.incomes.map((income) => (income.id === "income-1" ? { ...income, sourceName: "Sueldo neto", amount: 1100, notes: "ajustado" } : income)),
      monthlyIncomeTotal: 1350,
      availableMoney: 725,
    };
    const deletedIncomeMonth: Month = {
      ...updatedIncomeMonth,
      incomes: updatedIncomeMonth.incomes.filter((income) => income.id !== "income-1"),
      monthlyIncomeTotal: 250,
      availableMoney: -125,
    };
    apiMock.createMonthlyIncome.mockResolvedValueOnce(withFreelanceIncome);
    apiMock.updateMonthlyIncome.mockResolvedValueOnce(updatedIncomeMonth);
    apiMock.deleteMonthlyIncome.mockResolvedValueOnce(deletedIncomeMonth);

    render(<ActiveMonthPage />);

    const incomeForm = (await screen.findByRole("button", { name: "Registrar ingreso" })).closest("form");
    if (!incomeForm) throw new Error("Missing income form.");

    await user.type(within(incomeForm).getByLabelText("Fuente del ingreso"), "Freelance");
    await user.type(within(incomeForm).getByLabelText("Monto", { selector: "input" }), "250");
    fireEvent.change(within(incomeForm).getByLabelText("Fecha"), { target: { value: "2026-05-08" } });
    await user.click(within(incomeForm).getByRole("button", { name: "Registrar ingreso" }));

    await waitFor(() =>
      expect(apiMock.createMonthlyIncome).toHaveBeenCalledWith({
        monthId: "month-1",
        sourceName: "Freelance",
        amount: 250,
        receivedAt: "2026-05-08",
        notes: null,
      }),
    );

    await user.click(screen.getAllByRole("button", { name: "Editar ingreso" })[0]);
    const editForm = screen.getByRole("button", { name: "Actualizar ingreso" }).closest("form");
    if (!editForm) throw new Error("Missing edit income form.");
    await user.clear(within(editForm).getByLabelText("Fuente del ingreso"));
    await user.type(within(editForm).getByLabelText("Fuente del ingreso"), "Sueldo neto");
    await user.clear(within(editForm).getByLabelText("Monto", { selector: "input" }));
    await user.type(within(editForm).getByLabelText("Monto", { selector: "input" }), "1100");
    await user.clear(within(editForm).getByLabelText("Notas"));
    await user.type(within(editForm).getByLabelText("Notas"), "ajustado");
    await user.click(within(editForm).getByRole("button", { name: "Actualizar ingreso" }));

    await waitFor(() =>
      expect(apiMock.updateMonthlyIncome).toHaveBeenCalledWith({
        monthId: "month-1",
        incomeId: "income-1",
        sourceName: "Sueldo neto",
        amount: 1100,
        receivedAt: "2026-05-05",
        notes: "ajustado",
      }),
    );

    await user.click(screen.getAllByRole("button", { name: "Eliminar ingreso" })[0]);
    await waitFor(() => expect(apiMock.deleteMonthlyIncome).toHaveBeenCalledWith("month-1", "income-1"));
  });

  it("does not show income mutation controls for closed months", async () => {
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });

    render(<ActiveMonthPage />);

    expect(await screen.findByText(/ingresos son de solo lectura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar ingreso" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar ingreso" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar ingreso" })).not.toBeInTheDocument();
  });
});
