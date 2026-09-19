# Reset ergonomics and safety

## Objective

Make local database resets simple, predictable, and safe for disposable development data while preserving stricter protection for personal data.

## Problem

The current guarded reset flow is intentionally conservative, but previous work found that a healthy dev Docker service can still fail reset target discovery or marker validation. This creates friction for routine dev recovery and makes the safest path unclear.

A live personal reset attempt also found a documentation ergonomics blocker: the README showed `pnpm db:personal:reset -- --confirm RESET_APPFINANZAS_PERSONAL --profile appfinanzas_personal`, and pnpm 11 passed the separator `--` as a literal first argument to the Node guard. The guard correctly rejected that extra argument before mutation. The documented package-script command must omit the separator while the guard itself must keep rejecting any leading `--` or extra arguments.

## Why now

RM-026 exposed reset workflow friction during local validation. The project has moved to ODD for normal work, and this is the first dedicated ODD follow-up instead of mixing reset changes into unrelated feature delivery.

## Scope

- Characterize the existing reset behavior for dev and personal profiles.
- Improve the dev reset path only where it is safe for disposable local data.
- Preserve personal reset confirmation and profile guard strictness.
- Keep documentation, scripts, and contract tests aligned.
- Preserve existing `openspec/` artifacts as historical/reference material; do not create new SDD artifacts for this work.

## Non-goals

- Production backup/restore or disaster recovery.
- Automatic personal-data reset relaxation.
- Cross-checkout/global Docker-daemon locking beyond the current documented limitations.
- Reworking unrelated monthly-cycle feature changes currently present in the worktree.

## Constraints

- Do not run destructive reset commands without an explicit user confirmation that the target data is disposable.
- Do not touch unrelated dirty work in client/server/OpenSpec feature areas.
- Treat `.env` and `.env*.example` contents as sensitive unless explicitly needed and allowed.
- Keep personal reset stricter than dev reset unless the user separately authorizes a product decision. The user has now explicitly authorized a narrow policy change: an existing unmarked local personal target may reset only with exact confirmation and full identity proof; missing personal targets still must not bootstrap.

## Current evidence

Read-only scout reported these relevant files:

- `package.json`
- `docker-compose.yml`
- `scripts/reset-local-database.mjs`
- `scripts/reset-dev-database.mjs`
- `scripts/guard-personal-reset.mjs`
- `scripts/reset-dev-database.test.mjs`
- `scripts/use-env-profile.mjs`
- `scripts/run-prisma-with-profile.mjs`
- `scripts/check-personal-reset-guard.mjs`
- `scripts/check-local-env-example.mjs`
- `README.md`
- `.github/workflows/ci.yml`
- `openspec/specs/personal-production-recovery/spec.md`
- `docs/product/roadmap.md`

Known likely blockers:

- Healthy dev containers can be rejected when the DB cluster lacks the expected reset marker.
- The current reset flow can reset previously marked targets but has no dev-only bootstrap path for fresh or legacy unmarked dev volumes.
- Any ambient `COMPOSE_*` variable blocks preflight.
- Compose project-name/default-cwd assumptions can make `docker compose ps` target discovery brittle.
- Root `.env` must already point to the selected local profile.
- Personal reset uses exact ordered confirmation and must stay strict.

## Supported reset states

| State | Dev reset target behavior | Personal reset target behavior | Rationale |
| --- | --- | --- | --- |
| No target container and no known target volume | Allowed to bootstrap/recreate dev after profile and Compose preflight prove the selected target is local dev. | Rejected; no automatic bootstrap. | Dev data is disposable; personal data must not be inferred from absence. |
| Healthy or stopped marked dev volume/container | Allowed to reset after the existing marker, owner, fingerprint, rendered Compose, and profile checks pass. | Not applicable. | This is the current intended happy path. |
| Healthy or stopped unmarked dev volume/container | Allowed only through a dev-specific bootstrap/recovery path if profile, service, volume name, labels, host port, database name, and sole ownership all match the dev policy. | Allowed only after exact confirmation and full local identity proof: service, project label, port, database, writable mount, volume metadata labels, and sole ownership all match the personal policy. | Dev data is disposable; personal unmarked recovery is a separately authorized exception for an existing local target, not bootstrap. |
| Marked personal volume/container | Rejected for dev reset as a marker/profile mismatch. | Allowed only with exact ordered confirmation and existing personal marker/profile checks. | Prevents accidental personal-data mutation through dev commands. |
| Mismatched marker, mismatched service/volume/port/db, multiple consumers, remote DB, or ambiguous Compose discovery | Rejected before mutation. | Rejected before mutation. | Ambiguity is unsafe for both profiles. |
| Ambient `COMPOSE_*` override | Rejected before filesystem or Docker mutation. | Rejected before filesystem or Docker mutation. | Avoids hidden target switching. |

