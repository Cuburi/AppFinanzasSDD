import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname, "../..");
const styles = readFileSync(resolve(projectRoot, "client/src/styles.css"), "utf8").replace(/\r\n/g, "\n");
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

function effectiveDeclaration(source: string, selector: string, property: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = source.matchAll(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`, "g"));
  let value = "";

  for (const block of blocks) {
    const declarations = block[1].matchAll(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, "g"));
    for (const declaration of declarations) value = declaration[1].trim();
  }

  return value;
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
    const tabletRules = mediaBlock("(max-width: 1100px)");

    expect(cssBlock("body")).toContain("min-width: 320px;");
    expect(firstCssBlock(".app-shell")).toContain("max-width: 1180px;");
    expect(styles).toContain("grid-template-columns: 18.75rem minmax(0, 1fr);");
    expect(styles).toContain("min-width: 0;");
    expect(cssBlockAfter(".budget-line", ".dashboard-kpi-grid")).toContain("overflow-wrap: anywhere;");
    expect(cssBlockAfter(".grid-subcategory", ".wrap")).toContain("grid-template-columns: minmax(0, 1fr) 200px auto;");

    expect(tabletRules).toContain(".app-shell");
    expect(tabletRules).toContain("display: block;");
    expect(tabletRules).toContain(".app-header");
    expect(tabletRules).toContain("flex-direction: row;");
    expect(tabletRules).toContain(".dashboard-kpi-grid");
    expect(tabletRules).toContain("grid-template-columns: 1fr;");
    expect(tabletRules).toContain(".row");
    expect(tabletRules).toContain("flex-direction: column;");
    expect(tabletRules).toContain(".grid-subcategory");
  });

  it("keeps dashboard context and controls usable at the mobile breakpoint", () => {
    const tabletRules = mediaBlock("(max-width: 1100px)");

    expect(cssBlock(".field input,\n.field select")).toContain("min-height: 44px;");
    expect(topLevelCssBlock(".button")).toContain("min-height: 44px;");
    expect(topLevelCssBlock(".button")).toContain("min-inline-size: 44px;");
    expect(styles).toMatch(/\.dashboard-context\s*\{\s*align-items: center;\s*gap: var\(--space-2\);\s*grid-template-columns: minmax\(0, 1fr\) auto;/);
    expect(tabletRules).toContain(".dashboard-context");
    expect(tabletRules).toContain("grid-template-columns: 1fr;");
    expect(tabletRules).toContain(".dashboard-context-actions");
    expect(tabletRules).toContain("flex-wrap: wrap;");
  });

  it("switches to the compact shell before the desktop rail can compress the active-month context", () => {
    const compactShellRules = mediaBlock("(max-width: 1100px)");

    expect(compactShellRules).toContain(".app-shell");
    expect(compactShellRules).toContain("display: block;");
    expect(compactShellRules).toContain(".app-header");
    expect(compactShellRules).toContain("flex-direction: row;");
    expect(compactShellRules).toContain(".nav a:not([aria-current=\"page\"]) { display: inline-flex; }");
    expect(compactShellRules).toContain(".dashboard-context");
    expect(compactShellRules).toContain("grid-template-columns: 1fr;");
    expect(compactShellRules).toContain(".dashboard-context-actions");
    expect(compactShellRules).toContain("flex-wrap: wrap;");
  });

  it("makes the approved flat desktop shell declarations win the cascade", () => {
    expect(effectiveDeclaration(styles, ".app-header", "background")).toBe("#101813");
    expect(effectiveDeclaration(styles, ".app-header", "border-radius")).toBe("0");
    expect(effectiveDeclaration(styles, ".nav a", "background")).toBe("transparent");
    expect(effectiveDeclaration(styles, ".nav a", "border")).toBe("0");
    expect(effectiveDeclaration(styles, ".card", "background")).toBe("var(--color-surface)");
    expect(effectiveDeclaration(styles, ".button.primary", "background")).toBe("var(--color-primary)");
  });

  it("retains the flat shell while compact and 320px contracts replace the desktop rail", () => {
    const compactShellRules = mediaBlock("(max-width: 1100px)");

    expect(compactShellRules).toContain(".app-shell { display: block; }");
    expect(compactShellRules).toContain(".nav { flex-direction: row;");
    expect(cssBlock("body")).toContain("min-width: 320px;");
    expect(effectiveDeclaration(styles, ".app-header", "background")).toBe("#101813");
    expect(effectiveDeclaration(styles, ".nav a", "background")).toBe("transparent");
    expect(effectiveDeclaration(styles, ".button.primary", "background")).toBe("var(--color-primary)");
  });

  it("keeps the active-month dashboard readable and actionable from tablet through narrow and zoomed viewports", () => {
    const tabletRules = mediaBlock("(max-width: 768px)");
    const phoneRules = mediaBlock("(max-width: 390px)");
    const narrowRules = mediaBlock("(max-width: 320px)");

    expect(tabletRules).toContain(".active-month-dashboard .dashboard-context-actions");
    expect(tabletRules).toContain("width: 100%;");
    expect(tabletRules).toContain("justify-content: space-between;");
    expect(tabletRules).toContain(".active-month-dashboard .financial-summary");
    expect(tabletRules).toContain("padding: var(--space-3);");
    expect(cssBlockAfter(".active-month-dashboard .financial-primary-value", "@media (max-width: 768px)")).toContain("overflow-wrap: anywhere;");

    expect(phoneRules).toContain(".active-month-dashboard .financial-secondary-metrics");
    expect(phoneRules).toContain("grid-template-columns: 1fr;");
    expect(phoneRules).toContain(".active-month-dashboard .dashboard-context-actions");
    expect(phoneRules).toContain("align-items: flex-start;");

    expect(narrowRules).toContain(".active-month-dashboard .dashboard-actions");
    expect(narrowRules).toContain("display: grid;");
    expect(narrowRules).toContain(".active-month-dashboard .button");
    expect(narrowRules).toContain("width: 100%;");

    expect(styles).toContain("@media (max-width: 768px)");
    expect(styles).toContain("@media (max-width: 390px)");
    expect(styles).toContain("@media (max-width: 320px)");
  });

  it("keeps active-month motion compositor-safe, interruptible, and removable for reduced motion", () => {
    const reducedMotionRules = mediaBlock("(prefers-reduced-motion: reduce)");

    expect(styles).toContain(".active-month-dashboard {");
    expect(styles).toContain("--active-month-motion-duration: 180ms;");
    expect(styles).toContain("--active-month-motion-easing: cubic-bezier(0.23, 1, 0.32, 1);");
    expect(styles).toContain(".active-month-dashboard > .dashboard-context,");
    expect(styles).toContain("section[aria-label=\"Resumen financiero\"]");
    expect(styles).toContain("transition-property: opacity, transform;");
    expect(styles).toContain("transform: translateY(0.375rem);");
    expect(styles).toContain(".active-month-dashboard .button:active");
    expect(styles).toContain("transform: scale(0.98);");
    expect(styles).not.toContain("@keyframes");

    expect(reducedMotionRules).toContain(".active-month-dashboard > .dashboard-context,");
    expect(reducedMotionRules).toContain("transition-duration: 0ms;");
    expect(reducedMotionRules).toContain(".active-month-dashboard .button:active");
    expect(reducedMotionRules).toContain("transform: none;");
  });
});
