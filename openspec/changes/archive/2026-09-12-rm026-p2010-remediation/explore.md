# Exploration: RM-026 Work Unit 1 Prisma `P2010` concurrency failure

## Status

Confirmed against the real PostgreSQL dev profile on 2026-09-01. This is a corrective investigation only; no runtime, test, schema, or migration files were changed.

## Current State

The failing writer is **writer index 3**, `createMovementUseCases(ports).depositToPocket(...)` (the strict deposit use case), not the legacy movement-service deposit at index 3. The adjacent index 4 is the legacy/strict-deposit compatibility path.

The strict path uses `transactionRunner.runSerializable` and performs `months.lockForMutation` after validating the pocket. `lockForMutation` executes a parameterized `SELECT "id" FROM "Month" WHERE "id" = $1 FOR UPDATE`, then rereads the complete month aggregate. The close-first test proves the writer reaches the lock and waits behind close. After close commits, the writer does not reach the post-lock `MONTH_NOT_ACTIVE` check: Prisma rejects the raw lock statement as `P2010`.

The focused reproduction command was:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/appfinanzas_dev?schema=public pnpm --dir server exec tsx --test src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts
```

Observed result: 3/4 tests pass; the close-first matrix fails at line 143, with actual code `P2010` and expected `MONTH_NOT_ACTIVE`.

## Root Cause Assessment

The defect is at the **transaction/isolation and error-classification boundary**, specifically the combination of the strict deposit's Serializable transaction and a row-lock wait whose transaction snapshot becomes invalid while close commits. The failure occurs in the raw `FOR UPDATE` lock query, before the adapter's post-lock reread and before the domain status check. It is therefore not a mutator SQL defect, parameter/result typing defect, or a failed post-lock reread.

The observed Prisma surface is `P2010` (raw query failure). PostgreSQL diagnostic metadata should be captured from the error's safe `meta` fields (`code`, `message`, and constraint/table/column fields when present), but the current assertion only preserves `reason.code`; it does not print the nested metadata. A file-based diagnostic harness was authorized and executed with bounded timeout, parameterized SQL, synthetic fixture cleanup, and sanitized output. Its reduced lock-only reproduction completed successfully rather than producing the incident; it therefore captured no nested error metadata. Consequently, SQLSTATE `40001` remains a hypothesis, not confirmed evidence. Do not translate every `P2010`: raw-query failures can represent genuine SQL defects.

Because the failure is raised before `movements.create`, the transaction rolls back and no deposit is written. The existing matrix's row-count assertions and the isolated reproduction support “infrastructure error leak only,” not a write-after-close or data-corruption finding.

## Why Writers 4–15 Are Skipped

The `for` loop awaits each writer and asserts immediately. The rejection at writer 3 aborts the test body, so later factories never execute. This is a test-collection control-flow defect, not evidence that later mutators pass or fail. A safe matrix continuation should isolate each case with its own fixture and `try/finally`, record normalized outcomes plus row counts, release the close barrier on every path, and report all failures after the loop. It must not suppress transaction cleanup or turn unknown errors into `MONTH_NOT_ACTIVE`.

## Related and Pre-existing Failures

The focused concurrency file passes its other three tests, including expense-first ordering and strict-deposit rollback. The full server suite/build also has known failures unrelated to this specific root cause: transaction fakes lacking `$queryRaw`, the existing shared-layer Prisma-import architecture assertion, and the matrix mismatch itself. These must remain separately labeled; they are not proof that the lock query is incorrect in production.

## Affected Areas

- `server/src/modules/monthly-cycle/application/use-cases/movement-use-cases.ts` — writer index 3 selects the strict Serializable deposit path.
- `server/src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-adapters.ts` — transaction runner uses Serializable isolation and retries only `P2034`; lock adapter issues raw `FOR UPDATE`.
- `server/src/modules/monthly-cycle/shared/month-queries.ts` — lock SQL and domain `MONTH_NOT_ACTIVE` assertion boundary.
- `server/src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts` — reproducer, writer ordering, and fail-fast loop.
- `openspec/changes/uncategorized-expense-recording/{design.md,review-ledger.md,apply-progress.md,verify-report.md}` — existing RM-026 evidence and open finding.

## Remediation Options

1. **Handle the narrowly identified serialization SQLSTATE at the transaction runner** — classify only a confirmed PostgreSQL `40001`/serialization conflict from this lock boundary, then retry or map it to the domain outcome required by the concurrency contract.
   - Pros: preserves genuine `P2010` errors; keeps infrastructure translation centralized; smallest production surface.
   - Cons: requires reliable nested Prisma metadata detection and a regression test for the exact real-PostgreSQL failure.
   - Effort: Medium.

2. **Use the normal read-committed transaction for closed-month mutators, retaining Serializable only where its invariant is required** — strict deposit would serialize through the row lock and then reread `CLOSED`.
   - Pros: aligns this lock protocol with the other mutators and avoids this snapshot failure mode.
   - Cons: changes concurrency guarantees for deposit funds; may reintroduce a different write-conflict race unless the balance invariant is protected by the lock and tests prove it.
   - Effort: Medium.

3. **Make the matrix collect all writers before asserting** — test-only remediation, required regardless of runtime fix.
   - Pros: exposes all unverified mutators and prevents one failure from hiding later regressions.
   - Cons: does not fix production behavior; cleanup and error normalization must be implemented carefully.
   - Effort: Low.

Blanket `P2010 -> MONTH_NOT_ACTIVE` translation is explicitly rejected. It could hide malformed SQL, missing relations, permission errors, invalid casts, and other real infrastructure defects. Any translation must require confirmed SQLSTATE/context and preserve unknown metadata for diagnosis.

## Recommendation

An exact strict-use-case file harness was attempted with the reliability-audited balanced fixture and boundary instrumentation, but the temporary harness had a syntax/transform error before execution. It produced no Prisma metadata and no runtime evidence; the temporary file was removed. The prior real integration result remains the only runtime evidence. The next step remains a valid exact strict diagnostic to confirm nested SQLSTATE and statement metadata. Then prefer a narrowly scoped serialization-aware transaction strategy (option 1 if the lock failure is confirmed as `40001`; option 2 only if Serializable is not required by the deposit invariant). Independently change the matrix to collect writers 4–15 safely, with per-case cleanup and post-run assertions. The remaining writers were not run individually in this session.

## Architecture Guard Result

PASS. The likely remediation belongs at the transaction runner/Prisma infrastructure boundary and in the integration test. No route, module composition root, service contract, DTO, mapper, or application port needs to import Prisma or absorb infrastructure behavior. `monthly-cycle/service.ts` remains wiring-only.

## Fresh Diagnostic Evidence — 2026-09-01

The existing close-first integration test was temporarily filtered by an environment variable to writer index 3 only and instrumented at the test boundary. The diagnostic was run against the real `appfinanzas_dev` PostgreSQL profile with the existing barriers and cleanup, then all temporary tracing and filtering was removed. No production, schema, migration, or durable test changes remain.

Sanitized event sequence:

```text
transaction:start attempt=1
prevalidation:start
prevalidation:success
lock:attempt
transaction:rollback attempt=1 class=PrismaClientKnownRequestError code=P2010 meta.code=40001 meta.message="could not serialize access due to concurrent update"
```

The failing boundary is the raw `FOR UPDATE` lock statement: there is no lock-acquired event, month reread, pocket update, or movement-create event. `P2010` therefore wraps PostgreSQL SQLSTATE `40001`, not an unknown raw SQL failure. The existing post-failure assertions confirm the month remains `CLOSED` and the movement count remains unchanged; no pocket balance mutation is possible because movement creation was not reached. The transaction rolled back on attempt 1.

## Recommendation

Proceed to proposal/design for a narrowly scoped infrastructure transaction strategy that handles only this confirmed `P2010` + nested SQLSTATE `40001` serialization condition, while preserving unknown `P2010` failures. Keep the smallest strict-deposit real-PostgreSQL RED regression and separately improve the matrix to collect all writers with per-case cleanup.

## Ready for Proposal

Yes. The exact failing statement/boundary and nested SQLSTATE are now confirmed. Proposal/design should scope the infrastructure-only runtime behavior, focused strict-deposit regression, and safe matrix continuation; it must not blanket-translate `P2010`.