RST-003 implemented the dev bootstrap/recovery allowance above. RST-007 implements the later authorized personal-unmarked existing-target allowance. It must not relax personal confirmation, missing-target rejection, remote-host rejection, ambiguous discovery rejection, or mismatch handling.

## Tasks

- [x] RST-001 — Characterize current reset behavior
  - Route: delegated worker for focused characterization tests; independent verifier required because native risk assessment was unavailable.
  - Acceptance:
    - Existing behavior is covered for marked dev, unmarked/missing marker, missing target discovery, mismatched marker, and personal confirmation failure.
    - Current fail-closed blocker is reproducible by contract tests before any mutation.
  - Checks:
    - `node --test scripts/reset-dev-database.test.mjs` — writer PASS, 25/25 tests.
    - `pnpm local:check-env` — writer PASS with Node engine warning: current Node v24.14.1 while package expects 22.x.
    - Independent verification: `node --test scripts/reset-dev-database.test.mjs` — PASS, 25/25 tests, no destructive commands.
  - Evidence:
    - Added tests: `dev reset planning rejects unmarked targets before mutation`, `dev reset planning rejects missing target discovery before mutation`, `dev reset planning rejects mismatched markers before mutation`.
    - Existing tests cover marked dev reset planning and exact personal reset confirmation failure.

- [x] RST-002 — Define supported reset states
  - Route: inline documentation in this ODD task document.
  - Acceptance:
    - The supported states are explicit: no container/volume, unmarked dev volume, marked dev volume, personal marked volume, mismatched marker/ambiguous states, and ambient Compose overrides.
    - Dev-only bootstrap behavior is specified separately from personal reset behavior.
    - Production recovery remains out of scope.
  - Checks:
    - Readback of updated `Supported reset states` section.

- [x] RST-003 — Implement dev-safe bootstrap or recovery path
  - Route: delegated worker for reset engine and focused tests; independent verifier required because native risk assessment was unavailable. Reopened during live Docker verification to fix Compose JSON normalization and PostgreSQL system-identifier SQL.
  - Acceptance:
    - Dev reset can recover from approved disposable dev states without weakening personal safeguards.
    - Mismatched or unsafe states still fail closed before mutation.
    - Personal reset remains exact-confirmation gated and rejects missing or unmarked targets.
    - Docker Compose `ps --format json` works with object, array, NDJSON, and empty output forms.
    - PostgreSQL system-identifier query uses valid composite-field syntax.
  - Checks:
    - `node --test scripts/reset-dev-database.test.mjs` — final writer PASS, 30/30 tests; independent verifier PASS, 30/30 tests.
    - `pnpm local:check-env` — writer PASS and independent verifier PASS with Node engine warning: current Node v24.14.1 while package expects 22.x.
    - `pnpm local:check-readme` — covered under RST-004.
  - Evidence:
    - `scripts/reset-local-database.mjs` now distinguishes marked targets, `unmarked-dev-target`, and `missing-dev-target`.
    - Dev-only recovery is gated by application profile and verified service, project, port, database, mount, volume labels, and sole ownership.
    - Missing dev target bootstrap requires absent target discovery, no known target volume, and no consumers.
    - Personal, mismatched, ambiguous, and Compose-override states remain fail-closed.
    - Live blockers fixed before final reset: single-object Compose ps output normalization and `SELECT (pg_control_system()).system_identifier`.

- [x] RST-004 — Align docs and user-facing commands
  - Route: inline README edit plus delegated contract-check update after the checker correctly rejected outdated wording; independent verifier required because native risk assessment was unavailable.
  - Acceptance:
    - README explains the safe dev reset path and the stricter personal reset path.
    - README contract check requires the new dev recovery wording and strict personal reset wording.
  - Checks:
    - `pnpm local:check-readme` — writer PASS; independent verifier PASS, both with Node engine warning: current Node v24.14.1 while package expects 22.x.
  - Evidence:
    - `README.md` now documents dev recreation/recovery for approved disposable dev targets and strict personal rejection for missing, unmarked, mismatched, ambiguous, or multi-consumer targets.
    - `scripts/check-readme-local-setup.mjs` now requires the updated reset contract snippets instead of the obsolete blanket unmarked-cluster rejection sentence.

