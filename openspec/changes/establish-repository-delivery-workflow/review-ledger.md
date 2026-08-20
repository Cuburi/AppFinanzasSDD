# Review Ledger: Establish Repository Delivery Workflow

> Historical review evidence below records the prior automated-governance design. The active scope is the authorized solo-maintainer simplification at the end of this ledger; historical special-governance conclusions do not describe a remaining implementation requirement.

## Judgment Day — Design, Round 2

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| JD-A-001 | judgment-day | `design.md:12,31` | CRITICAL | info | Single-judge suspect: the PR-controlled workflow definition may weaken its own governance job despite checking out base-SHA validator code. |
| JD-A-002 | judgment-day | prior `design.md:13,46-49,65` | CRITICAL | superseded | The App-only design deadlocked because its sole merge actor had `contents: read`. The explicit maintainer decision replaces App merge authority with manual merge after required checks and final verification; no bot receives `Contents: write`. |
| JD-A-003 | judgment-day | prior `design.md:17,47-49` | CRITICAL | verified | Shared token-bound host lock covers backup, reset, restore, and destructive operations; complete source fingerprint and lease are checked before/after export. |
| JD-A-004 | judgment-day | prior `design.md:57` | CRITICAL | info | Single-judge suspect: rollback may remove the approved-Issue gate without a defined compensating control. |
| JD-B-001 | judgment-day | prior `design.md:13,46-49,65` | CRITICAL | superseded | The confirmed insufficient-App-permission blocker no longer applies because the App is neither merge authority nor required. Manual merge deliberately accepts and documents the non-atomic Issue/check/click window. |
| JD-B-002 | judgment-day | prior `design.md:31-37,47-57` | CRITICAL | info | Single-judge suspect: promotion evidence is documented but not enforced by a required check or mandatory approval. |
| JD-B-003 | judgment-day | prior `design.md:17,47-49` | CRITICAL | verified | A single lease-token protocol serializes all production operations and rejects drift or lease loss before successful backup publication. |

## Maintainer Decision Revision

- Merge authority is the maintainer through GitHub's manual Merge control; auto-merge and merge queue remain disabled.
- Automation validates and supplies required checks but has no repository Contents write permission.
- Final verification covers current Issue approval/open state, the immutable tip-commit Issue trailer, current head SHA, and green required checks.
- GitHub cannot make mutable Issue metadata and a manual merge click cross-resource atomic; this residual race is retained as an explicit risk, not represented as solved.

## Convergence

- Verified group retained: `JD-A-003/JD-B-003`.
- Superseded blocker: `JD-A-002/JD-B-001`.
- Single-judge suspects retained as information: `JD-A-001`, `JD-A-004`, `JD-B-002`.
- Fix rounds used: 2 of 2; this authorized maintainer-decision revision occurs after escalation.
- Judgment: revision unblocks task planning subject to normal SDD task review and the documented residual manual-merge race.

## Judgment Day — Manual-Merge Revision, Round 1

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| MM-JD-A-001 | judgment-day | `design.md:13,43-47` | CRITICAL | info | Single-judge suspect: the tip-commit Issue trailer does not yet define how a `dev → master` promotion obtains the correct promotion Issue identity. |
| MM-JD-A-002 | judgment-day | `design.md:46-51` | CRITICAL | verified | Both final judges verified that the platform-token-only check runs trusted default-branch `master` workflow/validator code, never PR-controlled code, and binds fail-closed output to the current head SHA. |
| MM-JD-B-004 | judgment-day | `design.md:46-51` | CRITICAL | verified | Both final judges verified the non-circular maintenance path: the existing trusted `master` version evaluates governance changes and a merged successor governs only later PRs. |
| MM-JD-B-005 | judgment-day | `design.md:37,45-47,57` | CRITICAL | info | Single-judge suspect: final promotion verification omits mandatory migration, backup, smoke, rollback, and external-setting evidence. |
| MM-JD-B-006 | judgment-day | `design.md:15,35-37,49` | CRITICAL | info | Single-judge suspect: the design must explicitly replace the existing reset-specific lock with the shared production-operation lock. |

### Manual-Merge Revision Convergence

- Confirmed blocker addressed in Final Fix Round 2: `MM-JD-A-002/MM-JD-B-004`.
- Single-judge suspects retained as information: `MM-JD-A-001`, `MM-JD-B-005`, `MM-JD-B-006`.
- Fix rounds used: 2 of 2 for this materially revised design.
- Judgment: APPROVED. Both blind judges verified the final trusted integrity boundary with no touched-line regressions.

## Judgment Day — Apply PR Slice 1, Round 1

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| JD-A-001 | judgment-day | historical `.github/workflows/ci.yml:23-49` | BLOCKER | superseded | Historical executable-workflow finding: the PR-controlled governance job was removed by the authorized solo-maintainer simplification; reassess hardening before write access expands. |
| JD-A-002 | judgment-day | historical `scripts/check-pr-governance.mjs:25-63` | CRITICAL | superseded | Historical executable-code finding: the source/ancestry validator was removed by the authorized solo-maintainer simplification. |
| JD-A-003 | judgment-day | historical `scripts/check-pr-governance.mjs:6-10` | WARNING | info | Historical warning: the removed Approved-Issue trailer validator could disagree with Git trailer tooling; superseded by removal while the canonical WARNING status remains `info`. |
| JD-B-001 | judgment-day | historical `scripts/check-pr-governance.mjs:6-19` | CRITICAL | superseded | Historical executable-code finding: duplicate Approved-Issue validation was removed by the authorized solo-maintainer simplification. |

