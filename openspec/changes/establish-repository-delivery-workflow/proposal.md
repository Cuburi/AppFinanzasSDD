# Proposal: Establish Repository Delivery Workflow

## Intent

Establish a solo-maintainer delivery workflow that is easy to operate: structured Issues, a concise PR checklist, ordinary CI, and deliberate manual merges toward `dev` followed by manual promotion from `dev` to `master`.

## Scope

### In Scope
- Bug and feature Issue forms, disabled blank Issues, and a documented manual Issue lifecycle.
- A simple PR template that keeps Approved-Issue review visible as a maintainer convention, not an automated merge barrier.
- Ordinary CI checks already appropriate to the repository: server checks, client checks, and branch release readiness.
- Manual feature merges toward `dev`, manual `dev` → `master` promotion, and guarded local production recovery tooling.
- Documentation and evidence templates for the manual workflow, recovery exercises, and future external settings review.

### Out of Scope
- Trusted PR-governance workflows, custom/native special governance required checks, automated Approved-Issue enforcement, Issue API adapters, commit-trailer gates, and governance ancestry validation.
- Automatic Issue approval, automatic merge, merge queue, hosted deployment, off-device backup copies, and application feature changes.
- Applying external GitHub settings in this change.

## Capabilities

### New Capabilities
- `repository-delivery-governance`: Issue forms, a manual PR checklist, ordinary CI, and manual promotion guidance.
- `personal-production-recovery`: guarded local production backup, isolated restore verification, and evidence requirements.

## Approach

Keep only simple repository contracts that are useful for a solo maintainer: validate Issue-form configuration and the manual PR template locally, retain ordinary CI, and remove special governance automation. Keep recovery work isolated from delivery-policy simplification. Defer hardening until another person or automation principal receives repository write access.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`, CI | Modified | Issue forms, manual checklist, and ordinary CI only. |
| `scripts/`, `package.json`, `docker-compose.yml` | Modified | Simple form/template contract and later guarded recovery tooling. |
| `README.md`, `docs/delivery/`, `docs/deployment/` | Modified | Manual promotion and recovery procedures. |
| GitHub settings | Deferred | Review manual branch settings later; no external change in this scope. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A manual checklist can be skipped | Medium | Keep it visible in the PR template and retain ordinary CI. |
| Future collaborators can weaken repository policy | Deferred | Revisit hardening before granting write access. |
| Backup leakage or wrong-target restore | Medium | Profile/destination guards and isolated restore verification. |

## Rollback Plan

Revert the forms, PR template, simple contract, or recovery artifacts independently. No external settings or merge barriers are introduced by this scope.

## Dependencies

- Docker and PostgreSQL tooling for the recovery work.

## Success Criteria

- [ ] Bug and feature Issues start in review and blank Issues are disabled.
- [ ] The PR template makes Approved-Issue review visible without automating approval or blocking a merge.
- [ ] Ordinary CI remains the repository's automated delivery signal.
- [ ] Maintainer procedures describe manual merges toward `dev` and manual promotion to `master`.
- [ ] A guarded local backup restores successfully in isolation, with evidence recorded.
