import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { monthlyLedgerApi } from "./monthlyLedgerApi";

describe("monthlyLedgerApi", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("requests the canonical ledger with system events at the exact endpoint", async () => {
    const payload = { monthId: "month 1", status: "ACTIVE", entries: [] };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));

    await expect(monthlyLedgerApi.get("month 1")).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith("/api/months/month%201/ledger?includeSystemEvents=true");
  });

  it("preserves server failure messages for the controller retry state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: "Ledger unavailable." }), { status: 503 }));

    await expect(monthlyLedgerApi.get("month-1")).rejects.toThrow("Ledger unavailable.");
  });
});
