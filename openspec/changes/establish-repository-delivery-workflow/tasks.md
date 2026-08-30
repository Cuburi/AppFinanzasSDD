# Tasks: Establish Repository Delivery Workflow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated remaining changed lines | Governance documentation/evidence only; reassess any future recovery roadmap separately. |
| 400-line budget risk | Not applicable to withdrawn recovery work. |
| Chained PRs recommended | No recovery chain in this change. |
| Suggested split | No recovery lock, backup/restore, or recovery-procedure slice is active. |
| Delivery strategy | Complete only active repository-delivery governance work; defer recovery planning. |
| Chain strategy | None for withdrawn recovery work. |

Decision needed before apply: No — recovery is withdrawn from this change.
Chained PRs recommended: No recovery chain.
Chain strategy: None for withdrawn recovery work.
400-line budget risk: Not applicable to withdrawn recovery work.

### Revised Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Issue forms and simple manual PR checklist | Superseded slice | Retained in the simplified workflow; no special gate. |
| 2 | Remove special governance automation | Simplification slice | Completed: contract-led deletion of trusted workflow, API enforcement, trailer gate, and special commands. |
| 3A | Recovery lock and reset migration | Withdrawn | Deferred to future roadmap; no executable PR3A work remains on this branch. |
| 3B | Backup/restore tooling and integration | Deferred | Future roadmap scope only. |
| 4 | Delivery procedures and deferred external-settings record | PR 4 | Docs/evidence only; no external GitHub setting changes or recovery content. |

## Phase 1: Issue Intake and Manual Checklist

- [x] 1.1 Create `.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, and `config.yml`; enforce required fields, type labels, `status:needs-review`, and disabled blank Issues.
- [x] 1.2 Create a concise PR template with manual Issue context, target branch, ordinary CI, tests/docs, and DB-profile checklist items.

## Phase 2: Scope Simplification (RED → GREEN)

- [x] 2.1 RED: Replace special-governance contract expectations with the simplified Issue-form/manual-template/ordinary-CI contract and prove the overengineered implementation fails it.
- [x] 2.2 GREEN: Remove the trusted PR-governance workflow, GitHub Issue/ancestry enforcement scripts, Approved-Issue trailer gate, and commands used solely by that enforcement.
- [x] 2.3 GREEN: Rename the remaining focused contract to `check-repository-delivery-workflow.contract.mjs` and keep only appropriate Issue-form/template/ordinary-CI assertions.

### Superseded Historical Work

- [x] Former governance validator, read-only Issue adapter, trusted `pull_request_target` workflow, native special-check lifecycle, current-head metadata validation, and special-check review findings are superseded by their removal in Phase 2.
- [x] Former `Approved-Issue` trailer validation is superseded. Approved-Issue review remains a visible manual convention only.
- [x] Focused simplified contract passes and `git diff --check` passes.

## Phase 3: Production Recovery — Withdrawn and Deferred

> Maintainer decision: robust production recovery coordination is deferred to a future product-roadmap change. This branch preserves the already-merged guarded local reset at `HEAD`; it contains no active production-recovery executable work unit.

- [ ] 3.1 WITHDRAWN: Shared production-operation lock characterization and implementation are deferred to the future roadmap; no implementation claim remains.
- [ ] 3.2 WITHDRAWN: Reset migration to the shared lock is deferred; `scripts/reset-local-database.mjs` is restored wholesale to the guarded local-reset baseline at `HEAD`.
- [ ] 3.3 DEFERRED: Backup/restore implementation and contract belong to the future roadmap.
- [ ] 3.4 DEFERRED: Backup/restore package, Compose, and README integration belong to the future roadmap.

### Historical PR3A Evidence

The withdrawn attempt and its review findings are retained only in `review-ledger.md`. They do not describe shipped code, provide no active approval, and do not make this branch PR-ready.

## Phase 4: Procedures and Deferred External Settings

- [x] 4.1 Create `docs/delivery/repository-workflow.md`; document Issue lifecycle, manual merge toward `dev`, manual `dev` → `master` promotion, hotfix synchronization, rollback, and manual Notion synchronization.
- [x] 4.2 Create `docs/delivery/external-settings-evidence.md` as a deferred-settings record; explicitly state that no GitHub rulesets, required-check changes, or merge restrictions are applied by this change and list hardening review triggers.
- [x] 4.3 Modify delivery documentation only for manual promotion, rollback, and Notion synchronization; do not add recovery cadence, backup/restore, lock migration, isolation, or recovery-evidence instructions.
- [x] 4.4 Run repository-delivery contract and workflow-inspection checks; verify ordinary CI, manual delivery guidance, and absence of special governance automation. Recovery tests and evidence are future roadmap scope. Evidence: `node scripts/check-repository-delivery-workflow.contract.mjs`, `git diff --check`, and package JSON parse passed on 2026-08-30.

## Next Separate Activity

Plan the future production-recovery roadmap without creating or populating it in this change. Its planning must preserve the six historical safety requirements in `specs/personal-production-recovery/spec.md` and `review-ledger.md`.
