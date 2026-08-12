import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveMonthPage, formatCop } from "./ActiveMonthPage";
import type { CreditCardView, ExpenseHistoryItem, Month, SavingsPocket } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  getBasicReport: vi.fn(),
  getClosureReview: vi.fn(),
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

const ledgerEntry = (entryKey: string, eventType: string, description: string | null, occurredAt = "2026-05-12T12:00:00.000Z") => ({
  entryKey,
  occurredAt,
  eventType,
  direction: eventType === "MONTHLY_INCOME" ? "INFLOW" : "OUTFLOW",
  source: { kind: "MONTH", id: "month-1" },
  destination: { kind: eventType.includes("EXPENSE") ? "EXPENSE" : "MONTH", id: entryKey },
  amount: 20,
  balanceEffects: { availableMoney: -20, cashBalance: 0, subcategoryAvailable: -20, pocketBalance: 0 },
  metadata: { description, paymentMethod: "CASH", isSystemEvent: false },
});

const ledgerResponse = (...entries: ReturnType<typeof ledgerEntry>[]) => ({ monthId: "month-1", status: "ACTIVE", entries });

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

async function openMonthStructure() {
  const disclosure = (await screen.findByRole("region", { name: "Estructura del mes" })).querySelector("details");
  if (!disclosure) throw new Error("Missing month structure disclosure.");
  disclosure.open = true;
  fireEvent(disclosure, new Event("toggle", { bubbles: true }));
  return disclosure;
}

