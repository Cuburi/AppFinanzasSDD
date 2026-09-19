```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:b976d6ce6e46ee581a4c8bcf350620c139b6cac5e9e0f86fb7f9034ef9081190
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 5/5
scenarios: 12/12
test_command: "pnpm --dir server test"
test_exit_code: 0
test_output_hash: sha256:ae103b98c7f40dc3a1ea08a4c01bb9bbca659066e356f311745dca4e298560b7
build_command: "pnpm --dir server build"
build_exit_code: 0
build_output_hash: sha256:35f9c079c023b521d8cf148ef4bf371460aceb32b8a65f9e345c4d4d8eba6a46
```

## Verification Report

**Change**: `uncategorized-expense-recording`  
**Version**: N/A  
**Mode**: Standard (Strict TDD inactive)  
**Persistence**: Hybrid (OpenSpec + Engram)  
**Work unit**: `final-independent-verification`

### Executive Summary

PASS WITH WARNINGS. The fresh remediated PostgreSQL concurrency harness passed all 6 tests, including the close-first matrix over all 16 existing-month mutators, preserved failure-detail aggregation, row-count and error-code assertions, and cleanup. The full server suite passed 313/313, the server build passed, the client check passed 202/202 plus TypeScript and production build, and repository diff integrity passed. A maintainer-required manual development-environment check remains mandatory after this automated verification and before archive; this verifier did not archive.

### Completeness

| Metric | Value |
|---|---:|
| Native requirements | 5 |
| Native scenarios | 12 |
| Tasks total | 16 |
| Tasks complete | 16 |
| Tasks incomplete | 0 |
| Requirements compliant | 5/5 |
| Scenarios compliant | 12/12 |

### Build & Tests Execution

Output hashes are SHA-256 over each command's merged output normalized as UTF-8 with LF line endings and one final LF.

| Check | Command | Exit | Output hash | Result |
|---|---|---:|---|---|
| PostgreSQL concurrency matrix | `pnpm --dir server exec node --import tsx --test "src/modules/monthly-cycle/infrastructure/prisma/monthly-cycle-prisma-concurrency.integration.test.ts"` | 0 | `sha256:d20bd598c97b03526873281ee8cb5644be10c50b8c290dd450843af6082f8c01` | ✅ 6/6 passed; close-first covered all 16 mutators and cleanup aggregation; expense-first, rollback, retry, and ledger isolation passed |
| Full server suite | `pnpm --dir server test` | 0 | `sha256:ae103b98c7f40dc3a1ea08a4c01bb9bbca659066e356f311745dca4e298560b7` | ✅ 313/313 passed, 0 failed, 0 skipped |
| Server build | `pnpm --dir server build` | 0 | `sha256:35f9c079c023b521d8cf148ef4bf371460aceb32b8a65f9e345c4d4d8eba6a46` | ✅ TypeScript compilation, Prisma generated-file copy, and packaged Prisma verification passed |
| Client check | `pnpm --dir client check` | 0 | `sha256:dda04adcd8e937fe0dc73fee29beee4ee1c78517c0ad8bbcf4a34c77b706a11a` | ✅ 24/24 files and 202/202 tests passed; TypeScript and Vite production build passed |
| Repository diff integrity | `git diff --check` | 0 | `sha256:11311124af477b8995772de3f5d3e30d689558ddf25726da442eea6b399ca9c6` | ✅ Passed; existing LF-to-CRLF warnings only |

**Coverage**: ➖ Not available; no coverage command is configured.  
**Runtime**: Node `v24.14.1`; the repository declares Node `22.x`. pnpm `11.1.2` matches the package-manager declaration.  
**Database prerequisite**: Docker service `postgres-dev` was `running healthy`; `pg_isready` reported accepting connections.

### Spec Compliance Matrix

