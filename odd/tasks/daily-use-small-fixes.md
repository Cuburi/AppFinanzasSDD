# Daily-use small fixes

Three daily-use frictions from the personal-use backlog, delivered together on `feat/daily-use-small-fixes`.
Order: pocket collapse, currency money input, server error translation.

## Specs

- S1 — Translate server error messages shown to the user. Backlog wording: "Translate server error messages shown to the user (some arrive in English, e.g. "Insufficient funds for this pocket deposit.")." Translate at the server source, keeping error codes and HTTP statuses unchanged. The client's generic fallback `Request failed with status ${status}.` is also user-visible and must be Spanish.
- S2 — User report: "que lo campos de dinero, me gustaria que tenga formato de moneda a medida que se vaya copiando". Money inputs show COP currency format with thousands separators while typing (for example `$ 1.234.567`), and the value sent to the server stays exact. User decision: "Solo pesos enteros" — no cents can be entered.
- S3 — User report: "que en la pantalla de bolsillos pueda hacer wrap a cada bolsillo y no siempre esten los movimientos porque cuando ya llevo varios empieza a hacer largo esa pantalla". Each pocket can collapse/expand its movements independently, so the page stays short.

## Tasks

- [x] T1 — S3 — inline — collapsible movements per pocket (`PocketRecentMovements`), collapsed by default, independent per pocket.
- [x] T2 — S2 — inline — shared `MoneyInput` (integer COP, caret-preserving) replacing all 18 money fields in 7 screens.
- [x] T3 — S1 — worker — Spanish server error messages at the source (codes and statuses unchanged), plus Spanish client transport fallback.

## Log

- L1 — User (original request, after the agreed backlog order): "Si me parece y creeria que los arreglos pequeños los podemos hacer de una, no?"
- L2 — Exploration: 18 money inputs, no shared input component, 6 page test files type into money fields; server errors are English across all modules with 17 test files asserting exact strings; pockets render movements unconditionally at `PocketsPage.tsx:471`, `TemplatePage.tsx` already uses controlled `<details>` per category.
- L3 — User decision on money format: "Solo pesos enteros".
- L4 — T2 consequences of "Solo pesos enteros": "Usar máximo disponible" truncates cents (500.25 -> $ 500); stored amounts with cents load truncated when edited; guided split hint now says whole pesos; native min/max on money inputs removed, server validation applies.
- L5 — Slice boundary: T1+T2 (commits e9b05ec, 9fb4630) reached ~470 authored lines; T3 starts a second reviewable slice on the same branch.
- L6 — T3 verified: server 354/354 against dev (DATABASE_URL override; guided-closure PostgreSQL tests in disposable schema guided_closure_t1_check, dropped after), client 287/287, client and server tsc clean. Persisted strings, health contract and log-only/invariant strings intentionally left in English. Found active .env on personal profile: guarded tests refused, migration tests used random schemas and left none behind.
- L7 — Independent gentle-ai-verify unavailable after 3 user-requested attempts, 0 tests run each time: (1) tar scratch copy could not recreate pnpm symlinks; (2) prepared worktree rejected because the verifier requires its own fresh isolation; (3) the verifier is not allowed to run git worktree or dependency installation. Static review passed in all attempts (codes/statuses unchanged, no client branching on messages, persisted strings unchanged). Parent-run evidence only: server 354/354 on dev, client 287/287, build, 4 e2e, tsc clean. User said: "no pushee hasta que este ok".
- L8 — Closure, user disposition: "si cerremos". Accepted parent-run evidence in place of the unavailable independent verification. PR #228 (base `dev`) open with Client checks, Server checks and Branch release readiness passing; merge stays with the user. An unrelated uncommitted `prisma/schema.prisma` change (backfill control models) was discarded at the user's request: "descartemos".
