# Priority and Horizon Proposal — Create Product Roadmap

## Review status

**Maintainer-approved for the next canonical-publication slice — not yet canonical.** Task 5.2 recorded the explicit maintainer approval only after the required fresh source/hash and complete digest-covered Notion re-read. This remains the reconciled planning proposal; it does not publish `docs/product/roadmap.md`, authorize RM-026 application implementation, create post-publication Notion surfaces, or change an imported Notion lifecycle field.

## Recommendation at a glance

Start with **RM-026 Uncategorized expense recording**, then **RM-012 Financial mutation retry protection**. RM-026 now has maintainer-accepted semantics: category and subcategory are optional; uncategorized expenses count in monthly totals, display as `Uncategorized`, may be categorized later or remain uncategorized indefinitely (including after month close), and must not block or error month close. Keep **RM-009 Credit-card statement history** and **RM-021 money-input interaction quality** in `Next` until their stated prerequisite decisions and evidence are available; RM-009 remains before **RM-010 payment tracking**.

`Now` is deliberately limited to two accepted, dependency-resolved financial workflows. RM-026 leads because its explicit semantics gate is now resolved; RM-012 remains the next integrity commitment. The remaining accepted work stays `Next` or `Later` so the maintainer can review outcomes incrementally. Decision gates and exploratory work remain non-committed.

## Priority principles applied

1. Optimize first for trustworthy personal daily use, not feature breadth.
2. Resolve financial correctness and high-friction existing flows before reporting closure and automation.
3. Keep shipped baselines visible but do not re-prioritize them as new delivery work.
4. Put a dependent after its prerequisite: statement history before payment tracking.
5. Keep unresolved financial/accounting decisions and all exploratory work out of `Now`.
6. Keep RM-018 deferred / `Future-only`; it is not a priority candidate unless a future explicit review verifies all six safeguards.

## Proposed horizons and recommended sequence

| Horizon | Recommended sequence | Why this band exists |
|---|---|---|
| `Now` | RM-026 → RM-012 | First remove the category/subcategory recording barrier under accepted totals, display, later-categorization, and month-close semantics; then reduce duplicate financial movements through the bounded retry-protection slice. |
| `Next` | RM-009 → RM-010 → RM-021 → RM-024 → RM-023 → RM-006 → RM-013 → RM-019 | Close correctness, current-experience, and bounded reporting work before automation. RM-009 and RM-021 remain non-committed until their explicit promotion evidence is available; each item still needs a focused implementation proposal. |
| `Later` | RM-007 → RM-008 → RM-005 → RM-022 | Automate established personal workflows only after correctness and current experience/reporting closure. The ordering avoids committing unclear lifecycle or interaction semantics too early. |
| `Explore` | RM-011, RM-014–RM-017, RM-020, RM-025–RM-029 | These are decisions or exploratory ideas. They need an explicit scope/semantics decision before they can receive a delivery commitment. |
| `Future-only` | RM-018 | Production recovery remains outside ordinary prioritization. |
| `Shipped` | RM-001–RM-004 | Preserve the bounded baselines; do not treat them as complete substitutes for their open follow-on initiatives. |

## Full RM-001–RM-029 proposal

