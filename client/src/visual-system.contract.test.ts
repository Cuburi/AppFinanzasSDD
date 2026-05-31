import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname, "../..");
const styles = readFileSync(resolve(projectRoot, "client/src/styles.css"), "utf8");
const visualSystemSkill = readFileSync(resolve(projectRoot, ".opencode/skills/visual-system-ui/SKILL.md"), "utf8");

function cssBlock(selector: string): string {
  const start = styles.lastIndexOf(selector);
  if (start === -1) return "";

  const openBrace = styles.indexOf("{", start);
  const closeBrace = styles.indexOf("}", openBrace);
  return styles.slice(openBrace + 1, closeBrace);
}

function firstCssBlock(selector: string): string {
  const start = styles.indexOf(selector);
  if (start === -1) return "";

  const openBrace = styles.indexOf("{", start);
  const closeBrace = styles.indexOf("}", openBrace);
  return styles.slice(openBrace + 1, closeBrace);
}

function topLevelCssBlock(selector: string): string {
  const start = styles.indexOf(`\n${selector} {`);
  if (start === -1) return "";

  const openBrace = styles.indexOf("{", start);
  const closeBrace = styles.indexOf("}", openBrace);
  return styles.slice(openBrace + 1, closeBrace);
}

function cssBlockAfter(selector: string, after: string): string {
  const afterIndex = styles.indexOf(after);
  const start = styles.indexOf(selector, afterIndex);
  if (start === -1) return "";

  const openBrace = styles.indexOf("{", start);
  const closeBrace = styles.indexOf("}", openBrace);
  return styles.slice(openBrace + 1, closeBrace);
}

function mediaBlock(query: string): string {
  const start = styles.indexOf(`@media ${query}`);
  if (start === -1) return "";

  const openBrace = styles.indexOf("{", start);
  let depth = 0;
  for (let index = openBrace; index < styles.length; index += 1) {
    const char = styles[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return styles.slice(openBrace + 1, index);
  }

  return "";
}

describe("visual system contracts", () => {
  it("keeps semantic primitive styling backed by shared CSS tokens", () => {
    expect(firstCssBlock(":root")).toContain("--color-success-border:");
    expect(firstCssBlock(":root")).toContain("--color-warning-border:");
    expect(firstCssBlock(":root")).toContain("--color-danger-border:");

    expect(cssBlock(".pill.success")).toContain("border-color: var(--color-success-border);");
    expect(cssBlock(".pill.warning")).toContain("border-color: var(--color-warning-border);");
    expect(cssBlock(".pill.danger")).toContain("border-color: var(--color-danger-border);");
  });

  it("documents future UI work as token-first and primitive-driven", () => {
    expect(visualSystemSkill).toContain("Use existing CSS custom properties");
    expect(visualSystemSkill).toContain("Reuse `client/src/components/ui` primitives");
    expect(visualSystemSkill).toContain("Do not copy static mock HTML/CSS directly into React");
    expect(visualSystemSkill).toContain("Do not adopt Tailwind, shadcn, CSS-in-JS, or a new component library");
  });

  it("keeps mobile and tablet layouts constrained against horizontal overflow", () => {
    const tabletRules = mediaBlock("(max-width: 768px)");

    expect(cssBlock("body")).toContain("min-width: 320px;");
    expect(firstCssBlock(".app-shell")).toContain("max-width: 1180px;");
    expect(topLevelCssBlock(".card")).toContain("min-width: 0;");
    expect(cssBlockAfter(".budget-line", ".dashboard-kpi-grid")).toContain("overflow-wrap: anywhere;");
    expect(cssBlockAfter(".grid-subcategory", ".wrap")).toContain("grid-template-columns: minmax(0, 1fr) 200px auto;");

    expect(tabletRules).toContain(".app-shell");
    expect(tabletRules).toContain("padding-inline: var(--space-2);");
    expect(tabletRules).toContain(".dashboard-kpi-grid");
    expect(tabletRules).toContain("grid-template-columns: 1fr;");
    expect(tabletRules).toContain(".row");
    expect(tabletRules).toContain("flex-direction: column;");
    expect(tabletRules).toContain(".grid-subcategory");
  });
});
