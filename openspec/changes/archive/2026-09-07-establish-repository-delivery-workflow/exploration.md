## Exploration: establish-repository-delivery-workflow

### Current Scope Revision

The original exploration considered automated Approved-Issue validation, special GitHub governance checks, and production recovery implementation. The active scope now keeps Issue forms, a simple PR template, ordinary CI, manual merges toward `dev`, manual `dev` → `master` promotion, and the already-integrated guarded local reset baseline. Robust production recovery coordination is future roadmap scope, not active work in this change.

### Retained Constraints

- Issue forms should collect structured bug/feature information, apply type labels, start in `status:needs-review`, and disable blank Issues.
- Approved-Issue review remains visible in the PR checklist but is not an automated merge barrier.
- Ordinary CI stays responsible for tests, typechecks, builds, and release-readiness checks already appropriate to the repository.
- The guarded local reset at `HEAD` remains preserved. Production recovery coordination, backup/restore, lock migration, and recovery evidence are not active requirements of this change.
- GitHub remains the technical-status authority; Notion synchronization remains manual.

### Deferred Hardening

Do not apply external GitHub rulesets, special required checks, merge restrictions, or additional trust-boundary automation in this change. Before another person or automation principal receives repository write access, create a new hardening change that reassesses branch protections and collaboration risks.

### Deferred Recovery Follow-up

No recovery lock/reset migration, backup/restore tooling, recovery procedure, or recovery-evidence work unit is planned in this change. The next separate activity is roadmap planning for a future recovery change; no roadmap is created or populated here. That future planning must retain the six historical safety constraints in `specs/personal-production-recovery/spec.md` and `review-ledger.md`.