- [x] RST-005 — Verify with live Docker under explicit approval
  - Route: parent command execution with delegated incident diagnosis/remediation for live blockers.
  - Acceptance:
    - Non-destructive inspection succeeded first.
    - Destructive dev reset was run only after explicit user confirmation, then retried after a second explicit confirmation following an after-mutation migration failure.
    - Personal isolation/reset was not run; it remains a separate explicit approval.
  - Checks:
    - `pnpm env:dev` — PASS, copied `.env.dev.example` to `.env`, with Node engine warning.
    - `docker compose config --format json` — PASS, output captured to `/tmp/appfinanzas-compose-config.json`.
    - `docker compose ps --format json postgres-dev` — PASS, dev container healthy on port 5433.
    - `pnpm db:dev:reset` — final PASS, `Dev database reset completed.`
  - Evidence:
    - Initial live reset attempt failed before mutation due to Compose ps single-object JSON parsing; fixed and verified with tests.
    - Second live reset attempt failed after mutation because reset automation invoked interactive `migrate dev`; dev DB was diagnosed healthy/marked/migrated/empty, then reset migration command was changed to guarded noninteractive `migrate deploy` and verified.
    - Final approved retry completed successfully and left `appfinanzas-postgres-dev` running healthy.

- [x] RST-006 — Fix documented personal reset package-script invocation
  - Route: focused docs/check/test update after a live personal reset attempt failed before mutation.
  - Acceptance:
    - README personal reset examples omit the extra pnpm `--` separator.
    - README contract checker requires the corrected command.
    - A non-destructive package-script test proves `pnpm db:personal:reset --confirm RESET_APPFINANZAS_PERSONAL --profile appfinanzas_personal` passes argument validation and reaches guarded preflight.
    - `validatePersonalConfirmation()` still rejects a leading literal `--`, reordered args, duplicates, and extras.
  - Checks:
    - `node --test scripts/reset-dev-database.test.mjs` — PASS, 31/31 tests; Node emitted `[DEP0190]` for the Windows package-script spawn using `shell: true`, and no Docker reset command ran.
    - `pnpm local:check-readme` — PASS with Node engine warning: current Node v24.14.1 while package expects 22.x.
    - `pnpm local:check-env` — PASS with Node engine warning: current Node v24.14.1 while package expects 22.x.
  - Evidence:
    - The documented personal reset command was corrected to `pnpm db:personal:reset --confirm RESET_APPFINANZAS_PERSONAL --profile appfinanzas_personal`.
    - The focused package-script test uses an unsafe `COMPOSE_PROJECT_NAME` override to stop at `PREFLIGHT_REJECTED` before filesystem/Docker mutation, proving the package-script arguments reached guarded preflight.

- [x] RST-007 — Allow strictly proven unmarked personal target reset
  - Route: focused reset-policy implementation and contract tests.
  - Acceptance:
    - Existing unmarked personal targets can reset only after exact ordered confirmation has routed into guarded preflight and service, project label, port, database, writable data mount, volume metadata labels, and sole ownership all match the personal policy.
    - Missing personal targets do not bootstrap.
    - Mismatched markers, dev-vs-personal markers, wrong service/volume/port/db, multiple consumers, remote DB, ambiguous Compose discovery, and ambient `COMPOSE_*` overrides remain rejected before mutation.
    - Dev behavior remains unchanged.
  - Checks:
    - `node --test scripts/reset-dev-database.test.mjs` — PASS, 33/33 tests, with Node `[DEP0190]` warning for the Windows package-script spawn using `shell: true`; no Docker reset command ran.
    - `pnpm local:check-readme` — PASS with Node engine warning: current Node v24.14.1 while package expects 22.x.
    - `pnpm local:check-env` — PASS with Node engine warning: current Node v24.14.1 while package expects 22.x.
  - Evidence:
    - `scripts/reset-local-database.mjs` now classifies an existing unmarked personal target as `unmarked-personal-target` only after the same identity checks used for marked targets pass.
    - `scripts/reset-dev-database.test.mjs` covers allowed unmarked personal target, rejected missing personal target, rejected personal identity mismatches, and rejected dev-vs-personal/mismatched markers.
    - README and README contract checker document the narrow personal-unmarked allowance and the fail-closed cases.

