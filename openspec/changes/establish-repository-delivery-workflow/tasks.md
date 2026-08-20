# Tasks: Establish Repository Delivery Workflow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated remaining changed lines | 650–950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Recovery lock → backup/restore tooling → procedures and deferred-settings evidence |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main toward `dev` |

Decision needed before apply: No — resolved as force-chained
Chained PRs recommended: Yes
Chain strategy: stacked-to-main toward `dev`
400-line budget risk: High

### Revised Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Issue forms and simple manual PR checklist | Superseded slice | Retained in the simplified workflow; no special gate. |
| 2 | Remove special governance automation | Simplification slice | Completed: contract-led deletion of trusted workflow, API enforcement, trailer gate, and special commands. |
| 3A | Recovery lock and reset migration | PR 3A | Production recovery only; target `dev`; keep within 400 changed lines. |
| 3B | Backup/restore tooling and integration | PR 3B | Production recovery only; target the prior slice; split again if the diff exceeds 400 lines. |
| 4 | Procedures and deferred external-settings record | PR 4 | Docs/evidence only; no external GitHub setting changes. |

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

## Phase 3: Production Recovery (RED → GREEN)

- [ ] 3.1 RED: Add tests for shared lease ownership, stale recovery, complete source fingerprint, pre/post-export revalidation, and migration from `.appfinanzas-reset.lock`.
- [ ] 3.2 GREEN: Create `scripts/personal-production-operation-lock.mjs` and integrate it into `scripts/reset-local-database.mjs`, preserving token-bound host locking across reset and recovery operations.
- [ ] 3.3 RED/GREEN: Create `scripts/personal-production-recovery.mjs` and `.contract.mjs`; test profile/destination guards, identifiable external backup, partial-file cleanup, networkless isolated restore, redaction, atomic evidence, and live-target non-modification.
- [ ] 3.4 Modify `docker-compose.yml`, `package.json`, and `scripts/check-readme-local-setup.mjs` with guarded backup/restore commands and PowerShell-safe invocation checks.

## Phase 4: Procedures and Deferred External Settings

- [ ] 4.1 Create `docs/delivery/repository-workflow.md`; document Issue lifecycle, manual merge toward `dev`, manual `dev` → `master` promotion, hotfix synchronization, rollback, and manual Notion synchronization.
- [ ] 4.2 Create `docs/delivery/external-settings-evidence.md` as a deferred-settings record; explicitly state that no GitHub rulesets, required-check changes, or merge restrictions are applied by this change and list hardening review triggers.
- [ ] 4.3 Modify `README.md` and `docs/deployment/personal-production-options.md` with recovery cadence, backup/restore exercise checklist, lock migration, isolation limits, and evidence retention.
- [ ] 4.4 Run contract, integration, workflow-inspection, and recovery tests; verify ordinary CI, manual delivery guidance, recovery evidence, and absence of special governance automation.
