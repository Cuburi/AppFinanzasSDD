# Daily-use small fixes

Three daily-use frictions from the personal-use backlog, delivered together on `feat/daily-use-small-fixes`.
Order: pocket collapse, currency money input, server error translation.

## Specs

- S1 — Translate server error messages shown to the user. Backlog wording: "Translate server error messages shown to the user (some arrive in English, e.g. "Insufficient funds for this pocket deposit.")." Translate at the server source, keeping error codes and HTTP statuses unchanged. The client's generic fallback `Request failed with status ${status}.` is also user-visible and must be Spanish.
- S2 — User report: "que lo campos de dinero, me gustaria que tenga formato de moneda a medida que se vaya copiando". Money inputs show COP currency format with thousands separators while typing (for example `$ 1.234.567`), and the value sent to the server stays exact. User decision: "Solo pesos enteros" — no cents can be entered.
- S3 — User report: "que en la pantalla de bolsillos pueda hacer wrap a cada bolsillo y no siempre esten los movimientos porque cuando ya llevo varios empieza a hacer largo esa pantalla". Each pocket can collapse/expand its movements independently, so the page stays short.

## Tasks

- [x] T1 — S3 — inline — collapsible movements per pocket (`PocketRecentMovements`), collapsed by default, independent per pocket.
- [ ] T2 — S2 — inline — shared integer COP money input replacing every money field (18 sites in 7 screens).
- [ ] T3 — S1 — inline — Spanish server error messages at the source, plus Spanish client transport fallback.

## Log

- L1 — User (original request, after the agreed backlog order): "Si me parece y creeria que los arreglos pequeños los podemos hacer de una, no?"
- L2 — Exploration: 18 money inputs, no shared input component, 6 page test files type into money fields; server errors are English across all modules with 17 test files asserting exact strings; pockets render movements unconditionally at `PocketsPage.tsx:471`, `TemplatePage.tsx` already uses controlled `<details>` per category.
- L3 — User decision on money format: "Solo pesos enteros".
