# External Delivery Settings Evidence

This change documents the repository workflow. It does not modify GitHub-hosted settings.

## Deferred settings

- No GitHub ruleset changes were applied by this change.
- No required-check changes were applied by this change.
- No merge-restriction changes were applied by this change.

The CI workflow itself enforces that a pull request targeting `master` has `dev` as its source branch. This repository-level contract does not claim to configure or replace GitHub rulesets.

## Hardening review triggers

Review this record before granting repository write access to another person or automation principal. Also review it when changing branch protections, required checks, merge queue settings, deployment credentials, or the promotion/recovery model.

For each review, record the date, reviewer, setting considered, decision, and any resulting Git or GitHub evidence in the related Issue or PR.
