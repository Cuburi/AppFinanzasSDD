# Repository Delivery Workflow

Use this checklist for every manual delivery. GitHub is the technical authority; Notion is a manually refreshed reference only.

## Issue lifecycle

1. Create a bug or feature Issue with the repository form. It starts with `status:needs-review`.
2. The maintainer records a decision: apply `status:approved`, or close it as rejected with a reason or duplicate with the canonical Issue link.
3. Record blockers on the Issue while work is paused. On completion, link the merged PR and close the Issue.

## Feature delivery to dev

1. Open the implementation PR against `dev` and complete the PR template.
2. Review scope, tests, documentation, and the applicable database profile.
3. Require green ordinary CI, then merge manually to `dev`.

## Promote dev to master

Open a PR from `dev` to `master`. Do not promote another source branch.

Before merging, record the evidence below in the promotion PR or its linked Issue:

- [ ] Green ordinary CI for the promotion PR.
- [ ] Migration and environment review: identify migrations, environment-variable changes, and compatibility risks; record `none` when applicable.
- [ ] Risk-based backup: decide whether the production data risk requires a backup before deployment; record the decision, owner, location, and restore contact when one is taken.
- [ ] Dev smoke test: exercise the changed workflow against the dev environment and record the result.
- [ ] Rollback plan: identify the last known-good Git commit and the maintainer action for reverting the promotion.

After merging, perform the post-production smoke test for the changed workflow and record the result in the same promotion evidence. If any required evidence is unavailable, do not promote.

## Rollback after promotion

1. Stop further promotion activity and preserve the failing evidence.
2. Use the recorded last known-good Git commit to prepare a minimal revert PR from `dev` to `master`; do not force-push `master`.
3. Run ordinary CI and the relevant smoke test before merging the revert.
4. Record the rollback result, production smoke outcome, and follow-up Issue.

## Emergency hotfix synchronization

1. Start `hotfix/*` from `master` and keep the emergency correction minimal.
2. Run ordinary checks and a smoke test, then merge the hotfix manually to `master`.
3. Immediately merge or otherwise synchronize the same correction back to `dev` and record the resulting commit or PR.
4. Create or update the retrospective Issue with the emergency rationale, impact, and follow-up work.

## Manual Notion synchronization

After Git publication, a designated refresher manually updates the Canonical Roadmap Mirror from the merged Git commit and records the source commit, source version, mirror state, and refresh date. A proposal is `Integrated` only after Git publication and mirror refresh are verified. Notion outages or stale records never replace GitHub technical status.