- [x] RST-008 — Verify destructive personal reset with live Docker
  - Route: parent command execution after explicit user selection of destructive personal reset and later explicit approval of the unmarked-personal policy change.
  - Acceptance:
    - Personal target inspection ran before reset.
    - Corrected personal reset command completed successfully.
    - Post-reset personal target is running healthy on port 5434 and has a `personal:<system_identifier>` marker.
  - Checks:
    - `pnpm env:personal` — PASS, copied `.env.personal.example` to `.env`, with Node engine warning.
    - `docker compose config --format json` — PASS, output captured to `/tmp/appfinanzas-compose-personal-config.json`.
    - `docker compose ps --all --format json postgres-personal` — PASS, personal target identified.
    - `pnpm db:personal:reset --confirm RESET_APPFINANZAS_PERSONAL --profile appfinanzas_personal` — final PASS, `Personal database reset completed.`
    - Post-reset `docker compose ps --format json postgres-personal` showed the personal container running healthy on port 5434.
    - Post-reset read-only SQL showed `current_database = appfinanzas_personal`, marker `personal:7687279815167094818`, and matching system identifier `7687279815167094818`.
  - Evidence:
    - First documented-command attempt failed pre-mutation due to literal `--`; RST-006 fixed docs/tests.
    - Second corrected-command attempt failed pre-mutation because the existing personal target was unmarked; the user approved the narrow RST-007 policy change.
    - Final corrected-command retry completed successfully.

## Delivery strategy

Default ODD delivery strategy: ask-on-risk. Forecast is below the 400-authored-line review budget if the solution remains focused on the reset scripts, tests, and docs. Reassess if the implementation expands into Docker topology, CI, or production recovery.

## Progress

- Created ODD task document from read-only scout findings.
- Completed RST-001 characterization with focused contract tests in `scripts/reset-dev-database.test.mjs`.
- Completed RST-002 supported-state definition in this document.
- Completed RST-003 dev-only bootstrap/recovery implementation in `scripts/reset-local-database.mjs` with focused tests.
- Completed RST-004 README and README-contract alignment.
- Completed RST-005 live Docker dev reset verification after explicit approval.
- Completed RST-006 personal reset package-script command ergonomics fix after the documented command failed pre-mutation during a live personal reset attempt.
- Completed RST-007 personal-unmarked existing-target policy change with focused tests and README contract updates.
- Completed RST-008 live destructive personal reset verification after explicit approval.

## Verification evidence

- RST-001 writer verification: `node --test scripts/reset-dev-database.test.mjs` passed, 25/25 tests.
- RST-001 writer verification: `pnpm local:check-env` passed with Node engine warning because current Node is v24.14.1 while package expects 22.x.
- RST-001 independent verification: `node --test scripts/reset-dev-database.test.mjs` passed, 25/25 tests.
- RST-002 readback: supported reset states table defines dev bootstrap allowance separately from strict personal behavior and keeps production recovery out of scope.
- RST-003 final writer verification: `node --test scripts/reset-dev-database.test.mjs` passed, 30/30 tests.
- RST-003 final writer verification: `pnpm local:check-env` passed with Node engine warning because current Node is v24.14.1 while package expects 22.x.
- RST-003 final independent verification: `node --test scripts/reset-dev-database.test.mjs` passed, 30/30 tests; `pnpm local:check-env` passed with the same Node warning.
- RST-004 writer verification: `pnpm local:check-readme` passed with Node engine warning because current Node is v24.14.1 while package expects 22.x.
- RST-004 independent verification: `pnpm local:check-readme` passed with the same Node warning.
- RST-005 live verification: `pnpm env:dev`, `docker compose config --format json`, `docker compose ps --format json postgres-dev`, and final `pnpm db:dev:reset` passed; post-reset `docker compose ps --format json postgres-dev` showed the dev container running healthy on port 5433.
- RST-006 verification: `node --test scripts/reset-dev-database.test.mjs` passed, 31/31 tests, with Node `[DEP0190]` warning for the Windows package-script spawn using `shell: true`; `pnpm local:check-readme` passed with Node engine warning; `pnpm local:check-env` passed with Node engine warning.
- RST-007 verification: `node --test scripts/reset-dev-database.test.mjs` passed, 33/33 tests, with Node `[DEP0190]` warning for the Windows package-script spawn using `shell: true`; `pnpm local:check-readme` passed with Node engine warning; `pnpm local:check-env` passed with Node engine warning.
- RST-008 live verification: `pnpm db:personal:reset --confirm RESET_APPFINANZAS_PERSONAL --profile appfinanzas_personal` passed; post-reset `docker compose ps --format json postgres-personal` showed the personal container running healthy on port 5434; post-reset SQL showed matching `personal:<system_identifier>` marker.
- Native risk assessment was unavailable/unassessable for RST-001, RST-003, RST-004, RST-006, and RST-007, so independent verification was used.

## Next step

Review the accumulated reset-focused diff, then create a work-unit commit when ready.
