# Judgment Day Review Ledger

## Round 0 — Design Review

| ID | Lens | Location | Severity | Status | Evidence |
|---|---|---|---|---|---|
| JD-A-001 | judgment-day | `design.md:16,29-31,52,66-78` | CRITICAL | fixed | Closure now makes reconciled month-level remaining money authoritative. Positive category variance stays visible but is informational, non-transferable, and non-blocking; RED-first numeric and active-to-closed tests are defined. |
| JD-B-001 | judgment-day | `design.md:16,29-31,66-78`; `spec.md:86-100` | BLOCKER | fixed | The design and spec now require successful closure for income 10,000, uncategorized spending 10,000, and preserved category surplus 10,000 when month remaining money is zero. |
| JD-B-002 | judgment-day | `design.md:7,17,21-31,47-52,59-78` | CRITICAL | verified | Both blind judges confirmed that close and every existing-month mutator acquire the same transaction-scoped PostgreSQL `FOR UPDATE` lock before rereading status or writing. The two lock orders serialize correctly, and deterministic real-PostgreSQL barrier tests cover the complete mutator matrix. |

## Convergence

- **Fixed in Round 1**: JD-A-001 and JD-B-001.
- **Fixed in Round 2**: JD-B-002 has an explicit atomic row-lock strategy and deterministic concurrency proof plan.
- **Round 2 state**: approved by both blind judges.
- **Final judgment**: APPROVED.

## Work Unit 1 — Apply Review, Round 0

| ID | Lens | Location | Severity | Status | Evidence |
|---|---|---|---|---|---|
| JD-WU1-001 | judgment-day | `monthly-cycle-prisma-concurrency.integration.test.ts:69-146` | CRITICAL | open | Real PostgreSQL confirmed a production-path defect: writer index 3 reaches and blocks on the Month lock, then leaks Prisma `P2010` instead of the required `MONTH_NOT_ACTIVE`; writers 4–15 never execute. Both final judges confirmed the defect. |
| JD-WU1-002 | judgment-day | `movement-use-cases.ts:42-51`; `movement-service.ts:130-136` | CRITICAL | open | Suspect/contradiction: Judge B classified deposit prevalidation before the Month lock as CRITICAL; Judge A classified the same behavior as WARNING because writes remain prevented. Requires scoped re-judgment, not automatic fixing. |
| JD-WU1-003 | judgment-day | `month-lifecycle-service.ts:94-95`; `lifecycle-use-cases.test.ts:60-89,172` | CRITICAL | verified | Both final judges confirmed the lifecycle transaction fake implements `lockForMutation(monthId): Promise<MonthRecord>` and requires lock-before-close. The lifecycle test passes 3/3 and the focused Work Unit 1 suite passes 46/46. |
| JD-WU1-004 | judgment-day | `shared/month-queries.ts:1,21-23` | WARNING | info | Judge B reported persistence query construction outside `infrastructure/**`; Judge A found no user-impacting architecture defect. |
| R4-001 | resilience | `apply-progress.md:30-31` | WARNING | info | The reused local database has schema drift for backfill tables. Current lock evidence remains valid and CI uses Node 22, but local migration setup is not reproducible until drift is resolved safely. |

### Work Unit 1 convergence

- **Runtime-confirmed after Round 2**: JD-WU1-001 remains open because writer index 3 leaks Prisma `P2010` after lock serialization instead of returning `MONTH_NOT_ACTIVE`; writers 4–15 remain unverified.
- **Verified in Round 2**: JD-WU1-003.
- **Suspect/contradiction**: JD-WU1-002 remains disputed.
- **Informational only**: JD-WU1-004 and R4-001.
- **Round 2 judgment**: ESCALATED; the convergence budget is exhausted and real PostgreSQL confirms JD-WU1-001.
- **Final judgment**: ESCALATED.
