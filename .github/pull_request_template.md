## Issue context

- [ ] Approved issue reviewed (manual convention; not a merge barrier).
- [ ] Body includes `Refs #N`, `Closes #N`, `Fixes #N`, `Resolves #N`, `SDD:`, or `SDD change`.

## Target branch

- [ ] Feature PR targets `dev`.
- [ ] Promotion PR moves `dev` to `master` after `dev` is stable.
- [ ] Merge manually toward `dev`; promote `dev` to `master` manually when ready.

## Type label

- [ ] Exactly one `type:*` label is applied.

## CI is green

- [ ] CI is green on this PR.
- [ ] Branch release readiness checks passed.
- [ ] Immediately before Merge, confirm ordinary CI is green and review the checklist.

## Tests and docs

- [ ] Tests were added or updated for behavior changes.
- [ ] Docs/checklists were added or updated for process or setup changes.

## DB profile safety

- [ ] Development validation uses `pnpm env:dev` and the dev database profile.
- [ ] Personal daily-use validation uses `pnpm env:personal` only after merge/promotion readiness.
- [ ] Destructive commands are dev-scoped, or personal reset requires explicit confirmation.