| RM ID | Initiative | Classified status | Proposed horizon | Priority disposition and rationale |
|---|---|---|---|---|
| RM-001 | Monthly financial core baseline | `shipped` | `Shipped` | Preserve baseline. It anchors daily use but is not new committed work. |
| RM-002 | Basic active-month reporting baseline | `shipped` | `Shipped` | Preserve baseline. It does not close cross-month reporting or PDF export. |
| RM-003 | Active Month decision-surface baseline | `shipped` | `Shipped` | Preserve baseline. Concrete high-friction improvements remain separately prioritized. |
| RM-004 | Credit-card statement-period clarity baseline | `shipped` | `Shipped` | Preserve baseline. It does not replace statement history or payment tracking. |
| RM-005 | Recurring financial operations | `unfinished` | `Later` | Valuable automation, but posting, frequency, edit propagation, pause/resume, and lifecycle policy require a dedicated decision before commitment. |
| RM-006 | Grouped information architecture | `unfinished` | `Next` | A useful current-experience improvement after the first integrity slice; keep interaction and persistence choices open for its focused SDD. |
| RM-007 | Pocket allocation and goal-excess automation | `unfinished` | `Later` | Useful automation after the core is trustworthy; retain its distinct allocation semantics. |
| RM-008 | Explicit zero-out surplus closeout | `unfinished` | `Later` | A helpful closeout option, but it follows clearer core and allocation workflows and remains distinct from RM-007. |
| RM-009 | Credit-card statement history | `unfinished` | `Next` | Establishes addressable history and reconciliation evidence; it remains before RM-010. Promotion to `Now` requires an explicit later-edit reconciliation decision and focused-design evidence that stable statement identity/history preserves that policy. |
| RM-010 | Credit-card statement payment tracking | `unfinished` | `Next` | Direct personal-use value, but only after RM-009 gives statements stable identity/history and protects against double-counting. |
| RM-011 | Debt integration decision/exploration | `idea` | `Explore` | Keep non-committed until cash, available-money, and monthly-movement semantics are explicitly decided. |
| RM-012 | Financial mutation retry protection | `unfinished` | `Now` | Start second, after RM-026. A bounded correctness safeguard against duplicate financial CREATE movements; it protects existing and future money-moving workflows. |
| RM-013 | Product-quality evidence safeguards | `quality/debt` | `Next` | Strengthens confidence after the first correctness slice. Scope it into reviewable evidence work rather than treating the broad group as one large delivery. |
| RM-014 | Identity and privacy decision | `idea` | `Explore` | Required decision gate before dependable scope for backup/export, multi-user, and bank integration; no authentication commitment. |
| RM-015 | Backup/export | `deferred` | `Explore` | Later capability only after RM-014 and explicit ownership, privacy, portability, and restore decisions. |
| RM-016 | Multi-user support | `idea` | `Explore` | Conflicts with the present personal-use focus and depends on RM-014; do not commit it. |
| RM-017 | Bank integration | `idea` | `Explore` | Defer until value, provider, synchronization, ownership, and privacy boundaries are chosen. |
| RM-018 | Production recovery | `deferred` | `Future-only` | Not prioritized. A future explicit decision must verify shared cross-checkout lock identity; atomic legacy/replacement interoperability; destructive-stage source-drift detection including live inputs; owner-identifiable safe orphan recovery; rollback compatibility; and preservation of the primary reset failure when release also fails. |
| RM-019 | Cross-month comparison/reporting | `unfinished` | `Next` | Reporting closure follows core correctness and current-experience work, and precedes automation. First define a bounded comparison outcome; current active-month reports remain a shipped baseline. |
| RM-020 | PDF report export | `idea` | `Explore` | Consider only after report scope and relevant identity/privacy choices; it is neither backup/export nor a substitute for reporting closure. |
| RM-021 | Money-input interaction quality | `unfinished` | `Next` | High-friction current experience: make formatting, zero/placeholder behavior, and stepper behavior consistent while preserving validation and decimal semantics. Promotion to `Now` requires a completed money-entry surface inventory and focused-design evidence that validation and decimal semantics remain preserved. |
| RM-022 | Movements view redesign | `unfinished` | `Later` | Useful but larger interaction scope; follow the smaller clarity and selection improvements and keep it separate from the holistic audit. |
| RM-023 | Dependent category/subcategory selection | `unfinished` | `Next` | A concrete daily-flow correctness and friction reduction. Its focused proposal must protect historic records and resolve edit, migration, and empty states. |
| RM-024 | Destructive-action confirmation | `unfinished` | `Next` | Reduce avoidable loss in existing flows after inventorying actions and choosing risk thresholds, language, and undo alternatives. |
| RM-025 | Pocket withdrawal semantics | `idea` | `Explore` | Keep non-committed until the accounting meaning of withdrawal is decided; do not invent cash, transfer, expense, or available-money semantics. |
| RM-026 | Uncategorized expense recording | `unfinished` | `Now` | **Start first.** The maintainer accepted the semantics gate: category and subcategory are optional; the expense counts in monthly totals, displays `Uncategorized`, may be categorized later or remain uncategorized indefinitely (including after month close), and must not block or error month close. A focused implementation SDD remains required; this proposal does not authorize application code. |
| RM-027 | Holistic UI refinement | `idea` | `Explore` | Later screen-by-screen audit only. It must not absorb the concrete current-experience initiatives. |
| RM-028 | Financial-threshold notifications | `idea` | `Explore` | Explore only after trustworthy threshold formulas, trigger events, channels, and safety boundaries are selected. |
| RM-029 | Personal deployment decision | `idea` | `Explore` | Keep later while ownership, privacy, security, credentials, operational support, and recovery boundaries are undecided. |