| Requirement | Scenario | Passing runtime evidence in this run | Result |
|---|---|---|---|
| Nullable and atomic expense classification | Record an uncategorized expense | `expenses.dto.test.ts`; `movement-use-cases.test.ts`; `ActiveMonthPage.test.tsx` | ✅ COMPLIANT |
| Nullable and atomic expense classification | Reject partial classification | The transport accepts only nullable `sourceSubcategoryId`, derives category from the snapshot, and runtime tests passed both nullable and categorized branches plus paired history projection | ✅ COMPLIANT |
| Nullable and atomic expense classification | Preserve categorized compatibility | Categorized movement, history, module-service, route, and client tests passed | ✅ COMPLIANT |
| Include uncategorized expenses in financial results | Aggregate an uncategorized expense | Balance, closure, report, ledger, module-service, and client report tests passed | ✅ COMPLIANT |
| Include uncategorized expenses in financial results | Empty uncategorized result | Prisma adapter, report, module-service, and API tests passed | ✅ COMPLIANT |
| Explicit uncategorized history filtering and presentation | Filter only uncategorized expenses | DTO, Prisma adapter, expense-history, API serialization, and client tests passed | ✅ COMPLIANT |
| Explicit uncategorized history filtering and presentation | Read nullable data safely | Expense-history, ledger, report, mapper, and client label tests passed | ✅ COMPLIANT |
| Active-month categorization and closed-month immutability | Categorize during an active month | Movement use-case and module-service tests passed | ✅ COMPLIANT |
| Active-month categorization and closed-month immutability | Reject reclassification after close | Movement, module-service integration, closed-control, and 16-mutator PostgreSQL matrix tests passed | ✅ COMPLIANT |
| Active-month categorization and closed-month immutability | Preserve closed-month reads | Ledger, history, report, and module-service integration tests passed | ✅ COMPLIANT |
| Month-level authority during closure | Close with uncategorized spending and surplus variance | Closure and module-service tests passed | ✅ COMPLIANT |
| Month-level authority during closure | Present variance without cash semantics | Closure and `CloseMonthPage.test.tsx` tests passed with no transfer action | ✅ COMPLIANT |

**Compliance summary**: 12/12 scenarios compliant across 5/5 requirements.

### PostgreSQL Concurrency and Lock-Observation Evidence

| Evidence | Result |
|---|---|
| Close-first lock observation | ✅ Writer-PID-scoped polling observed each competing transaction blocked on the held `Month` row lock |
| Existing-month mutator matrix | ✅ 16/16 writers passed |
| Closed-month outcome | ✅ Each writer observed `MONTH_NOT_ACTIVE` with HTTP 409 after close |
| Persistence invariants | ✅ Each fixture retained closed status, one movement row, and one income row |
| Failure-detail preservation | ✅ Injected writer and cleanup failures were aggregated with names and messages after all 16 writers executed |
| Expense-first ordering | ✅ Close reread the committed expense and rejected invalid closure while leaving the month active |
| Matrix cleanup | ✅ All 16 cleanup outcomes passed |

### Correctness (Static Evidence)

| Requirement / boundary | Status | Evidence |
|---|---|---|
| Nullable classification and persistence | ✅ Implemented | DTO, application ports/use cases, Prisma adapter, and read projections preserve null without synthetic nodes |
| Atomic public classification | ✅ Implemented | The write contract carries only `sourceSubcategoryId`; category is derived from the owning month snapshot, while read models emit either both category/subcategory values or both null |
| Explicit uncategorized filtering | ✅ Implemented | `classification=UNCATEGORIZED` maps to `sourceSubcategoryId: null` only in the Prisma adapter |
| Truthful totals and closure authority | ✅ Implemented | Uncategorized spending affects month money once; positive category variance remains informational and non-transferable |
| Active-only mutations | ✅ Implemented | Existing-month writers and close use transaction-scoped `lockMutableMonthForMutation` before evaluating mutable state |
| Roadmap order | ✅ Implemented | RM-026 precedes RM-012 with recorded decision history |

