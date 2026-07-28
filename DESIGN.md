---
name: AppFinanzas
description: A personal treasury interface built from ledger discipline, domestic clarity, and calm financial control.
---

<!-- SEED: established with the user before implementation; re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: AppFinanzas

## Overview

**Creative North Star: "The Living Ledger"**

AppFinanzas should feel like a personal treasury desk assembled for ordinary life: a precise monthly ledger, a stack of working slips, and a small set of trusted marks that make money legible without making it theatrical. The system is dark because the likely scene is a person checking the month on a phone or laptop at home under mixed or low evening light. It is not dark to signal “fintech.”

The world replaces generic dashboard cards with a ledger grammar: aligned amount columns, ruled relationships, offset index marks, compact action slips, and large calm fields of information. Matte materials, not glow, create authority. Ledger Lime marks a deliberate financial action; Carbon Violet marks guidance, selection, and orientation. Neither color is decorative.

The reusable signature is the **ledger rule**: a visible alignment line that connects a label, its amount, and its consequence. It may become a progress track, a selected-row edge, a form guide, or an index marker, but it must always explain structure or state.

**Key Characteristics:**

- Financial truth is the largest and earliest content.
- Dense information is aligned and grouped rather than trapped in repeated cards.
- Matte tonal planes and ruled borders replace gradients, glass, and glow.
- Actions read as working slips attached to the ledger, not promotional CTAs.
- Spanish remains the product-interface language across navigation, controls, feedback, and states.

## Colors

Use a **Restrained** strategy: layered ink neutrals own at least 90% of a surface; Ledger Lime and Carbon Violet appear only where they carry action or guidance. Semantic tones remain text-led, with a muted foreground and a low-chroma wash rather than a competing colored panel. These are implementation seed values. Use them as the first build defaults, change them only when browser contrast testing requires calibration, and record the surviving values in frontmatter during the post-build scan pass.

### Primary

| Token | Value | Role |
| --- | --- | --- |
| Ledger Lime | `#AEBE72` | Primary commit actions, current progress, and the one most important actionable mark in a region. |
| Lime Ink | `#151A0E` | Text and icons placed on Ledger Lime. |

**The One Lime Mark Rule.** A viewport may have several interactive controls, but only the primary current action receives a solid Ledger Lime field. Never add glow, bloom, or lime-tinted shadows.

### Secondary

| Token | Value | Role |
| --- | --- | --- |
| Carbon Violet | `#988EB7` | Focus, selected guidance, contextual help, and navigation orientation. It never communicates financial success. |

**The Guidance Is Not Status Rule.** Violet explains where to look or what is selected. Green, amber, and red communicate financial meaning.

### Tertiary

| Token | Value | Role |
| --- | --- | --- |
| Positive | `#8FB39E` | Confirmed positive financial state and successful completion. |
| Positive Wash | `#1B2720` | Background for positive status regions. |
| Caution | `#C3AA7A` | Budget pressure, degraded support, and non-blocking warnings. |
| Caution Wash | `#2A261D` | Background for caution regions. |
| Negative | `#BB8D8D` | Deficit, destructive actions, and errors. |
| Negative Wash | `#2B2020` | Background for negative status regions. |

Status must always include text or an icon-label pair; color never carries meaning alone.

### Neutral

| Token | Value | Role |
| --- | --- | --- |
| Desk Black | `#0D100E` | App canvas and navigation ground. |
| Ledger Base | `#131713` | Primary content plane. |
| Ledger Sheet | `#191E19` | Working surfaces and grouped records. |
| Raised Slip | `#1C211D` | Forms, selected rows, and temporary foreground work. |
| Rule Quiet | `#333B34` | Internal dividers and ledger rules. |
| Rule Strong | `#5C685D` | Surface boundaries and default input borders; clears the `3:1` non-text contrast floor on Ledger Base. |
| Ink | `#F2F1E8` | Primary text and financial values. |
| Ink Muted | `#B5BCB2` | Supporting text and metadata. |
| Ink Subtle | `#8C958B` | Timestamps and tertiary context; never use below body-text contrast. |

**The Matte Desk Rule.** Large regions use solid color. Do not use decorative gradients, translucent glass, bloom, or ambient neon. If texture is introduced later, it must be a static, sub-2% paper grain that disappears under reduced-data or high-contrast preferences.

## Typography

**Display and Body Font:** the platform system stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", sans-serif`
**Financial Numerals:** the same stack with `font-variant-numeric: tabular-nums lining-nums`
**Character:** familiar enough for daily use, disciplined enough for accounting. Distinction comes from optical scale, alignment, and numeral behavior rather than a fashionable display face or a technical monospace.