## Explicit tradeoffs

| Choice | Benefit | Cost accepted |
|---|---|---|
| Put RM-026 first in `Now`, before RM-012 | Removes a documented daily expense-recording barrier under explicitly accepted financial semantics while retaining a focused implementation boundary. | RM-009 and RM-021 wait in `Next` for their promotion evidence; desirable automation and UX work also waits. |
| Put RM-010 after RM-009 | Payment tracking has a stable statement identity and history to reference. | The payment feature is delayed until its dependency is complete. |
| Put RM-019 before automation | Closes the bounded reporting outcome after correctness and current-experience work, before workflow automation. | Automation waits despite its product value. |
| Keep identity, privacy, backup/export, multi-user, bank, deployment, PDF, and broad UI work exploratory | Avoids premature architecture and operations commitments for a personal-use product. | Expansion is intentionally slower. |
| Keep RM-018 `Future-only` | Preserves production-recovery safety constraints and avoids reviving withdrawn work. | No near-term recovery capability is promised. |

## Maintainer review required

The maintainer approved this reconciled proposal for canonical publication after the task 5.2 final read. The approved priority decisions were:

- RM-026 followed by RM-012 is the deliberately small `Now` sequence;
- RM-009 and RM-021 remain `Next` until their stated promotion evidence exists;
- RM-009, RM-010, RM-021, RM-024, RM-023, RM-006, RM-013, and RM-019 retain the proposed `Next` sequence; and
- `Later`, exploratory, and deferred items retain their current boundaries. No decision gate beyond RM-026's authorized semantics was resolved.

## Boundary and verification

- [x] RM-001–RM-029 are all represented with their existing lifecycle status and a proposed horizon.
- [x] Shipped baselines remain `shipped` / `Shipped`.
- [x] `Now` contains only RM-026 followed by RM-012. RM-026 entered after the maintainer accepted its explicit optional-classification, totals, display, later-categorization, and month-close semantics; the proposal still does not authorize application code.
- [x] RM-009 precedes RM-010; RM-009 and RM-021 state the decision/evidence required for future `Now` promotion; decision gates remain non-committed.
- [x] RM-019 reporting closure precedes RM-007, RM-008, and RM-005 automation.
- [x] RM-018 remains deferred / `Future-only` with all six safeguards stated in full.
- [x] Task 5.2 records explicit maintainer approval after a fresh source/hash and complete digest-covered Notion re-read; the approval pin is recorded in `notion-review-draft-manifest.md`.
- [x] No canonical roadmap, post-publication Notion artifact, runtime change, commit, push, or PR was created in this approval slice.

## Decision history

| Date | Decision | Evidence |
|---|---|---|
| 2026-08-24 | Task 3.3 produced this unapproved priority/horizon proposal for interactive maintainer review. It proposes no canonical publication or implementation authorization. | `proposal.md`; `specs/product-roadmap/spec.md`; `design.md`; `reconciliation.md`; `initiative-classification.md`; `review-ledger.md`; `tasks.md`. |
| 2026-08-24 | Judgment Day Fix Round 1 removed unresolved RM-009 and RM-021 from `Now`, stated their future promotion evidence, and moved RM-019 before automation. The proposal remains unapproved pending maintainer review and scoped re-judgment. | `review-ledger.md`; `tasks.md`; this proposal. |
| 2026-08-25 | Task 5.1 reconciled the maintainer-approved RM-026 review delta. The source lifecycle was reclassified from `idea`/`Explore` to `unfinished`/`Now`, with RM-026 sequence 1 and RM-012 sequence 2. This is a reconciled, still-unapproved proposal; it authorizes neither application implementation nor canonical publication. | Fresh complete Notion snapshot and deterministic delta digest; `initiative-classification.md`; task 5.1 evidence. |
| 2026-08-26 | Task 5.2 recorded the maintainer's explicit Continue approval after a fresh source/hash and full digest-covered Notion re-read. The exact approval pin, including the current reconciled proposal hash, review-baseline source hash, and delta digest, is recorded in the manifest; Notion exposes no database-wide revision. | Task 5.2 final re-read; `notion-review-draft-manifest.md`; `tasks.md`. |
