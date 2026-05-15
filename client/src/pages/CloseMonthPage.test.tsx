import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CloseMonthPage } from "./CloseMonthPage";
import type { ClosureReview, Month } from "../types";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
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

describe("CloseMonthPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getActiveMonth.mockResolvedValue(activeMonth);
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
      targetPocketId: undefined,
      amount: undefined,
      description: "Transferencia de sobrante al cierre",
    });

    const closeButton = await screen.findByRole("button", { name: "Cerrar mes" });
    expect(closeButton).toBeEnabled();

    await user.click(closeButton);

    await waitFor(() => expect(apiMock.closeMonth).toHaveBeenCalledWith(activeMonth.id));
    expect(await screen.findByText(/cerrado\. Ya no se puede modificar/i)).toBeInTheDocument();
  });
});
