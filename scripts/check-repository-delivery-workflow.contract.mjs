import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const repositoryRoot = new URL('../', import.meta.url);

function readRepositoryFile(path) {
  return readFileSync(new URL(path, repositoryRoot), 'utf8');
}

for (const [file, typeLabel] of [
  ['.github/ISSUE_TEMPLATE/bug_report.yml', 'type:bug'],
  ['.github/ISSUE_TEMPLATE/feature_request.yml', 'type:feature'],
]) {
  const form = readRepositoryFile(file);
  assert.match(form, new RegExp(`labels:.*${typeLabel}.*status:needs-review`));
  assert.match(form, /required:\s*true/);
}

assert.match(readRepositoryFile('.github/ISSUE_TEMPLATE/config.yml'), /blank_issues_enabled:\s*false/);

const pullRequestTemplate = readRepositoryFile('.github/pull_request_template.md');
for (const item of [
  'Approved issue reviewed (manual convention; not a merge barrier).',
  'Feature PR targets `dev`.',
  'Promotion PR moves `dev` to `master` after `dev` is stable.',
  'CI is green on this PR.',
]) {
  assert.ok(pullRequestTemplate.includes(item), `.github/pull_request_template.md missing: ${item}`);
}
assert.doesNotMatch(pullRequestTemplate, /Approved-Issue:|re-run `PR governance`|current PR head SHA/);

const ciWorkflow = readRepositoryFile('.github/workflows/ci.yml');
for (const context of ['name: Server checks', 'name: Client checks', 'name: Branch release readiness']) {
  assert.ok(ciWorkflow.includes(context), `.github/workflows/ci.yml missing ordinary CI context: ${context}`);
}
assert.doesNotMatch(ciWorkflow, /PR governance|pull_request_target:/);

const packageJson = JSON.parse(readRepositoryFile('package.json'));
assert.equal(packageJson.scripts['local:check-pr-governance'], undefined);
assert.equal(packageJson.scripts['local:check-trusted-pr-governance'], undefined);
assert.equal(
  packageJson.scripts['local:check-repository-delivery-workflow'],
  'node scripts/check-repository-delivery-workflow.contract.mjs',
);

for (const removedPath of [
  'scripts/check-pr-governance.mjs',
  'scripts/github-issue-reader.mjs',
  '.github/workflows/trusted-pr-governance.yml',
]) {
  assert.equal(existsSync(new URL(removedPath, repositoryRoot)), false, `${removedPath} must not remain as automated governance`);
}

console.log('Repository delivery workflow contract is valid.');