### Hierarchy

- **Financial Display** (`700`, `clamp(2.75rem, 7vw, 5.75rem)`, `0.96`, `-0.045em`): one dominant available-money value per surface. Keep the currency unit visually subordinate and non-wrapping when space allows.
- **Page Headline** (`680`, `clamp(1.75rem, 3vw, 2.5rem)`, `1.05`, `-0.025em`): the current month or route identity.
- **Section Title** (`650`, `1.125rem`, `1.25`, `-0.012em`): working regions such as expenses, income, and monthly structure.
- **Body** (`430`, `1rem`, `1.5`, `0`): instructions, state explanations, and row context; keep prose near `68ch` maximum.
- **Financial Row** (`600`, `1rem`, `1.2`, `0`): aligned amounts and totals with tabular numerals.
- **Label** (`650`, `0.75rem`, `1.25`, `0.075em`, uppercase): short ledger labels only; never use tracked uppercase for sentences or buttons.

Use weight and spacing before adding size. At `200%` text zoom, financial values may reflow above their metadata, but no value, unit, status, or action may clip.

**The Numbers Stay Still Rule.** Never roll, count up, scramble, or crossfade monetary values. A recalculated amount updates immediately; a nearby textual confirmation explains why.

## Layout

The system uses an asymmetric ledger grid instead of a stack of equal cards. A page starts with its financial thesis, pairs it with the highest-priority action when space allows, and then flows into records and maintenance tools. Repeated rows share amount columns and rules so the eye can compare without reopening context.

### Spatial tokens

| Token | Value | Use |
| --- | --- | --- |
| Hairline | `1px` | Rules, dividers, and boundaries. |
| Space 1 | `0.25rem` | Tight label-to-value pairing. |
| Space 2 | `0.5rem` | Compact control and row internals. |
| Space 3 | `0.75rem` | Dense grouped controls. |
| Space 4 | `1rem` | Default component padding. |
| Space 5 | `1.5rem` | Section internals and major row gaps. |
| Space 6 | `2rem` | Surface separation on compact layouts. |
| Space 7 | `3rem` | Desktop page rhythm. |
| Space 8 | `4.5rem` | Major desktop chapter separation. |

Spacing follows a `4px` base. Use more space above a section title than below it. Do not apply one uniform gap to an entire page.

### Responsive behavior

- **Wide (`>= 1120px`)**: persistent navigation rail around `15rem`; main content uses a 12-column grid with a readable maximum width of `90rem`. Financial thesis and primary action may sit in a `7 / 5` split.
- **Medium (`768px–1119px`)**: navigation becomes a top horizontal region without hiding routes. Main content uses eight columns; financial thesis and action stack before density becomes cramped.
- **Compact (`< 768px`)**: one content column; financial truth comes first, followed by the expense action, then recent activity and maintenance sections. Primary controls span the available width.
- **Narrow (`<= 390px`)**: amount and currency unit may separate into two lines; metadata stacks; buttons remain at least `44px` high; no horizontal page scrolling.

At every breakpoint, DOM order must match visual and keyboard order: month state, available money, primary expense action, warnings, recent activity, then maintenance workflows.

**The One Question First Rule.** The first viewport must answer the route’s primary financial question before it exposes secondary administration.

## Elevation & Depth

Depth is tonal and structural. Desk Black supports Ledger Base; Ledger Sheets sit one step lighter; a Raised Slip appears only when the user is actively entering or editing information. Resting surfaces use no shadow.

- **Resting:** solid tonal plane plus a `1px` rule.
- **Selected or editing:** Raised Slip with a Carbon Violet guide edge; no lift animation.
- **Popover or non-modal overlay:** `0 18px 48px rgba(0, 0, 0, 0.42)` and a strong boundary, anchored to its trigger.
- **Blocking dialog:** `0 28px 80px rgba(0, 0, 0, 0.55)` over a plain dimming scrim; keep modal origin centered.

Do not stack translucent materials. Sticky chrome uses an opaque or nearly opaque tonal plane and a scroll-edge fade only where content passes beneath it.

**The Working Layer Rule.** Elevation means “work is happening here,” not “this deserves attention.” Importance comes from hierarchy and position.

## Shapes

The form language is lightly machined rather than soft or futuristic.

- **Rules and rows:** square where they meet a ledger edge; internal row separators remain straight.
- **Fields and compact controls:** `0.375rem` radius.
- **Working slips and panels:** `0.625rem` radius.
- **Large page surfaces:** `0.75rem` radius only when a boundary is needed.
- **Status markers:** full pill only for short, non-interactive state labels.

