import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CloseMonthPage } from "./CloseMonthPage";
import type { ClosureReview, Month, SavingsPocket } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  getPockets: vi.fn(),
  getClosureReview: vi.fn(),
  applyClosureAction: vi.fn(),
  closeMonth: vi.fn(),
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
  categories: [],
};

const pendingReview: ClosureReview = {
  monthId: activeMonth.id,
  status: "ACTIVE",
  canClose: false,
  pendingSurpluses: [
    {
      subcategoryId: "sub-food",
      subcategoryName: "Comida",
      amount: 125,
      defaultPocketId: "pocket-food",
      requiresPocketSelection: false,
    },
  ],
  pendingDeficits: [],
};

const cleanReview: ClosureReview = {
  ...pendingReview,
  canClose: true,
  pendingSurpluses: [],
};

const noDefaultReview: ClosureReview = {
  ...pendingReview,
  pendingSurpluses: [
    {
      subcategoryId: "sub-fun",
      subcategoryName: "Salidas",
      amount: 80,
      defaultPocketId: null,
      requiresPocketSelection: true,
    },
  ],
};

const activePockets: SavingsPocket[] = [
  { id: "pocket-food", name: "Comida", goalAmount: null, active: true, balance: 75 },
  { id: "pocket-emergency", name: "Emergencias", goalAmount: 1000, active: true, balance: 250 },
];

describe("CloseMonthPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getActiveMonth.mockResolvedValue(activeMonth);
    apiMock.getPockets.mockResolvedValue(activePockets);
  });

  it("shows pending balances and keeps close disabled while explicit actions are missing", async () => {
    apiMock.getClosureReview.mockResolvedValue(pendingReview);

    render(<CloseMonthPage />);

    expect(await screen.findByText("Comida")).toBeInTheDocument();
    expect(screen.getByText("Sobrante: $125.00")).toBeInTheDocument();
    expect(screen.getByText(/botón queda deshabilitado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar mes" })).toBeDisabled();
    expect(apiMock.closeMonth).not.toHaveBeenCalled();
  });

  it("enables closing only after registering the explicit closure action", async () => {
    const user = userEvent.setup();
    apiMock.getClosureReview.mockResolvedValueOnce(pendingReview).mockResolvedValueOnce(cleanReview);
    apiMock.applyClosureAction.mockResolvedValue(cleanReview);
    apiMock.closeMonth.mockResolvedValue({ ...activeMonth, status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" });

    render(<CloseMonthPage />);

    expect(await screen.findByText("Comida")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar mes" })).toBeDisabled();

    const surplusForm = screen.getByText("Comida").closest("form");
    if (!surplusForm) {
      throw new Error("Missing surplus form.");
    }

    await user.click(within(surplusForm).getByRole("button", { name: "Transferir sobrante" }));

    await waitFor(() => expect(apiMock.applyClosureAction).toHaveBeenCalledTimes(1));
    expect(apiMock.applyClosureAction).toHaveBeenCalledWith({
      monthId: activeMonth.id,
      type: "SURPLUS_TO_POCKET_ON_CLOSE",
      sourceSubcategoryId: "sub-food",
      targetPocketId: "pocket-food",
      amount: undefined,
      description: "Transferencia de sobrante al cierre",
    });

    const closeButton = await screen.findByRole("button", { name: "Cerrar mes" });
    expect(closeButton).toBeEnabled();

    await user.click(closeButton);

    await waitFor(() => expect(apiMock.closeMonth).toHaveBeenCalledWith(activeMonth.id));
    expect(await screen.findByText(/cerrado\. Ya no se puede modificar/i)).toBeInTheDocument();
  });

  it("prefills the active-pocket selector with the default surplus destination", async () => {
    apiMock.getClosureReview.mockResolvedValue(pendingReview);

    render(<CloseMonthPage />);

    const surplusForm = (await screen.findByText("Comida")).closest("form");
    if (!surplusForm) throw new Error("Missing surplus form.");

    expect(within(surplusForm).queryByLabelText("ID bolsillo destino")).not.toBeInTheDocument();
    expect(within(surplusForm).getByLabelText("Bolsillo destino")).toHaveValue("pocket-food");
    expect(within(surplusForm).getByRole("option", { name: "Comida ($75.00)" })).toBeInTheDocument();
    expect(apiMock.getPockets).toHaveBeenCalledWith("active");
  });

  it("requires choosing an active destination when a surplus has no default pocket", async () => {
    const user = userEvent.setup();
    apiMock.getClosureReview.mockResolvedValueOnce(noDefaultReview).mockResolvedValueOnce(cleanReview);
    apiMock.applyClosureAction.mockResolvedValue(cleanReview);

    render(<CloseMonthPage />);

    const surplusForm = (await screen.findByText("Salidas")).closest("form");
    if (!surplusForm) throw new Error("Missing surplus form.");

    expect(within(surplusForm).getByText(/elegí un bolsillo activo antes de transferir/i)).toBeInTheDocument();
    expect(within(surplusForm).getByLabelText("Bolsillo destino")).toHaveValue("");

    await user.click(within(surplusForm).getByRole("button", { name: "Transferir sobrante" }));
    expect(apiMock.applyClosureAction).not.toHaveBeenCalled();

    await user.selectOptions(within(surplusForm).getByLabelText("Bolsillo destino"), "pocket-emergency");
    await user.click(within(surplusForm).getByRole("button", { name: "Transferir sobrante" }));

    await waitFor(() =>
      expect(apiMock.applyClosureAction).toHaveBeenCalledWith({
        monthId: activeMonth.id,
        type: "SURPLUS_TO_POCKET_ON_CLOSE",
        sourceSubcategoryId: "sub-fun",
        targetPocketId: "pocket-emergency",
        amount: undefined,
        description: "Transferencia de sobrante al cierre",
      }),
    );
  });
});
