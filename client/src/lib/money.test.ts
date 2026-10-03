import { describe, expect, it } from "vitest";

import { formatCop, normalizeAmountInput } from "./money";

describe("money helpers", () => {
  it("formats COP with Colombian separators and an explicit currency label", () => {
    expect(formatCop(0.49)).toBe("$0,49 COP");
    expect(formatCop(-1_234.5)).toBe("$-1.234,5 COP");
  });

  it("removes insignificant leading zeros while preserving decimal entry states", () => {
    expect(normalizeAmountInput("0124")).toBe("124");
    expect(normalizeAmountInput("000.50")).toBe("0.50");
    expect(normalizeAmountInput("0.")).toBe("0.");
    expect(normalizeAmountInput("")).toBe("");
  });
});
