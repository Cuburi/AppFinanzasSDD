# Repository Delivery Governance Specification

## Purpose

Define an auditable Issue-to-production workflow in which GitHub remains authoritative for technical status and maintainer approval is explicit.

## Requirements

### Requirement: Issue forms and lifecycle

The repository MUST provide bug and feature Issue forms, disable blank Issues, and document the lifecycle from `status:needs-review` through approval, work, blocking, completion, rejection, or duplication. Approval MUST remain a manual maintainer action; rejected Issues MUST record a reason and duplicates MUST link a canonical Issue.

#### Scenario: New Issue enters review

- GIVEN a contributor submits a bug or feature form with all required fields
- WHEN GitHub creates the Issue
- THEN the Issue has the appropriate type label and `status:needs-review`
- AND a blank Issue cannot be submitted

#### Scenario: Maintainer approves an Issue

- GIVEN an Issue has been reviewed for scope, priority, and exactly one type
- WHEN a maintainer explicitly applies `status:approved`
- THEN the Issue is eligible for linked implementation PRs
- AND no automation alone can create that approval

#### Scenario: Rejection or duplication is closed

- GIVEN a maintainer determines an Issue is invalid or duplicated
- WHEN the Issue is closed
- THEN it has `status:rejected` with a reason or `status:duplicate` with a canonical link

### Requirement: Manual PR delivery checklist

The repository MUST provide a concise PR template that records Issue context, target-branch guidance, ordinary CI, tests/docs, and database-profile safety. An Approved-Issue review MAY remain visible as a maintainer convention, but it MUST NOT be automated as a merge barrier or require an Issue API read, commit trailer, custom check, or trusted-governance workflow.

#### Scenario: Maintainer reviews a feature PR

- GIVEN a feature PR targets `dev`
- WHEN the maintainer reviews it
- THEN the PR template presents the Issue-context and ordinary-CI checklist
- AND the maintainer may manually merge after completing the applicable review

#### Scenario: No special governance barrier exists

- GIVEN a PR is opened
- WHEN repository automation runs
- THEN only the ordinary CI jobs run for delivery validation
- AND no special `PR governance` job, Issue metadata API gate, or Approved-Issue enforcement blocks the merge

### Requirement: Promotion, hotfix, and external evidence

Promotion from `dev` to `master` MUST be manual and use the documented checklist: green ordinary CI, migration/environment review, a risk-based pre-promotion backup, a `dev` smoke test, rollback plan, and post-production smoke test. A `hotfix/*` branch SHOULD start from `master`, contain the minimum emergency fix, pass ordinary checks and smoke testing, merge manually to `master`, and synchronize back to `dev`; retrospective Issue documentation is required only for a real emergency. Notion synchronization MUST be manual; GitHub remains technical authority. Future external branch-protection hardening is deferred until repository write access expands.

#### Scenario: Promotion is accepted

- GIVEN every promotion checklist item is evidenced
- WHEN the maintainer promotes `dev` to `master`
- THEN the promotion is permitted and production smoke results are recorded

#### Scenario: Missing external or Notion evidence

- GIVEN required checklist evidence cannot be verified
- WHEN promotion is reviewed
- THEN promotion is blocked until evidence is restored
- AND Notion is not treated as a substitute for GitHub technical status

#### Scenario: Emergency hotfix is synchronized

- GIVEN production requires an emergency correction
- WHEN a minimal `hotfix/*` change passes checks and smoke testing and merges to `master`
- THEN the same correction is immediately merged or otherwise synchronized into `dev`
- AND the Issue and emergency rationale are documented retrospectively
