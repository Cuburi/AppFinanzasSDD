import { describe, expect, it } from "vitest";

import { formatCop, formatMoneyInput, normalizeAmountInput, toMoneyInputValue, toMoneyInputDigits } from "./money";

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

  it("keeps money input text as whole-peso digits without leading zeros", () => {
    expect(toMoneyInputDigits("$ 1.234.567")).toBe("1234567");
    expect(toMoneyInputDigits("0012")).toBe("12");
    expect(toMoneyInputDigits("0")).toBe("0");
    expect(toMoneyInputDigits("abc")).toBe("");
  });

  it("displays money input digits with COP thousands separators", () => {
    expect(formatMoneyInput("")).toBe("");
    expect(formatMoneyInput("999")).toBe("$ 999");
    expect(formatMoneyInput("1000")).toBe("$ 1.000");
    expect(formatMoneyInput("123456789012")).toBe("$ 123.456.789.012");
  });

  it("turns stored amounts into whole-peso input values without rounding up", () => {
    expect(toMoneyInputValue(null)).toBe("");
    expect(toMoneyInputValue(1500)).toBe("1500");
    expect(toMoneyInputValue(1234.99)).toBe("1234");
  });
});
