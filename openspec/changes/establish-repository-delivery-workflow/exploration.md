## Exploration: establish-repository-delivery-workflow

### Current Scope Revision

The original exploration considered automated Approved-Issue validation and special GitHub governance checks. That approach is superseded for the current solo-maintainer stage. The active scope keeps Issue forms, a simple PR template, ordinary CI, manual merges toward `dev`, manual `dev` → `master` promotion, and production recovery work.

### Retained Constraints

- Issue forms should collect structured bug/feature information, apply type labels, start in `status:needs-review`, and disable blank Issues.
- Approved-Issue review remains visible in the PR checklist but is not an automated merge barrier.
- Ordinary CI stays responsible for tests, typechecks, builds, and release-readiness checks already appropriate to the repository.
- Recovery must use a production-only profile, an external-to-volume backup destination, disposable restore isolation, and locally retained evidence.
- GitHub remains the technical-status authority; Notion synchronization remains manual.

### Deferred Hardening

Do not apply external GitHub rulesets, special required checks, merge restrictions, or additional trust-boundary automation in this change. Before another person or automation principal receives repository write access, create a new hardening change that reassesses branch protections and collaboration risks.

### Delivery Plan

The remaining work is force-chained toward `dev`: recovery lock/reset migration, then backup/restore tooling, then procedures and a deferred external-settings record. Each slice remains below the 400-line review budget where practical; split recovery tooling further if its diff exceeds that threshold.
