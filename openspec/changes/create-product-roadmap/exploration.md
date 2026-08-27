## Exploration: create-product-roadmap

### Current State
AppFinanzas is a single-user/local web MVP centered on one active monthly lifecycle. The React/Vite client and Express/TypeScript server use PostgreSQL through Prisma, with modular backend boundaries and a growing frontend feature/page structure. The implemented product currently covers budget templates (categories, subcategories, planned amounts), opening and closing month snapshots, monthly income sources, expenses with payment method and history, derived physical cash, pockets/savings, debts with payment ledgers, credit-card management/linkage and a current statement summary, plus active/closed month and degraded-state UI. Reports has a route/page surface but the product backlog still treats reporting as incomplete.

The primary product job remains: make current-month available money understandable within 30 seconds and keep it accurate through low-friction expense capture. Financial meaning is intentionally separated between availability, budget balances, reserved money, and physical cash. The repository is currently `dev` at merged PR #177 (`22cf238`); the repository-delivery SDD is complete for its active governance scope. Its production-recovery implementation was withdrawn, while the guarded local reset baseline remains shipped.

The roadmap needs to distinguish four states rather than treating every unchecked item as active: (1) implemented foundations, (2) unfinished product slices, (3) explicitly deferred capabilities, and (4) ideas requiring later prioritization. Current unfinished slices include recurring expenses, explicit total-budget-vs-spent dashboard summary, threshold notifications, full pocket monthly-allocation/goal-excess automation, explicit zero-out surplus handling, reports, credit-card statement-period presentation, statement payment tracking/history, and product-quality tooling such as browser accessibility/responsive checks, coverage, lint, and stronger assertions. Historical SDD work shows recurring income is also intentionally retained on the future roadmap, not assumed to be active.

### Affected Areas
- `PRODUCT.md` — product purpose, primary user job, constraints, principles, and unresolved privacy/backup/auth decisions.
- `user-stories.md` — functional implementation matrix, explicit pending/partial stories, future-MVP ideas, and quality debt.
- `plan-implementacion.md` — historical delivery plan, current MVP summary, dependencies, and older candidate sequencing.
- `server/src/modules/monthly-cycle/` — core month lifecycle, ledger, balances, incomes, expenses, pockets, closure, cash, reports DTOs, and primary dependency hub.
- `server/src/modules/debts/` — implemented but intentionally independent debt and payment ledger; future integration with monthly cash/cycle remains a roadmap dependency.
- `server/src/modules/credit-cards/` — implemented card domain and current statement summary; statement-period split, payment tracking, and history remain product/contract debt.
- `client/src/pages/` and `client/src/features/` — current screen inventory, including active month, close month, template, pockets, debts, credit cards, and reports surfaces.
- `docs/product/technical-debt.md` — explicit credit-card correctness and historical-statement follow-ups.
- `openspec/changes/establish-repository-delivery-workflow/` — completed governance scope and the authoritative deferral of production recovery.
- `openspec/changes/establish-repository-delivery-workflow/specs/personal-production-recovery/spec.md` — six non-active safety constraints that any future production-recovery capability must address.
- `docs/deployment/personal-production-options.md`, `docker-compose.yml`, `scripts/`, and Prisma configuration — deployment, environment, database, and recovery dependencies to map before operational roadmap work.
- Git history through `22cf238` — confirms merged delivery state and that PR3A recovery-lock work is not shipped.
- Engram memories `#222`, `#419`, `#718`, `#1256`, `#2559`, and `#2552` — prior roadmap decisions, UI sequencing, personal-testing findings, and production-recovery deferral.

### Approaches
1. **Capability-led roadmap map** — organize the roadmap by user capability and lifecycle dependency, tagging each item as shipped, unfinished, deferred, idea, or quality/debt.
   - Pros: matches the product model; exposes dependencies from monthly-cycle foundations; prevents historical SDD status from being mistaken for product status.
   - Cons: requires reconciling older Spanish planning documents with newer English SDD artifacts and memory.
   - Effort: Medium

2. **SDD-change-led inventory** — organize entries primarily by existing or proposed SDD change names, then attach product outcomes and prerequisites.
   - Pros: easy traceability to OpenSpec/Engram and future implementation slices.
   - Cons: overrepresents completed engineering work, hides gaps without prior SDD artifacts, and can turn the roadmap into a change log.
   - Effort: Medium

### Recommendation
Use the capability-led map as the roadmap’s user-facing structure, with explicit traceability fields for OpenSpec changes, PRs, modules, and evidence. Establish a small set of dependency bands: stabilize/quality and correctness first where financial meaning can be misleading; finish the active-month/reporting product loop; then automate recurring/allocation/notification workflows; then address identity, backup/export, and multi-user concerns. Keep recurring income visible as a future idea/capability. Keep production recovery as a future capability only, not an active implementation task, and preserve all six safety constraints as roadmap acceptance gates. Do not rank items solely by apparent implementation size: credit-card payment/history and recovery have correctness/operational risk that should be surfaced explicitly.

The roadmap population should record at least: capability, user outcome, status, priority, module, dependencies, SDD/change, PR/evidence, risk, and decision needed. It should reconcile the current repository against the roadmap before selecting the next SDD slice; the older `plan-implementacion.md` is useful historical context but is not sufficient as the sole source of truth.

### Risks
- Product and technical documents contain mixed languages and historical sequencing; copying status without repository verification can resurrect completed work or miss newer credit-card and UI changes.
- `ReportsPage.tsx` exists while reports remain functionally incomplete; route/page presence must not be treated as delivered capability.
- Deeds and credit cards are implemented in bounded modules but have explicit missing integration/presentation behaviors; roadmap entries must separate “module exists” from “user outcome is complete.”
- Authentication, backup/privacy, multi-user, bank integration, and export are unresolved product decisions as well as implementation work; their order affects data ownership and deployment architecture.
- Production recovery is deliberately deferred. Any roadmap item for it must remain non-active until the six historical safety constraints, destination/profile guards, isolated restore verification, evidence, and failure semantics are designed and reviewed.
- The roadmap may exceed the 400-line review budget if it becomes a feature dump; keep the first artifact as a concise, evidence-backed inventory and split later implementation proposals into reviewable work units.

### Ready for Proposal
Yes. The exploration has enough evidence to create a proposal for a maintainable roadmap artifact and a population strategy. The proposal should define the roadmap schema/status vocabulary, source-of-truth and reconciliation rules, dependency ordering, and a first populated set without starting implementation. It should explicitly label production recovery as future-only.
