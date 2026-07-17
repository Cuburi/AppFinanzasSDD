# AppFinanzas Visual Direction Brief

This brief defines the visual direction for AppFinanzas UI work. Use it to keep future screens consistent: a dark premium personal finance command center that feels trustworthy, usable, and innovative without becoming noisy.

## Purpose

- Align UI decisions before changing screens, primitives, or dashboard surfaces.
- Translate reference inspiration into product principles, not copied visuals.
- Give reviewers a checklist for whether UI work matches the intended experience.

## Reference Roles

| Reference | Role in AppFinanzas |
| --- | --- |
| Mercury / Ramp | Trustworthy financial structure, clear hierarchy, calm dashboard layouts. |
| Revolut / Curve | Card-focused surfaces, balances, quick actions, and statement/card mental models. |
| Linear | Dark premium polish, restrained microinteractions, and smooth state transitions. |
| Monzo / Nubank | Human clarity, simple copy, and accessible finance decisions. |

## Product Principles

- **Command center first**: users should quickly understand cash position, card state, recent movement, and next action.
- **Trust over spectacle**: hierarchy, spacing, and copy must make the product feel reliable before it feels impressive.
- **Financial truth beats visual novelty**: never hide, soften, or delay important money information to make a screen feel more impressive.
- **Human finance**: explain financial states in plain language; avoid jargon when a simpler label works.
- **Innovation with restraint**: modern surfaces and interactions are welcome only when they improve orientation or speed.

## Information Priority

AppFinanzas screens should make financial decisions easier by ordering information consistently:

1. **Financial state**: balance, debt, card statement, cash position, or cycle status.
2. **Risk and next action**: warning state, due date, deficit, required payment, or recommended action.
3. **Supporting context**: recent movements, history, secondary metadata, and optional details.

If a screen cannot make this priority clear, improve the hierarchy before adding visual polish.

## Visual Principles

- Use a dark premium foundation with strong contrast and calm depth.
- Prefer structured cards, panels, and balance surfaces over decorative sections.
- Make primary financial information visually dominant; secondary context should support, not compete.
- Use color semantically for financial state, alerts, progress, and action priority.
- Keep layouts spacious, ordered, and scannable across desktop and mobile.

## Motion Principles

- Motion should guide attention, not decorate.
- Use transitions to clarify state changes, loading, expansion, selection, or confirmation.
- Keep animation short, smooth, and interruptible-feeling; avoid loops or distracting ambient motion.
- Respect accessibility expectations and avoid motion that blocks task completion.

### Motion Allowed / Not Allowed

Allowed motion:

- Card or panel entry when content first appears.
- Expanding or collapsing detail sections.
- Status changes, confirmations, and successful actions.
- Lightweight loading transitions that preserve orientation.

Avoid motion:

- Looped ambient animations that compete with financial data.
- Parallax or decorative movement without task value.
- Delayed reveals for critical balances, debts, or warnings.
- Motion that makes the interface feel playful at the expense of trust.

## Component Implications

- Cards should feel like trusted finance surfaces: clear title, key value, supporting context, and one obvious action when needed.
- Balance and card modules should support quick scanning: amount, status, trend, and recent activity.
- Quick actions should be visible but not loud; prioritize common finance decisions over generic shortcuts.
- Status pills, alerts, and empty states should use plain language and semantic visual treatment.
- Primitives should remain token-backed so dark premium polish is consistent across the product.

## Usability Checklist

- [ ] The screen makes the user's current financial state understandable within a few seconds.
- [ ] Primary action and primary financial value are visually clear.
- [ ] Copy is simple, human, and specific to the user's decision.
- [ ] Color and motion explain state instead of adding decoration.
- [ ] Layout works for card/balance/statement mental models without crowding.
- [ ] Accessibility basics are preserved: contrast, focus states, labels, and responsive behavior.

## Anti-Patterns

- Copying reference screenshots, brand assets, or proprietary visual treatments.
- Adding glow, gradients, blur, or animation without a product reason.
- Hiding important financial state behind visual novelty.
- Introducing one-off colors, spacing, shadows, or components outside the token/primitives system.
- Using vague finance copy such as "things look good" when a concrete status would help the user decide.

## How Future UI Work Should Use This Document

1. Read this brief before changing AppFinanzas UI.
2. Identify which reference role and product principle the change supports.
3. Implement through existing tokens and UI primitives whenever possible.
4. During review, check the usability checklist and call out any intentional deviation.