### Coherence (Design and Architecture Guards)

| Decision | Followed? | Notes |
|---|---|---|
| Store nullable `sourceSubcategoryId` | ✅ Yes | No synthetic category or migration was introduced |
| Serialize mutators on the owning `Month` row | ✅ Yes | Infrastructure uses parameterized `SELECT ... FOR UPDATE`; fresh PostgreSQL runtime evidence passed |
| Keep Prisma inside infrastructure | ✅ Yes | Architecture tests passed; application/shared contracts do not import Prisma-generated types |
| Keep behavior in use cases/workflows | ✅ Yes | Lock-first orchestration and classification/closure behavior remain outside routes and mappers |
| Keep module/service composition wiring-only | ✅ Yes | Module architecture assertions passed and no service shim was reintroduced |
| Preserve calculation boundaries | ✅ Yes | Existing balance and cash-ledger calculations remain isolated; behavior is expressed through use cases and mappers |

### Runtime Attempt and Evidence

| Field | Exact value |
|---|---|
| Acquired token | `sha256:b5aa314e1870239d1e094200737fbe4ab2431a79c37a49a1b3d636700e7097c8` |
| Acquisition action | None; the clean attempt was already acquired and was not reacquired |
| Initial candidate identity | `sha256:942fd20dee1480439f1214e555d6e51ed9d25e5ff42f1c7001f40f6621bb7dbc` |
| Initial candidate tree | `492c3c71fabc83517becbd4ddc7b3fa677a36c2f` |
| Fresh evidence revision | `sha256:b976d6ce6e46ee581a4c8bcf350620c139b6cac5e9e0f86fb7f9034ef9081190` |
| Evidence manifest | Candidate identity/tree, attempt token, authoritative counts, command exits/output hashes, cleanup/process audit, and excluded-untracked inventory digest |
| Harness disposition | `reused`; the remediated lock-observation harness passed without verification-time code changes |
| Changed production/test code | None |

### Cleanup and Process Evidence

| Check | Result |
|---|---|
| Post-harness RM-026 fixture audit | `{"rm026Categories":0,"rm026Pockets":0,"rm026Incomes":0}`; audit exited 0 |
| Post-harness process audit | `integration_harness_processes=0` |
| Eligible untracked inventory | `sha256:e8ab9bbbdd30d4f104122a77e274121a88e72c8effa172090efd2fd59f7b1929` preserved and excluded |
| Prohibited repository operations | None performed: no edit to excluded files, stage, delete, rename, clean, reset, commit, push, PR, or archive |

### Persistence and Native Settlement Handoff

- These exact candidate bytes must pass `gentle-ai sdd-verify-validate --requirements 5 --scenarios 12` before any OpenSpec or Engram persistence.
- After admission, these exact bytes are the canonical OpenSpec and Engram hybrid artifact.
- Native settlement must occur exactly once after canonical report persistence, using the pre-acquired token, a fresh request ID, outcome `passed`, this report's evidence revision, harness disposition `reused`, and the excluded untracked inventory digest.
- The actual validator, persistence, and settlement outcomes are returned in the phase Result Contract because settlement occurs after this report is immutably admitted and persisted.

### Issues Found

**CRITICAL**: None.

**WARNING**

1. Verification ran on Node `v24.14.1` rather than the repository-declared Node `22.x`.
2. A maintainer-required manual development-environment check remains pending and MUST pass before archive.
3. No coverage script is configured, so an independent coverage percentage was unavailable.

**SUGGESTION**: Perform the required manual development-environment check next, recording its outcome without altering this automated verification evidence.

### Verdict

**PASS WITH WARNINGS**

All 5 requirements and 12 scenarios have fresh passing runtime coverage, including the remediated real-PostgreSQL lock matrix. Archive remains prohibited until the maintainer-required manual development-environment check passes.