describe("ActiveMonthPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getActiveMonth.mockResolvedValue(activeMonth);
    apiMock.getBasicReport.mockResolvedValue({});
    apiMock.getClosureReview.mockResolvedValue({});
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ledgerResponse(
        ledgerEntry("expense-1", "CASH_EXPENSE", "Café"),
        ledgerEntry("expense-2", "NON_CASH_EXPENSE", "Gasto sin descripción"),
        ledgerEntry("income-1", "MONTHLY_INCOME", "Sueldo"),
      ),
    }));
  });

  it("keeps the literal dollar sign and fractional values in Colombian COP output", () => {
    expect(formatCop(0.49)).toBe("$0,49 COP");
    expect(formatCop(-1_234.5)).toBe("$-1.234,5 COP");
  });

  it("keeps financial truth and expense capture before warnings and maintenance", async () => {
    render(<ActiveMonthPage />);

    const financial = await screen.findByRole("region", { name: "Resumen financiero" });
    const expenseCapture = screen.getByRole("region", { name: "Registrar gasto" });
    const quickActions = screen.getByRole("region", { name: "Acciones rápidas" });
    const activity = screen.getByRole("region", { name: "Actividad y contexto" });

    expect(within(financial).getByText("$375 COP")).toBeInTheDocument();
    expect(financial.compareDocumentPosition(expenseCapture) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(quickActions.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(activity).getByRole("heading", { name: "Movimientos del mes" })).toBeInTheDocument();
  });

  it("renders only the canonical ledger in backend order, including unknown rows as read-only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ledgerResponse(
        ledgerEntry("expense-1", "CASH_EXPENSE", "Primero"),
        ledgerEntry("unknown-1", "ALIEN_EVENT", "Después"),
        ledgerEntry("missing-expense", "CASH_EXPENSE", "Sin resolver"),
        ledgerEntry("income-1", "MONTHLY_INCOME", "Último"),
      ),
    }));
    render(<ActiveMonthPage />);

    await screen.findByText("Primero");
    const ledger = screen.getByRole("region", { name: "Movimientos del mes" });
    expect(ledger).toHaveTextContent("Primero");
    expect(ledger).toHaveTextContent("Después");
    expect(ledger).toHaveTextContent("Último");
    expect(ledger.textContent!.indexOf("Primero")).toBeLessThan(ledger.textContent!.indexOf("Después"));
    expect(ledger.textContent!.indexOf("Después")).toBeLessThan(ledger.textContent!.indexOf("Último"));
    expect(screen.queryByRole("region", { name: "Gastos e ingresos" })).not.toBeInTheDocument();
    expect(within(ledger).getByText("Este tipo de movimiento no se reconoce y no se puede editar ni eliminar desde este historial.")).toBeInTheDocument();
    expect(within(ledger).getByText("El registro original ya no está disponible para editar ni eliminar desde este historial.")).toBeInTheDocument();
  });

  it("keeps a successful expense mutation successful when canonical ledger refresh fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ledgerResponse(ledgerEntry("expense-1", "CASH_EXPENSE", "Café")) })
      .mockRejectedValueOnce(new Error("Ledger unavailable.")));
    render(<ActiveMonthPage />);

    const expenseForm = (await screen.findByRole("button", { name: "Registrar gasto" })).closest("form");
    if (!expenseForm) throw new Error("Missing expense form.");
    await user.selectOptions(within(expenseForm).getByLabelText("Subcategoría del gasto"), "sub-bonus");
    await user.type(within(expenseForm).getByLabelText("Monto", { selector: "input" }), "20");
    await user.click(within(expenseForm).getByRole("button", { name: "Registrar gasto" }));

    expect(await screen.findByText("Gasto registrado y saldos recalculados.")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar los movimientos del mes.");
    expect(screen.queryByText("No se pudo registrar el gasto.")).not.toBeInTheDocument();
  });

  it("keeps Estructura del mes closed by default and exposes the month-only versus template-promotion guidance when expanded", async () => {
    render(<ActiveMonthPage />);

    await screen.findByRole("region", { name: "Resumen financiero" });
    const disclosure = screen.getByRole("region", { name: "Estructura del mes" }).querySelector("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");
    expect(screen.getByText("Corrige categorías y subcategorías de este mes sin perder de vista la plantilla global.")).toBeInTheDocument();

    await openMonthStructure();
    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText("Estos cambios corrigen solo la estructura de este mes; no modifican la plantilla global.")).toBeInTheDocument();
    expect(screen.getByText(/Antes de promoverlas, marca la copia a plantilla/i)).toBeInTheDocument();
  });

  it("opens the structure disclosure when an edit is initiated or a structural mutation fails", async () => {
    const user = userEvent.setup();
    apiMock.deleteMonthCategory.mockRejectedValueOnce(new Error("La categoría tiene movimientos asociados."));
    render(<ActiveMonthPage />);

    await screen.findByRole("region", { name: "Resumen financiero" });
    const disclosure = screen.getByRole("region", { name: "Estructura del mes" }).querySelector("details");
    if (!disclosure) throw new Error("Missing month structure disclosure.");

    await user.click(screen.getByRole("button", { name: "Editar categoría Ingresos", hidden: true }));
    expect(disclosure).toHaveAttribute("open");

    disclosure.open = false;
    fireEvent(disclosure, new Event("toggle", { bubbles: true }));
    await user.click(screen.getByRole("button", { name: "Eliminar categoría Ingresos", hidden: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La categoría tiene movimientos asociados.");
    expect(disclosure).toHaveAttribute("open");
  });

  it("uses shared registration-slip anatomy with local feedback and focused edit handoff", async () => {
    const user = userEvent.setup();
    apiMock.recordExpense.mockRejectedValueOnce(new Error("El monto supera el disponible."));

    render(<ActiveMonthPage />);

    const expenseSlip = await screen.findByRole("region", { name: "Registrar gasto" });
    expect(expenseSlip).toHaveClass("registration-slip-primary", "registration-slip-create");
    const amount = within(expenseSlip).getByLabelText("Monto", { selector: "input" });
    const subcategory = within(expenseSlip).getByLabelText("Subcategoría del gasto");
    const primaryFields = expenseSlip.querySelector(".registration-slip-primary-fields");
    const supportingFields = expenseSlip.querySelector(".registration-slip-supporting-fields");
    expect(amount.compareDocumentPosition(subcategory) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primaryFields).not.toBeNull();
    expect(supportingFields).not.toBeNull();
    expect(primaryFields!.compareDocumentPosition(supportingFields!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.selectOptions(subcategory, "sub-bonus");
    await user.type(amount, "700");
    await user.click(within(expenseSlip).getByRole("button", { name: "Registrar gasto" }));
    expect(await within(expenseSlip).findByRole("alert")).toHaveTextContent("El monto supera el disponible.");

    await user.click(screen.getByRole("button", { name: "Editar gasto Café" }));
    expect(within(screen.getByRole("region", { name: "Editar gasto" })).getByLabelText("Monto", { selector: "input" })).toHaveFocus();
  });

  it("opens the income slip from its secondary action and focuses its first field on edit", async () => {
    const user = userEvent.setup();
    render(<ActiveMonthPage />);

    const ledger = await screen.findByRole("region", { name: "Movimientos del mes" });
    await within(ledger).findByText("Sueldo");
    await user.click(within(ledger).getByRole("button", { name: "Editar ingreso Sueldo" }));
    expect(screen.getByRole("region", { name: "Editar ingreso" })).toHaveClass("registration-slip-edit");
    expect(screen.getByLabelText("Fuente del ingreso")).toHaveFocus();
  });

  it("keeps income capture disclosed on demand and closes and resets it on cancellation", async () => {
    const user = userEvent.setup();
    render(<ActiveMonthPage />);

    expect(await screen.findByRole("button", { name: "Registrar ingreso" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Registrar ingreso" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Registrar ingreso" }));
    const incomeSlip = screen.getByRole("region", { name: "Registrar ingreso" });
    await user.type(within(incomeSlip).getByLabelText("Fuente del ingreso"), "Freelance");
    await user.click(within(incomeSlip).getByRole("button", { name: "Cancelar ingreso" }));

    expect(screen.queryByRole("region", { name: "Registrar ingreso" })).not.toBeInTheDocument();
  });

  it("resets an income edit when another secondary panel is opened, so Registrar ingreso creates a new record", async () => {
    const user = userEvent.setup();
    render(<ActiveMonthPage />);

    const ledger = await screen.findByRole("region", { name: "Movimientos del mes" });
    await user.click(within(ledger).getByRole("button", { name: "Editar ingreso Sueldo" }));
    expect(screen.getByRole("region", { name: "Editar ingreso" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retirar efectivo" }));
    expect(screen.queryByRole("region", { name: "Editar ingreso" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Registrar ingreso" }));
    const incomeForm = screen.getByRole("region", { name: "Registrar ingreso" }).querySelector("form");
    if (!incomeForm) throw new Error("Missing income form.");
    await user.type(within(incomeForm).getByLabelText("Fuente del ingreso"), "Freelance");
    await user.type(within(incomeForm).getByLabelText("Monto", { selector: "input" }), "250");
    await user.click(within(incomeForm).getByRole("button", { name: "Registrar ingreso" }));

    await waitFor(() => expect(apiMock.createMonthlyIncome).toHaveBeenCalledWith(expect.objectContaining({ monthId: "month-1", sourceName: "Freelance", amount: 250 })));
    expect(apiMock.updateMonthlyIncome).not.toHaveBeenCalled();
  });

  it("opens income editing from the canonical ledger", async () => {
    const user = userEvent.setup();
    render(<ActiveMonthPage />);

    const ledger = await screen.findByRole("region", { name: "Movimientos del mes" });
    await within(ledger).findByText("Café");
    await user.click(within(ledger).getByRole("button", { name: "Editar ingreso Sueldo" }));
    expect(screen.getByRole("region", { name: "Editar ingreso" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fuente del ingreso")).toHaveFocus();
  });

  it("does not leave pocket deposit mutations enabled for a closed month", async () => {
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });
    render(<ActiveMonthPage />);

    const depositAction = await screen.findByRole("button", { name: "Depositar en bolsillo" });
    expect(depositAction).toBeDisabled();
  });

  it("keeps the loading and unopened states distinct", async () => {
    let resolveMonth: (month: Month | null) => void;
    apiMock.getActiveMonth.mockReturnValueOnce(
      new Promise<Month | null>((resolve) => {
        resolveMonth = resolve;
      }),
    );

    render(<ActiveMonthPage />);

    expect(screen.getByText("Cargando mes activo...")).toBeInTheDocument();

    resolveMonth!(null);

    expect(await screen.findByText("Todavía no hay un mes activo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir mes" })).toBeInTheDocument();
  });

  it("preserves an open-month command failure and retries that command without refreshing authority", async () => {
    const user = userEvent.setup();
    apiMock.getActiveMonth.mockResolvedValue(null);
    apiMock.openMonth.mockRejectedValue(new Error("El mes 2026-05 ya existe."));

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Abrir mes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El mes 2026-05 ya existe.");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(apiMock.openMonth).toHaveBeenCalledTimes(2);
    expect(apiMock.getActiveMonth).toHaveBeenCalledTimes(1);
  });

  it("funds a pocket from a subcategory with the strict active-month payload", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    expect(await screen.findAllByRole("option", { name: "Bonus ($500 COP)" })).toHaveLength(1);
    expect(screen.queryByLabelText("ID bolsillo destino")).not.toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenCalledWith("active");

    await user.click(screen.getByRole("button", { name: "Depositar en bolsillo" }));
    const depositForm = screen.getByRole("region", { name: "Depositar en bolsillo" }).querySelector("form");
    if (!depositForm) throw new Error("Missing deposit form.");

    await user.selectOptions(within(depositForm).getByLabelText("Origen de los fondos"), "SUBCATEGORY");
    await user.selectOptions(within(depositForm).getByLabelText("Subcategoría de origen"), "sub-bonus");
    await user.selectOptions(within(depositForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(within(depositForm).getByLabelText("Monto", { selector: "input" }), "125");
    fireEvent.change(within(depositForm).getByLabelText("Fecha del depósito"), { target: { value: "2026-05-12" } });
    await user.click(within(depositForm).getByRole("button", { name: "Depositar en bolsillo" }));

    await waitFor(() =>
      expect(apiMock.depositToPocket).toHaveBeenCalledWith({
        sourceKind: "SUBCATEGORY",
        monthId: "month-1",
        sourceSubcategoryId: "sub-bonus",
        targetPocketId: "pocket-emergency",
        amount: 125,
        occurredAt: "2026-05-12",
      }),
    );
  });

  it("offers monthly available funds without exposing an external funding path", async () => {
    const user = userEvent.setup();
    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Depositar en bolsillo" }));
    const depositForm = screen.getByRole("region", { name: "Depositar en bolsillo" }).querySelector("form");
    if (!depositForm) throw new Error("Missing deposit form.");

    await user.selectOptions(within(depositForm).getByLabelText("Origen de los fondos"), "MONTH_AVAILABLE");
    await user.selectOptions(within(depositForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(within(depositForm).getByLabelText("Monto", { selector: "input" }), "75");
    fireEvent.change(within(depositForm).getByLabelText("Fecha del depósito"), { target: { value: "2026-05-13" } });
    await user.click(within(depositForm).getByRole("button", { name: "Depositar en bolsillo" }));

    await waitFor(() => expect(apiMock.depositToPocket).toHaveBeenCalledWith({
      sourceKind: "MONTH_AVAILABLE",
      monthId: "month-1",
      targetPocketId: "pocket-emergency",
      amount: 75,
      occurredAt: "2026-05-13",
    }));
    expect(within(depositForm).queryByLabelText(/externo/i)).not.toBeInTheDocument();
    expect(within(depositForm).queryByLabelText("Subcategoría de origen")).not.toBeInTheDocument();
  });

  it("refreshes the visible destination pocket balance from the server after a successful deposit", async () => {
    const user = userEvent.setup();
    apiMock.getPockets.mockResolvedValueOnce(activePockets).mockResolvedValueOnce([
      { ...activePockets[0], balance: 375 },
      activePockets[1],
    ]);
    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Depositar en bolsillo" }));
    const depositForm = screen.getByRole("region", { name: "Depositar en bolsillo" }).querySelector("form");
    if (!depositForm) throw new Error("Missing deposit form.");

    await user.selectOptions(within(depositForm).getByLabelText("Origen de los fondos"), "MONTH_AVAILABLE");
    await user.selectOptions(within(depositForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(within(depositForm).getByLabelText("Monto", { selector: "input" }), "125");
    await user.click(within(depositForm).getByRole("button", { name: "Depositar en bolsillo" }));

    expect(await within(depositForm).findByRole("option", { name: "Emergencias ($375 COP)" })).toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenCalledTimes(2);
  });

  it("keeps the successful deposit visible when its pocket refresh fails", async () => {
    const user = userEvent.setup();
    apiMock.getPockets.mockResolvedValueOnce(activePockets).mockRejectedValueOnce(new Error("Pocket service unavailable."));
    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Depositar en bolsillo" }));
    const depositForm = screen.getByRole("region", { name: "Depositar en bolsillo" }).querySelector("form");
    if (!depositForm) throw new Error("Missing deposit form.");

    await user.selectOptions(within(depositForm).getByLabelText("Origen de los fondos"), "MONTH_AVAILABLE");
    await user.selectOptions(within(depositForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(within(depositForm).getByLabelText("Monto", { selector: "input" }), "125");
    await user.click(within(depositForm).getByRole("button", { name: "Depositar en bolsillo" }));

    expect(await screen.findByText("Depósito a bolsillo registrado.")).toBeInTheDocument();
    expect(screen.queryByText("No se pudo registrar el depósito.")).not.toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar los bolsillos activos.")).toHaveAttribute("role", "alert");
    expect(apiMock.getPockets).toHaveBeenCalledTimes(2);
  });

  it("keeps deposits safely disabled while active pockets are loading or unavailable", async () => {
    const user = userEvent.setup();
    let resolvePockets!: (pockets: SavingsPocket[]) => void;
    apiMock.getPockets.mockReturnValueOnce(new Promise<SavingsPocket[]>((resolve) => { resolvePockets = resolve; }));
    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Depositar en bolsillo" }));
    expect(screen.getByText("Cargando bolsillos activos.")).toHaveAttribute("role", "status");
    expect(screen.getByLabelText("Bolsillo destino")).toBeDisabled();
    expect(within(screen.getByRole("region", { name: "Depositar en bolsillo" })).getByRole("button", { name: "Depositar en bolsillo" })).toBeDisabled();

    resolvePockets(activePockets);
    expect(await screen.findByRole("option", { name: "Emergencias ($250 COP)" })).toBeInTheDocument();
  });

  it("retries a transient active-pocket load failure and restores deposit controls", async () => {
    const user = userEvent.setup();
    apiMock.getPockets.mockRejectedValueOnce(new Error("Pocket service unavailable.")).mockResolvedValueOnce(activePockets);
    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Depositar en bolsillo" }));
    expect(await screen.findByText("No se pudieron cargar los bolsillos activos.")).toHaveAttribute("role", "alert");
    const depositRegion = screen.getByRole("region", { name: "Depositar en bolsillo" });
    expect(within(depositRegion).getByRole("button", { name: "Depositar en bolsillo" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Reintentar bolsillos activos" }));

    await waitFor(() => expect(apiMock.getPockets).toHaveBeenCalledTimes(2));
    expect(await within(depositRegion).findByRole("option", { name: "Emergencias ($250 COP)" })).toBeInTheDocument();
    expect(within(depositRegion).getByLabelText("Bolsillo destino")).toBeEnabled();
    expect(within(depositRegion).getByRole("button", { name: "Depositar en bolsillo" })).toBeEnabled();
  });

  it("offers only the loaded active pockets as deposit destinations", async () => {
    const user = userEvent.setup();
    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Depositar en bolsillo" }));
    const pocketSelect = await screen.findByLabelText("Bolsillo destino");
    expect(pocketSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "Selecciona un bolsillo activo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Emergencias ($250 COP)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Viaje ($0 COP)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /inactivo/i })).not.toBeInTheDocument();
  });

  it("renders a dominant financial surface from existing month values", async () => {
    render(<ActiveMonthPage />);

    const financialSurface = await screen.findByRole("region", { name: "Resumen financiero del mes" });
    expect(financialSurface).toHaveTextContent("Disponible del mes");
    expect(financialSurface).toHaveTextContent("$375 COP");
    expect(financialSurface).toHaveTextContent("Ingresos");
    expect(financialSurface).toHaveTextContent("Gastado");
    expect(financialSurface).toHaveTextContent("Efectivo disponible");
    expect(financialSurface).toHaveTextContent("Presupuesto utilizado");
    expect(within(financialSurface).getByRole("progressbar", { name: "Presupuesto utilizado" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("button", { name: "Registrar gasto" })).toBeInTheDocument();
    expect(screen.getByText("Sueldo")).toBeInTheDocument();
  });

  it("derives budget utilization separately while displaying only actual expense history, excluding a pocket deposit reflected in availability", async () => {
    apiMock.getActiveMonth.mockResolvedValueOnce({
      ...activeMonth,
      categories: [{ ...activeMonth.categories[0], subcategories: [{ ...activeMonth.categories[0].subcategories[0], available: 250 }] }],
    });

    render(<ActiveMonthPage />);

    await screen.findByText("Café");
    const financialSurface = await screen.findByRole("region", { name: "Resumen financiero del mes" });
    expect(financialSurface).toHaveTextContent("Gastado$55 COP");
    expect(financialSurface).toHaveTextContent("50%");
    expect(within(financialSurface).getByRole("progressbar", { name: "Presupuesto utilizado" })).toHaveAttribute("aria-valuenow", "50");
  });

  it("exposes negative monthly balances as semantic risk instead of color-only pills", async () => {
    apiMock.getActiveMonth.mockResolvedValueOnce({ ...activeMonth, availableMoney: -125, cashBalance: -15 });

    render(<ActiveMonthPage />);

    expect(await screen.findByRole("region", { name: "Disponible del mes" })).toHaveTextContent("$-125 COP");
    expect(screen.getByRole("region", { name: "Efectivo físico" })).toHaveTextContent("$-15 COP");
    expect(screen.getAllByText("Tendencia negativa")).toHaveLength(2);
  });

  it("shows physical cash balance and month expense history", async () => {
    render(<ActiveMonthPage />);

    expect(await screen.findByRole("region", { name: "Efectivo físico" })).toHaveTextContent("$80 COP");
    expect(apiMock.getExpenseHistory).toHaveBeenCalledWith("month-1");
    expect(await screen.findByText("Café")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Movimientos del mes" })).toHaveTextContent("Café");
  });

  it("offers active credit cards while keeping the default cash/no-card expense path", async () => {
    render(<ActiveMonthPage />);

    const cardSelect = await screen.findByLabelText("Tarjeta de crédito (opcional)");

    expect(apiMock.getCreditCards).toHaveBeenCalledWith("active");
    expect(cardSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "Sin tarjeta / efectivo" })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "Visa Daily" })).toHaveLength(1);
    expect(screen.getAllByRole("option", { name: "Mastercard Travel" })).toHaveLength(1);
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
    await user.type(within(expenseForm).getByLabelText(/Descripción/), "Groceries");
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


  it("keeps the refreshed canonical ledger when a prior-month response arrives late", async () => {
    const user = userEvent.setup();
    const nextMonth = { ...activeMonth, id: "month-2", month: 6 };
    let resolvePreviousLedger!: (value: Response) => void;
    let resolveCurrentLedger!: (value: Response) => void;
    apiMock.getActiveMonth.mockResolvedValueOnce(activeMonth).mockResolvedValueOnce(nextMonth);
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePreviousLedger = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveCurrentLedger = resolve; })));

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Refrescar" }));
    resolveCurrentLedger({ ok: true, json: async () => ({ monthId: "month-2", status: "ACTIVE", entries: [ledgerEntry("income-2", "MONTHLY_INCOME", "Mes actual")] }) } as Response);
    expect(await screen.findByText("Mes actual")).toBeInTheDocument();
    resolvePreviousLedger({ ok: true, json: async () => ledgerResponse(ledgerEntry("expense-1", "CASH_EXPENSE", "Mes anterior")) } as Response);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Mes anterior")).not.toBeInTheDocument();
    expect(screen.getByText("Mes actual")).toBeInTheDocument();
  });

  it("keeps the active month usable when credit cards cannot be loaded", async () => {
    apiMock.getCreditCards.mockRejectedValueOnce(new Error("Credit cards unavailable."));

    render(<ActiveMonthPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las tarjetas activas. Puedes registrar gastos sin tarjeta.");
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
    await user.type(within(expenseForm).getByLabelText(/Descripción/), "Café");
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

  it("keeps the expense action correctly labeled while an income is saving", async () => {
    const user = userEvent.setup();
    let resolveIncome!: (month: Month) => void;
    apiMock.createMonthlyIncome.mockImplementationOnce(
      () =>
        new Promise<Month>((resolve) => {
          resolveIncome = resolve;
        }),
    );

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Registrar ingreso" }));
    const incomeForm = screen.getByRole("region", { name: "Registrar ingreso" }).querySelector("form");
    if (!incomeForm) throw new Error("Missing income form.");
    await user.type(within(incomeForm).getByLabelText("Fuente del ingreso"), "Freelance");
    await user.type(within(incomeForm).getByLabelText("Monto", { selector: "input" }), "250");
    await user.click(within(incomeForm).getByRole("button", { name: "Registrar ingreso" }));

    const expenseButton = await screen.findByRole("button", { name: "Registrar gasto" });
    expect(expenseButton).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardando gasto..." })).not.toBeInTheDocument();

    resolveIncome(activeMonth);
    expect(await screen.findByText("Ingreso registrado y totales recalculados.")).toBeInTheDocument();
  });

  it("keeps the expense action correctly labeled while a pocket deposit is saving", async () => {
    const user = userEvent.setup();
    let resolveDeposit!: (month: Month) => void;
    apiMock.depositToPocket.mockImplementationOnce(
      () =>
        new Promise<Month>((resolve) => {
          resolveDeposit = resolve;
        }),
    );

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Depositar en bolsillo" }));
    const depositForm = screen.getByRole("region", { name: "Depositar en bolsillo" }).querySelector("form");
    if (!depositForm) throw new Error("Missing deposit form.");
    await user.selectOptions(within(depositForm).getByLabelText("Origen de los fondos"), "MONTH_AVAILABLE");
    await user.selectOptions(within(depositForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.type(within(depositForm).getByLabelText("Monto", { selector: "input" }), "125");
    await user.click(within(depositForm).getByRole("button", { name: "Depositar en bolsillo" }));

    const expenseButton = await screen.findByRole("button", { name: "Registrar gasto" });
    expect(expenseButton).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardando gasto..." })).not.toBeInTheDocument();

    resolveDeposit(activeMonth);
    expect(await screen.findByText("Depósito a bolsillo registrado.")).toBeInTheDocument();
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
    await user.clear(within(expenseForm).getByLabelText(/Descripción/));
    await user.type(within(expenseForm).getByLabelText(/Descripción/), "Café corregido");
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

  it("keeps a refreshed canonical expense visible but read-only after its expense-history refresh fails", async () => {
    const user = userEvent.setup();
    apiMock.updateExpense.mockResolvedValueOnce({ ...activeMonth, availableMoney: 390 });
    apiMock.getExpenseHistory.mockResolvedValueOnce([{ id: "expense-1", occurredAt: "2026-05-12T00:00:00.000Z", paymentMethod: "CASH", amount: 20, description: "Café", creditCardId: null, category: { id: "cat-income", name: "Ingresos" }, subcategory: { id: "sub-bonus", name: "Bonus" } }]).mockRejectedValueOnce(new Error("History unavailable."));
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ledgerResponse(ledgerEntry("expense-1", "CASH_EXPENSE", "Café")) })
      .mockResolvedValueOnce({ ok: true, json: async () => ledgerResponse(ledgerEntry("expense-1", "CASH_EXPENSE", "Café corregido")) }));

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Editar gasto Café" })); const expenseForm = screen.getByRole("button", { name: "Actualizar gasto" }).closest("form");
    if (!expenseForm) throw new Error("Missing expense edit form.");
    await user.clear(within(expenseForm).getByLabelText("Monto", { selector: "input" })); await user.type(within(expenseForm).getByLabelText("Monto", { selector: "input" }), "30"); await user.click(within(expenseForm).getByRole("button", { name: "Actualizar gasto" }));

    const ledger = await screen.findByRole("region", { name: "Movimientos del mes" });
    expect(await within(ledger).findByText("Café corregido")).toBeInTheDocument();
    expect(within(ledger).queryByRole("button", { name: /Editar gasto/ })).not.toBeInTheDocument();
    expect(within(ledger).getByText("No se puede editar ni eliminar este gasto hasta que se actualice el historial de gastos del mes.")).toBeInTheDocument();
    expect(apiMock.updateExpense).toHaveBeenCalledTimes(1);
  });

  it("uses locally resolved income source names for action identity when ledger descriptions are notes or absent", async () => {
    const user = userEvent.setup();
    const incomes = [{ ...activeMonth.incomes[0], id: "income-noted", sourceName: "Nómina ACME", notes: "Pago de mayo" }, { ...activeMonth.incomes[0], id: "income-freelance", sourceName: "Diseño freelance", notes: null }, { ...activeMonth.incomes[0], id: "income-rent", sourceName: "Arriendo", notes: null }];
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, incomes });
    apiMock.updateMonthlyIncome.mockResolvedValueOnce({ ...activeMonth, incomes });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ledgerResponse(
        ledgerEntry("income-noted", "MONTHLY_INCOME", "Pago de mayo"),
        ledgerEntry("income-freelance", "MONTHLY_INCOME", null),
        ledgerEntry("income-rent", "MONTHLY_INCOME", null),
      ),
    }));

    render(<ActiveMonthPage />);

    const ledger = await screen.findByRole("region", { name: "Movimientos del mes" });
    const notedIncome = ledger.querySelector('[data-entry-key="income-noted"]');
    expect(notedIncome).not.toBeNull();
    expect(within(notedIncome as HTMLElement).getByText("Fuente: Nómina ACME")).toBeInTheDocument();
    expect(within(notedIncome as HTMLElement).getByText("Pago de mayo")).toBeInTheDocument();
    for (const sourceName of ["Nómina ACME", "Diseño freelance", "Arriendo"]) expect(within(ledger).getByRole("button", { name: `Editar ingreso ${sourceName}` })).toBeInTheDocument();
    await user.click(within(ledger).getByRole("button", { name: "Editar ingreso Diseño freelance" })); const incomeForm = screen.getByRole("button", { name: "Actualizar ingreso" }).closest("form");
    if (!incomeForm) throw new Error("Missing income edit form.");
    await user.clear(within(incomeForm).getByLabelText("Fuente del ingreso")); await user.type(within(incomeForm).getByLabelText("Fuente del ingreso"), "Diseño freelance actualizado"); await user.click(within(incomeForm).getByRole("button", { name: "Actualizar ingreso" }));

    await waitFor(() => expect(apiMock.updateMonthlyIncome).toHaveBeenCalledWith(expect.objectContaining({ incomeId: "income-freelance", sourceName: "Diseño freelance actualizado" })));
    expect(apiMock.updateMonthlyIncome).not.toHaveBeenCalledWith(expect.objectContaining({ incomeId: "income-rent" }));
  });

  it("keeps closed no-note incomes distinguishable by their visible source identity without edit or delete controls", async () => {
    const incomes = ["Nómina ACME", "Diseño freelance"].map((sourceName, index) => ({ ...activeMonth.incomes[0], id: `income-${index}`, sourceName, notes: null }));
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z", incomes }); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ledgerResponse(...incomes.map((income) => ledgerEntry(income.id, "MONTHLY_INCOME", null))) }));
    render(<ActiveMonthPage />);
    const ledger = await screen.findByRole("region", { name: "Movimientos del mes" });
    for (const income of incomes) expect(within(ledger.querySelector(`[data-entry-key="${income.id}"]`) as HTMLElement).getByText(`Fuente: ${income.sourceName}`)).toBeInTheDocument();
    expect(within(ledger).queryByRole("button", { name: /Editar|Eliminar/ })).not.toBeInTheDocument();
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

    await openMonthStructure();
    await user.click(await screen.findByRole("button", { name: "Editar categoría Ingresos" }));
    await user.click(screen.getByRole("button", { name: "Editar subcategoría Bonus" }));
    expect(screen.getByRole("form", { name: "Editar categoría del mes activo" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Editar subcategoría del mes activo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Registrar ingreso" }));
    const incomeForm = screen.getByRole("region", { name: "Registrar ingreso" }).querySelector("form");
    if (!incomeForm) throw new Error("Missing income form.");
    fireEvent.submit(incomeForm);

    expect(await screen.findByText("El mes está cerrado: los movimientos son de solo lectura.")).toBeInTheDocument();

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

    await openMonthStructure();
    expect(await screen.findByText("Estos cambios corrigen solo la estructura de este mes; no modifican la plantilla global.")).toBeInTheDocument();

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

    await openMonthStructure();
    expect(await screen.findByText(/Crea categorías y subcategorías solo en este mes/i)).toBeInTheDocument();
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
    expect(await screen.findByText("Categoría creada solo en la estructura de este mes; la plantilla global no cambió.")).toBeInTheDocument();
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

    await openMonthStructure();
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

    await openMonthStructure();
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

    await openMonthStructure();
    await user.click(await screen.findByRole("button", { name: "Editar gasto Café" }));
    expect(screen.getByRole("button", { name: "Actualizar gasto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar edición de gasto" }));
    expect(screen.getByRole("button", { name: "Registrar gasto" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar categoría Ingresos" }));
    expect(screen.getByRole("form", { name: "Editar categoría del mes activo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar subcategoría Bonus" }));
    expect(screen.getByRole("form", { name: "Editar subcategoría del mes activo" })).toBeInTheDocument();

    apiMock.getExpenseHistory.mockClear();
    await user.click(screen.getByRole("button", { name: "Refrescar" }));

    expect(await screen.findByRole("button", { name: "Editar categoría Ingresos refrescados" })).toBeInTheDocument();
    await waitFor(() => expect(apiMock.getExpenseHistory).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("form", { name: "Editar categoría del mes activo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Editar subcategoría del mes activo" })).not.toBeInTheDocument();
  });

  it("keeps server deletion guard failures visible without removing month snapshot items", async () => {
    const user = userEvent.setup();
    apiMock.deleteMonthSubcategory.mockRejectedValueOnce(new Error("No se puede eliminar la subcategoría porque tiene movimientos asociados."));

    render(<ActiveMonthPage />);

    await openMonthStructure();
    await user.click(await screen.findByRole("button", { name: "Eliminar subcategoría Bonus" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se puede eliminar la subcategoría porque tiene movimientos asociados.");
    expect(screen.getByText("Bonus")).toBeInTheDocument();
  });

  it("keeps category deletion guard failures visible without removing the category", async () => {
    const user = userEvent.setup();
    apiMock.deleteMonthCategory.mockRejectedValueOnce(new Error("No se puede eliminar la categoría porque todavía tiene subcategorías o movimientos asociados."));

    render(<ActiveMonthPage />);

    await openMonthStructure();
    await user.click(await screen.findByRole("button", { name: "Eliminar categoría Ingresos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se puede eliminar la categoría porque todavía tiene subcategorías o movimientos asociados.");
    expect(screen.getByRole("button", { name: "Editar categoría Ingresos" })).toBeInTheDocument();
  });

  it("withdraws cash from monthly available money", async () => {
    const user = userEvent.setup();

    render(<ActiveMonthPage />);

    await user.click(await screen.findByRole("button", { name: "Retirar efectivo" }));
    const withdrawalForm = screen.getByRole("region", { name: "Retirar efectivo" }).querySelector("form");
    if (!withdrawalForm) throw new Error("Missing withdrawal form.");

    await user.type(within(withdrawalForm).getByLabelText("Monto a retirar", { selector: "input" }), "50");
    fireEvent.change(within(withdrawalForm).getByLabelText("Fecha del retiro"), { target: { value: "2026-05-10" } });
    await user.type(within(withdrawalForm).getByLabelText("Descripción del retiro (opcional)"), "ATM");
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

    await user.click(await screen.findByRole("button", { name: "Registrar ingreso" }));
    const incomeForm = screen.getByRole("region", { name: "Registrar ingreso" }).querySelector("form");
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

    await screen.findByText("Ingreso registrado y totales recalculados.");

    await user.click(screen.getByRole("button", { name: "Editar ingreso Sueldo" }));
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

    await user.click(screen.getByRole("button", { name: "Eliminar ingreso Sueldo neto" }));
    await waitFor(() => expect(apiMock.deleteMonthlyIncome).toHaveBeenCalledWith("month-1", "income-1"));
  });

  it("does not show income mutation controls for closed months", async () => {
    apiMock.getActiveMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });

    render(<ActiveMonthPage />);

    expect(await screen.findByText(/movimientos son de solo lectura/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar ingreso" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Editar ingreso" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar ingreso" })).not.toBeInTheDocument();
  });
});
