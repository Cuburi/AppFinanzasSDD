import { describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  getActiveMonth: vi.fn(),
  openMonth: vi.fn(),
}));

vi.mock("../../../../lib/api", () => ({ api: apiMock }));

import { dashboardApi } from "./dashboardApi";

describe("dashboardApi", () => {
  it("delegates authority reads to the global facade without changing the result", async () => {
    const month = { id: "month-1" };
    apiMock.getActiveMonth.mockResolvedValue(month);

    await expect(dashboardApi.getActiveMonth()).resolves.toBe(month);
    expect(apiMock.getActiveMonth).toHaveBeenCalledOnce();
  });

  it("delegates the open-month payload and result unchanged", async () => {
    const input = { year: 2026, month: 7 };
    const month = { id: "month-1", ...input };
    apiMock.openMonth.mockResolvedValue(month);

    await expect(dashboardApi.openMonth(input)).resolves.toBe(month);
    expect(apiMock.openMonth).toHaveBeenCalledWith(input);
  });
});
