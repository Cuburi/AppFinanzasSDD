import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentPath = resolve(__dirname, "components/ClosedMonthDashboard.tsx");

describe("closed-month dashboard boundary", () => {
  it("keeps the closed renderer isolated from active-month composition and HTTP access", () => {
    const source = readFileSync(componentPath, "utf8");

    expect(source).not.toContain("active-month-dashboard");
    expect(source).not.toContain(".active-month-dashboard");
    expect(source).not.toMatch(/\b(fetch|api)\b/);
  });
});
