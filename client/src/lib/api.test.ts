import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";

const pocketPayload = {
  id: "pocket-emergency",
  name: "Emergencias",
  goalAmount: 1000,
  active: true,
  balance: 250,
  recentMovements: [
    {
      id: "move-1",
      amount: 250,
      description: "Ahorro inicial",
      occurredAt: "2026-05-10T12:00:00.000Z",
      direction: "in",
    },
  ],
};

describe("pockets api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists active pockets using the backend active filter", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ pockets: [pocketPayload] }), { status: 200 }));

    await expect(api.getPockets("active")).resolves.toEqual([pocketPayload]);

    expect(fetch).toHaveBeenCalledWith("/api/pockets?active=true");
  });

  it("creates, updates, deactivates, and reads pocket details with explicit contracts", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(pocketPayload), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...pocketPayload, name: "Reserva" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...pocketPayload, active: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(pocketPayload), { status: 200 }));

    await expect(api.createPocket({ name: "Emergencias", goalAmount: 1000 })).resolves.toEqual(pocketPayload);
    await expect(api.updatePocket("pocket-emergency", { name: "Reserva", goalAmount: null })).resolves.toMatchObject({ name: "Reserva" });
    await expect(api.deactivatePocket("pocket-emergency")).resolves.toMatchObject({ active: false });
    await expect(api.getPocket("pocket-emergency")).resolves.toEqual(pocketPayload);

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/pockets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Emergencias", goalAmount: 1000 }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/pockets/pocket-emergency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Reserva", goalAmount: null }),
    });
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/pockets/pocket-emergency", { method: "DELETE" });
    expect(fetch).toHaveBeenNthCalledWith(4, "/api/pockets/pocket-emergency");
  });
});
