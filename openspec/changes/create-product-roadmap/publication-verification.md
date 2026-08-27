# Canonical Roadmap Publication Verification

## Documentary test contract — RED

The canonical publication is valid only when `docs/product/roadmap.md` exists and proves all of the following against the approval pin:

1. Its source is `priority-horizon-proposal.md` at commit `e5bbe3d` with SHA-256 `31138F924F0FDB6DDC1E5D6DF2C50BAF694D167161E3AF5348E7012F93DAA3F5`.
2. It contains exactly the approved RM-001–RM-029 initiative set, with RM-026 first and RM-012 second in `Now`.
3. Every initiative records outcome, scope/non-goals, classified status, horizon, dependencies, rationale, completion evidence, and provenance; it is a roadmap, not a task tracker.
4. It preserves the production-recovery `deferred`/`Future-only` boundary and all six C-18 safeguards.
5. It makes Git canonical and independently usable; Notion remains a separate, manual, non-authoritative follow-up. No automatic synchronization, draft promotion, mirror, or proposal queue is claimed.
6. It retains decision history and states that RM-026 publication does not authorize application implementation.

## RED execution

Before the canonical file existed, the documentary existence/source check was expected to fail closed. The command intentionally checks for the target file and the approval-pinned source hash; a missing target is a failure, not a publication claim.

## GREEN and refactor record

The static publication check passed after the canonical document was created. It verified the working-tree source SHA-256 and the exact `e5bbe3d` source bytes against the approval pin; exactly 29 initiative rows; all RM IDs; RM-026 before RM-012 in `Now`; all C-18 safeguards; the manual Git/Notion boundary; and the RM-026 no-application-code boundary. `git diff --check` also passed.

### Task-tracker leakage guard

The canonical product roadmap must not contain internal SDD task identifiers, whether bare or prefixed with `task`/`tasks`. This targeted static check must return no matches; artifact names and Git commit references remain permitted traceability because they identify evidence without exposing the internal execution tracker:

```powershell
$forbidden = '\b(?:5\.1|5\.2|6\.1|6\.2|6\.3)\b'
$matches = Select-String -Path 'docs/product/roadmap.md' -Pattern $forbidden -AllMatches
if ($matches) { $matches; exit 1 }
```

The guard passed with no matches. It protects the documented no-task-tracker-data boundary without removing product-facing provenance such as `publication-verification.md`, `notion-review-draft-manifest.md`, or merge commit `e5bbe3d`.

No refactor was needed after the document's scan-oriented horizon sections and initiative tables passed the contract. This file records documentary/static validation only; it is not a runtime test suite.
