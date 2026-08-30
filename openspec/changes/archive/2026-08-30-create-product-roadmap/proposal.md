# Proposal: Create Product Roadmap

## Intent

AppFinanzas needs one evidence-backed roadmap for finishing a trustworthy personal daily-use product before expanding breadth. Shipped foundations, incomplete outcomes, deferred capabilities, and ideas are currently mixed across plans, SDD artifacts, code, and memory. The roadmap must expose unfinished financial loops and define completion as stable end-to-end use, not technical presence.

## Proposal Question Round

The approved premises resolve the initial product questions; no blocking assumption remains for this proposal.

## Scope

### In Scope
- Define a capability-led roadmap using `shipped`, `unfinished`, `deferred`, `idea`, and `quality/debt`.
- Record each initiative's outcome, horizon, evidence, dependencies, risk, and decision needs.
- Populate verified financial-core gaps, prioritizing correctness, active-month/reporting closure, then automation.

### Out of Scope
- Features, detailed tasks, estimates, or implementation sequencing.
- Prioritizing authentication, multiuser growth, bank integration, export, or recovery over personal-use value.
- Activating production recovery; it remains future-only behind all six historical safety gates.

## Roadmap Principles

- Complete means a stable, understandable end-to-end daily workflow.
- Routes, modules, APIs, and merged SDDs are evidence, not delivered outcomes.
- Horizons express dependency and value, not dates.
- Financial ambiguity outranks apparent implementation size.

## Evidence Reconciliation

- Verify status against current behavior and repository evidence.
- Prefer code, active OpenSpec decisions, merged PRs, and active Engram over older labels.
- Mark conflicts `decision needed`; never infer completion.
- Treat historical plans as inputs, not sole truth.

## First-Population Boundary

Include shipped foundations; unfinished reports, dashboard summary, recurring expenses, pocket/surplus rules, credit-card statement flows, and quality safeguards; plus deferred recurring income, identity, backup/export, multiuser, and production recovery. Exclude unsupported feature expansion.

## Capabilities

### New Capabilities
- `product-roadmap`: Evidence-governed roadmap status, horizons, dependencies, and completion rules.

### Modified Capabilities
None.

## Approach

Create `docs/product/roadmap.md` with traceability to product documents, SDD changes, PRs, modules, and Engram.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/product/roadmap.md` | New | Roadmap and first population |
| Product/planning documents | Referenced | Intent and historical evidence |
| OpenSpec, PRs, and Engram | Referenced | Decision and delivery evidence |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Historical status drift | High | Require current evidence and conflict flags |
| Feature-dump roadmap | Medium | Enforce boundaries, horizons, and completion outcomes |
| Deferred recovery becomes active | Medium | Label future-only; preserve six safety gates |

## Rollback Plan

Remove the roadmap and change artifacts; runtime behavior and product data remain unchanged.

## Dependencies

- Verified repository and OpenSpec/PR/Engram evidence.
- Product decisions before promoting identity, privacy, backup/export, deployment, or recovery.

## Success Criteria

- [ ] Every initial initiative has status, outcome, horizon, evidence, dependency, and risk.
- [ ] Partial flows cannot be mistaken for complete capabilities.
- [ ] A next SDD slice can be selected without reviving deferred work.
