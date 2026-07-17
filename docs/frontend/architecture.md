# AppFinanzas Frontend Architecture Brief

This brief defines the lightweight frontend architecture direction for AppFinanzas. It exists to keep the React client understandable as finance workflows grow, without importing backend-style Clean Architecture ceremony into the UI.

## Purpose

- Keep pages from becoming large logic dumping grounds.
- Make frontend contracts explicit when backend capabilities evolve.
- Give future UI and feature work a stable place for API, model, component, and page responsibilities.
- Support gradual migration from the current page-local structure instead of forcing a risky rewrite.

## Architecture Direction

Use a pragmatic **feature-first** structure as the client grows:

```txt
client/src/
  app/              # App shell, route wiring, global providers when needed
  shared/           # Reusable UI, formatting, API helpers, test helpers
  features/         # Product features: monthly-cycle, credit-cards, pockets, debts
    feature-name/
      api/          # Feature-specific client API adapters
      model/        # Feature DTOs, view models, form state helpers
      components/   # Feature-specific UI composition
      pages/        # Route-level composition for the feature
```

The current codebase does not need to be migrated all at once. New or heavily changed areas should move toward this shape first.

## Responsibility Rules

- **Pages compose workflows**: route pages may load data and compose sections, but should not accumulate parsing, formatting, business decisions, and repeated UI patterns indefinitely.
- **Feature API owns endpoint details**: query parameters, envelope unwrapping, and backend DTO mapping belong near the feature API boundary.
- **Feature model owns UI-facing shape**: form payloads, filters, fallback labels, and view-model helpers should be close to the feature that uses them.
- **Shared is earned**: move code to `shared/` only when at least two features need it for the same reason.
- **UI primitives stay generic**: `components/ui` should not learn credit-card, monthly-cycle, or pocket-specific concepts.
- **Backend internals stay out**: the client should depend on public HTTP contracts, not Prisma names, backend use cases, or infrastructure concepts.

## Migration Strategy

Prefer incremental extraction over big-bang rewrites:

1. Keep existing working routes stable.
2. When a page grows because of a new slice, extract the repeated or feature-specific pieces touched by that slice.
3. Introduce feature folders only where the new work needs them.
4. Keep tests with the behavior they protect.
5. Avoid moving unrelated files just to make the tree look cleaner.

## API and Type Strategy

- Keep HTTP contract handling explicit and tested.
- Avoid silently duplicating backend types without contract tests or clear mapping.
- Prefer feature-specific API functions when a workflow becomes more than a simple shared facade call.
- Preserve existing cash/no-card, empty, error, and loading behavior when adding optional fields such as `creditCardId`.

## UI Composition Strategy

- Use `docs/frontend/visual-direction.md` for experience direction.
- Use `client/src/components/ui/` for generic primitives.
- Add feature-specific components for repeated domain surfaces, such as statement rows, card selectors, expense filter panels, or monthly-cycle summaries.
- Keep premium visual polish separate from contract/linking slices unless the slice explicitly targets UI foundation.

## Testing Expectations

- Write behavior tests before production changes for meaningful UI or contract changes.
- Keep API serialization tests with the API boundary.
- Keep route/page tests focused on user-visible behavior.
- Add regression tests for optional fields and fallback states, especially where backend data can be missing or unavailable.

## Anti-Patterns

- Turning `pages/*` into large all-purpose components.
- Adding every frontend type to one global `types.ts` forever.
- Creating generic abstractions before two features actually need them.
- Moving files only for architectural appearance without reducing complexity.
- Importing backend implementation concepts into client code.
- Blocking the whole page when one optional supporting request fails.

## How Future Frontend Work Should Use This Document

1. Read this brief before adding or heavily changing frontend features.
2. Decide whether the change can stay page-local or needs a feature extraction.
3. Keep the smallest useful architecture improvement inside the current slice.
4. Document any intentional deviation in the PR or SDD artifact.