Avoid nested rounded rectangles. When a surface already groups its contents through a rule, alignment, or tonal field, do not add another container.

## Components

These specifications map onto the existing `Button`, `Card`, `StatusPill`, field, progress, navigation, and dashboard composition primitives. Extend those primitives rather than adding a new library or page-local visual values.

### Buttons

- **Primary:** solid Ledger Lime, Lime Ink text, `0.375rem` radius, minimum `44px` target, semibold label. One dominant primary per working region.
- **Secondary:** Raised Slip background, Rule Strong border, Ink text.
- **Tertiary:** transparent background and Ink Muted text; destructive tertiary actions use Negative text but never a dashed border.
- **Hover:** change border or tonal field in `120ms`; do not float or glow.
- **Press:** respond on pointer-down with `transform: scale(0.98)` over `100ms` using `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Focus:** a `3px` Carbon Violet ring with a `2px` Desk Black offset. Never remove the browser-visible focus affordance without an equivalent.
- **Disabled or pending:** preserve label readability, use `0.56` opacity, keep width stable, and expose pending state in text.

### Cards / Containers

- Replace repeated equal cards with **ledger sheets** for related records and **working slips** for active forms.
- Use tonal separation plus one boundary; never combine border, glow, gradient, and shadow.
- Place semantic state on a leading rule, icon-label pair, and plain-language text—not on a full decorative wash alone.

### Inputs / Fields

- Ledger Base or Raised Slip fill, Rule Strong border, `0.375rem` radius, minimum `44px` height.
- Labels remain visible above controls; placeholders never replace labels.
- Focus uses Carbon Violet; valid financial state does not turn every field green.
- Inline errors sit beside the affected field, use Negative plus text, and move focus only when submission cannot continue.
- Optional fields are identified in Spanish with “(opcional)”; required state is semantic, not communicated by color alone.

### Status markers

- Use Spanish plain-language labels such as “Mes abierto,” “Mes cerrado,” and explicit degraded-state messages.
- Positive, caution, and negative tones map only to financial or system state. Carbon Violet is never a success color.
- Keep labels stable so changing color does not cause layout shift.

### Navigation

- Active routes use a Ledger Lime index rule and stronger Ink text, not a filled pill.
- Hover and focus reveal a quiet Raised Slip field; selected state remains identifiable without color.
- On compact layouts, routes remain directly reachable through a horizontal, scrollable nav; do not hide core destinations behind an unlabeled icon.
- Product labels remain Spanish, including “Tarjetas de crédito” and “Reportes.”

### Motion and state changes

- Critical balances, warnings, and controls are visible immediately; never delay them behind entrance choreography.
- A newly loaded page may orient the financial thesis with one `160ms` opacity-plus-`translateY(6px)` transition. The primary form remains interactive throughout.
- Popovers use origin-aware `140–180ms` transitions. Drawers and non-gesture sheets use `220–260ms` strong ease-out without bounce.
- Frequent actions, keyboard-initiated actions, table filtering, and monetary updates are instant.
- Animate only `transform` and `opacity` for movement; color and border-state transitions may use `120ms`.
- Under `prefers-reduced-motion: reduce`, remove transforms and use at most a `120ms` opacity change. Under `prefers-contrast: more`, strengthen boundaries and avoid low-contrast washes.

## Do's and Don'ts

### Do:

- **Do** make the available monthly amount the dominant, first-readable value on the Active Month surface.
- **Do** use aligned rules, amount columns, and tabular numerals to make comparison faster.
- **Do** reserve Ledger Lime for deliberate primary action and progress, and Carbon Violet for focus and guidance.
- **Do** preserve every loading, blocking, unopened, active, closed, degraded, editing, success, and error state in the visual hierarchy.
- **Do** keep Spanish UI copy specific, human, and financially precise.
- **Do** test at `320px`, `390px`, `768px`, `1120px`, `200%` text zoom, keyboard-only input, and reduced motion before considering the implementation complete.

### Don't:

- **Don't** produce another generic neon-fintech dashboard: no luminous edges, ambient glows, gradient blobs, glass cards, or sci-fi data decoration.
- **Don't** flatten available money, physical cash, budget availability, reserved money, income, and spending into interchangeable “balance” cards.
- **Don't** repeat the same rounded card for every section; use grouping, rules, and hierarchy first.
- **Don't** animate numbers, delay financial truth, or make frequent actions wait for motion.
- **Don't** use color without status text, use violet as success, or use lime as decoration.
- **Don't** hide maintenance workflows or degraded-state recovery; move them below the primary runway without removing their behavior.
