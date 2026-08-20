# Design: Establish Repository Delivery Workflow

## Technical Approach

Use GitHub Issue forms and a concise PR template to guide the sole maintainer. Ordinary CI continues to run server checks, client checks, and branch release readiness. The maintainer manually merges feature work toward `dev`, then manually promotes `dev` to `master` after reviewing the checklist and green CI. No specialized governance workflow, GitHub API policy script, or special required-check identity remains.

## Architecture Decisions

| Area | Decision | Rationale |
|---|---|---|
| Issue intake | Keep GitHub Issue forms with required fields, type labels, and `status:needs-review`. | Structured intake is useful without adding merge automation. |
| Approved-Issue convention | Keep it as a visible PR checklist item only. | A solo maintainer can review it deliberately; it is not a machine-enforced gate. |
| Automated checks | Keep ordinary CI only. | Tests, typechecks, builds, and release-readiness checks are already appropriate and understandable. |
| Merge authority | Maintainer manually merges to `dev` and manually promotes `dev` to `master`. | Avoids bot authority and unnecessary governance complexity. |
| Future hardening | Revisit branch protections and automated governance before another writer receives access. | The current design is intentionally scoped to a single trusted maintainer. |
| Recovery exclusion | Preserve the planned shared recovery lock and isolated restore design. | Production recovery has separate operational risks and remains an independent work unit. |

## Data Flow

```text
Issue form -> maintainer review -> PR checklist + ordinary CI -> manual merge to dev
stable dev + promotion checklist + ordinary CI -> manual promotion to master
operator -> shared production lock -> backup/isolated restore -> local evidence
```

## File Changes

| File | Action | Description |
|---|---|---|
| `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.yml`, `config.yml` | Create | Required forms and disabled blank Issues. |
| `.github/pull_request_template.md` | Modify | Manual Issue, branch, CI, test, and profile-safety checklist. |
| `.github/workflows/ci.yml` | Retain | Ordinary `Server checks`, `Client checks`, and `Branch release readiness` contexts. |
| `scripts/check-repository-delivery-workflow.contract.mjs`, `package.json` | Create/Modify | Narrow local contract for forms, template, ordinary CI, and absence of special governance automation. |
| `scripts/personal-production-operation-lock.mjs` | Create later | Shared lease lock and source identity protocol. |
| `scripts/personal-production-recovery.mjs`, `.contract.mjs` | Create later | Locked backup/isolated restore and atomic evidence. |
| `docs/delivery/`, `README.md`, `docs/deployment/` | Create/Modify later | Manual delivery and recovery procedures. |

## Interfaces / Contracts

- Issue forms create `type:bug` or `type:feature` Issues with `status:needs-review`; blank Issue creation is disabled.
- The PR template includes a manual Approved-Issue review item, target-branch guidance, ordinary-CI confirmation, tests/docs, and database-profile safety. It does not require a commit trailer, an Issue API read, a re-run of a special job, or an automated approval result.
- CI retains its ordinary jobs. No workflow uses `pull_request_target`, checks out a trusted validator, calls the GitHub API for Issue policy, or publishes a special `PR governance` result.
- The maintainer manually merges feature PRs toward `dev`. When `dev` is stable, the maintainer manually promotes it to `master` after ordinary CI and the promotion checklist are reviewed.
- Before granting write access to another person or automation principal, revisit trusted-boundary and branch-protection hardening as a new change.
- Recovery retains the planned unguessable lease token, source-fingerprint revalidation, `.partial` discard, isolated networkless restore, atomic evidence, and secret/row/path redaction.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Contract | Issue-form labels/required fields, disabled blank Issues, simple PR template, retained ordinary CI, and removed special automation. | Node assertions and repository-file inspection. |
| Recovery contract | Locks, fingerprint, guards, restore isolation, and evidence. | Node assertions, temp directories, and networkless PostgreSQL restore. |
| Acceptance | Manual checklist use, ordinary CI results, and recovery exercise. | Maintainer review and locally retained evidence. |

## Migration / Rollout

Remove special governance artifacts and commands, retain Issue forms and ordinary CI, and use the PR template for manual merges. Do not change external GitHub settings during this work. Schedule hardening only when repository write access expands.

## Open Questions

None.
