# Proposal: Establish Repository Delivery Workflow

## Intent

Establish a solo-maintainer delivery workflow that is easy to operate: structured Issues, a concise PR checklist, ordinary CI, and deliberate manual merges toward `dev` followed by manual promotion from `dev` to `master`.

## Scope

### In Scope
- Bug and feature Issue forms, disabled blank Issues, and a documented manual Issue lifecycle.
- A simple PR template that keeps Approved-Issue review visible as a maintainer convention, not an automated merge barrier.
- Ordinary CI checks already appropriate to the repository: server checks, client checks, and branch release readiness.
- Manual feature merges toward `dev`, manual `dev` → `master` promotion, and the already-integrated guarded local reset baseline.
- Documentation and evidence templates for the manual workflow and future external-settings review.

### Out of Scope
- Trusted PR-governance workflows, custom/native special governance required checks, automated Approved-Issue enforcement, Issue API adapters, commit-trailer gates, and governance ancestry validation.
- Automatic Issue approval, automatic merge, merge queue, hosted deployment, off-device backup copies, and application feature changes.
- Applying external GitHub settings in this change.
- Robust production recovery coordination, shared cross-checkout locking, backup/restore automation, and recovery evidence tooling. These are deferred to a future product-roadmap change.

## Capabilities

### New Capabilities
- `repository-delivery-governance`: Issue forms, a manual PR checklist, ordinary CI, and manual promotion guidance.
- Future `personal-production-recovery`: roadmap capability for robust recovery coordination, guarded backup, isolated restore verification, and evidence requirements; no executable implementation is active in this change.

## Approach

Keep only simple repository contracts that are useful for a solo maintainer: validate Issue-form configuration and the manual PR template locally, retain ordinary CI, and remove special governance automation. Preserve the guarded local reset already integrated at `HEAD`; defer robust production recovery coordination to a separate roadmap change because its cross-workspace safety model is not ready for release.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`, CI | Modified | Issue forms, manual checklist, and ordinary CI only. |
| `scripts/`, `package.json`, `docker-compose.yml` | Modified | Simple form/template contract and the preserved guarded local-reset baseline only. |
| `README.md`, `docs/delivery/`, `docs/deployment/` | Modified | Manual promotion guidance only; recovery procedures are future roadmap scope. |
| GitHub settings | Deferred | Review manual branch settings later; no external change in this scope. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A manual checklist can be skipped | Medium | Keep it visible in the PR template and retain ordinary CI. |
| Future collaborators can weaken repository policy | Deferred | Revisit hardening before granting write access. |
| Future backup leakage or wrong-target restore | Deferred | A future roadmap change must define profile/destination guards and isolated restore verification. |
| Shared recovery coordination is incomplete | High | Withdraw executable PR3A work; future roadmap must address the six recorded safety concerns before implementation. |

## Rollback Plan

Revert the forms, PR template, simple contract, or recovery artifacts independently. No external settings or merge barriers are introduced by this scope.

## Dependencies

- No recovery tooling dependency is active in this change.

## Success Criteria

- [ ] Bug and feature Issues start in review and blank Issues are disabled.
- [ ] The PR template makes Approved-Issue review visible without automating approval or blocking a merge.
- [ ] Ordinary CI remains the repository's automated delivery signal.
- [ ] Maintainer procedures describe manual merges toward `dev` and manual promotion to `master`.
- [ ] Next separate activity: plan, but do not create or populate, the future recovery roadmap constrained by the six historical safety requirements.
