---
name: visual-system-ui
description: "Trigger: visual system, dashboard UI, finance UI, premium UI. Keep AppFinanzasSDD UI token-first and primitive-driven."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Skill: visual-system-ui

## Activation Contract

Use this skill when changing AppFinanzasSDD client UI, dashboard surfaces, monthly pages, finance state presentation, or visual-system primitives.

## Hard Rules

- Use existing CSS custom properties in `client/src/styles.css` before adding new visual values.
- Reuse `client/src/components/ui` primitives for cards, buttons, status pills, section headers, and KPI cards.
- Do not adopt Tailwind, shadcn, CSS-in-JS, or a new component library inside the current visual-system SDD.
- Do not copy static mock HTML/CSS directly into React; translate intent into reusable primitives and token-backed classes.
- Preserve routes, API calls, and domain behavior. UI changes must be presentation-only unless the task explicitly says otherwise.
- Accessibility is part of the visual system: keep labelled regions, visible focus states, semantic status text, and responsive layouts.

## Decision Gates

| Situation | Action |
|---|---|
| Repeated card/button/pill/header/KPI pattern | Use or extend a primitive. |
| New color, radius, shadow, spacing, or focus value | Add or reuse a named token in `styles.css`. |
| Finance success/warning/danger/neutral state | Use `StatusPill`, `Card` tone, or `KpiCard` trend semantics. |
| Unique one-page layout need | Add a small semantic class; avoid inline styles. |

## Execution Steps

1. Read the affected page and existing primitive API before editing.
2. Write behavior/accessibility tests first when changing rendered UI.
3. Implement the smallest token-backed change that satisfies the scenario.
4. Run the relevant client tests; run the full client test command for final visual-system slices.

## Output Contract

Report changed files, tests run, accessibility/responsive checks, and any intentional deviation from primitive/token reuse.

## References

- `client/src/components/ui/` — shared visual-system primitives.
- `client/src/styles.css` — token and responsive style source of truth.