### Apply PR Slice 1 Convergence

- Confirmed by dual adversarial review: `JD-A-001`, `JD-A-002`, and `JD-B-001` require correction before this slice is accepted.
- Informational warning retained without fix-loop status: `JD-A-003`.
- Fix rounds used: 1 of 2.
- Judgment: APPROVED WITH ACCEPTED RISK. Round 1 verified `JD-B-001`; the sole maintainer accepted `JD-A-001` and `JD-A-002` as `wont-fix` until repository write access is granted to collaborators.

### Maintainer Risk Acceptance

- Current operating assumption: one trusted maintainer with repository write access.
- The PR-governance check prevents accidental policy violations but is not represented as tamper-resistant against a malicious writer.
- Reopen `JD-A-001` and `JD-A-002` before granting repository write access to another person or automation principal.

### Round 1 Fix Evidence

- `JD-A-001`: CI interface contract added for head SHA, base SHA, source repository, token, and tip-message derivation; the workflow checks out the exact head SHA before reading the tip commit.
- `JD-A-002`: Contract cases reject a fork-sourced `dev` promotion and a `hotfix/*` head without current-`master` ancestry; production validation uses the authenticated, read-only GitHub compare endpoint.
- `JD-B-001`: Contract case rejects a valid Issue trailer paired with a PR-valued duplicate key.
- Focused validation: `pnpm local:check-pr-governance` passed after GREEN and after REFACTOR; `git diff --check` passed.

## Judgment Day — Apply PR Slice 2, Round 1

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| PR2-JD-A-001 | judgment-day | historical `.github/workflows/trusted-pr-governance.yml:21-58` | CRITICAL | superseded | Historical evidence retained: judges disputed native-check head-SHA semantics. The special workflow and check are removed under the authorized solo-maintainer simplification, so there is no special check to correct. |
| PR2-JD-B-001 | judgment-day | historical `.github/workflows/trusted-pr-governance.yml:41-58` | CRITICAL | superseded | Historical evidence retained: current metadata parsing was verified. The metadata gate is removed because Approved-Issue is now a manual convention. |
| PR2-JD-B-002 | judgment-day | historical `.github/workflows/trusted-pr-governance.yml:16-58` | CRITICAL | superseded | Historical evidence retained: judges disputed special-check freshness. The special workflow and custom/native governance check are removed. |
| PR2-JD-B-003 | judgment-day | historical `.github/workflows/trusted-pr-governance.yml:57-82` | WARNING | info | Historical warning: special-check summary audit detail is superseded because the special check is removed; the canonical WARNING status remains `info`. |

### Apply PR Slice 2 Convergence

- Historical dual-review evidence is retained for audit only.
- All PR2 special-check findings are superseded by the authorized removal of the trusted workflow, metadata gate, and special required-check design.
- Judgment: no further special-governance remediation is required for the solo-maintainer workflow. Reopen hardening as a new change before repository write access expands.

## Authorized Solo-Maintainer Scope Simplification

- Keep Issue forms, the simple PR template, ordinary CI, manual merges toward `dev`, and manual `dev` → `master` promotion.
- Remove trusted PR-governance automation, Approved-Issue API/trailer enforcement, ancestry validation, and custom/native special governance required-check design.
- Approved-Issue remains a checklist convention rather than an automated merge barrier.
- Production recovery findings and work are unaffected. Final procedures must document the deferred hardening trigger; no external GitHub settings are changed in this scope.

## Judgment Day — Solo-Maintainer Simplification, Round 1

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| SIM-JD-A-001 | judgment-day | `.github/pull_request_template.md:1-4` | BLOCKER | verified | Both scoped judges verified the intentional manual checklist uses the exact `Approved issue` capitalization and both focused contracts pass. |
| SIM-JD-A-002 | judgment-day | `.github/workflows/ci.yml:17-39` | BLOCKER | verified | Both scoped judges verified the obsolete governance job/reference is absent while Branch release readiness, Server, and Client CI jobs remain. |
| SIM-JD-A-003 | judgment-day | simplification diff | WARNING | info | The combined dirty-worktree scope exceeds the 400-line review budget; keep the actual simplification commit isolated from historical/planning churn or record an explicit exception. |
| SIM-JD-B-002 | judgment-day | `review-ledger.md:53-85` | CRITICAL | verified | Both scoped judges verified removed-governance executable findings are historical and superseded while retaining intelligible evidence. |
| SIM-JD-B-003 | judgment-day | `review-ledger.md:85` | WARNING | info | Ledger consistency correction retained the canonical WARNING status `info`; supersession is encoded in the evidence. |

### Solo-Maintainer Simplification Convergence

- Confirmed blocker fixed: `SIM-JD-A-002`.
- Single-judge suspects triaged and fixed: `SIM-JD-A-001`, `SIM-JD-B-002`.
- Informational warnings: `SIM-JD-A-003`, `SIM-JD-B-003` (both remain `info`).
- Fix rounds used: 1 of 2.
- Re-judgment: both blind judges verified all fix-driven findings with no touched-line regressions.
- Judgment: APPROVED.
