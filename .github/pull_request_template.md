## Approved issue

- [ ] This PR links an approved issue or SDD change.

## Type label

- [ ] Exactly one `type:*` label is applied.

## CI is green

- [ ] CI is green on this PR.
- [ ] Branch release readiness checks passed.

## Tests and docs

- [ ] Tests were added or updated for behavior changes.
- [ ] Docs/checklists were added or updated for process or setup changes.

## DB profile safety

- [ ] Development validation uses `pnpm env:dev` and the dev database profile.
- [ ] Personal daily-use validation uses `pnpm env:personal` only after merge/promotion readiness.
- [ ] Destructive commands are dev-scoped, or personal reset requires explicit confirmation.
