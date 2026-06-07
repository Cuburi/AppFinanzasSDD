import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./check-pr-governance.mjs', import.meta.url));
const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

function runGovernance(env) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PR_NUMBER: '42',
      PR_TITLE: 'Example PR',
      PR_HEAD_REF: 'feat/example-change',
      PR_BASE_REF: 'dev',
      PR_LABELS: 'type:feature',
      PR_BODY: 'Refs #123',
      ...env,
    },
    encoding: 'utf8',
  });
}

function assertPasses(name, env) {
  const result = runGovernance(env);
  assert.equal(result.status, 0, `${name} should pass, got: ${result.stderr}`);
  assert.match(result.stdout, /PR governance metadata is valid\./);
}

function assertFails(name, env, expectedMessage) {
  const result = runGovernance(env);
  assert.notEqual(result.status, 0, `${name} should fail`);
  assert.match(result.stderr, expectedMessage);
}

assertPasses('feature PR to dev', {
  PR_HEAD_REF: 'fix/monthly-cycle-null-state',
  PR_BASE_REF: 'dev',
  PR_LABELS: 'type:bug',
  PR_BODY: 'Closes #77',
});

assertPasses('promotion PR from dev to master', {
  PR_HEAD_REF: 'dev',
  PR_BASE_REF: 'master',
  PR_LABELS: 'type:promotion',
  PR_BODY: 'SDD: promote stable dev changes',
});

assertFails('feature PR cannot target master', {
  PR_HEAD_REF: 'feat/skip-dev',
  PR_BASE_REF: 'master',
}, /feature branches must target `dev`/);

assertFails('invalid feature branch name', {
  PR_HEAD_REF: 'feature/bad-prefix',
  PR_BASE_REF: 'dev',
}, /source branch must match/);

assertFails('dev cannot target dev', {
  PR_HEAD_REF: 'dev',
  PR_BASE_REF: 'dev',
}, /`dev` may only target `master`/);

assertFails('exactly one type label required', {
  PR_LABELS: 'type:feature,type:bug',
}, /exactly one `type:` label/);

assertFails('issue or SDD reference required', {
  PR_BODY: 'No reference yet.',
}, /body must include an issue or SDD reference/);

for (const snippet of [
  'Check PR governance metadata',
  'node scripts/check-pr-governance.mjs',
  'PR_HEAD_REF: ${{ github.event.pull_request.head.ref }}',
  'PR_BASE_REF: ${{ github.event.pull_request.base.ref }}',
  'PR_LABELS: ${{ toJson(github.event.pull_request.labels.*.name) }}',
  'PR_BODY: ${{ github.event.pull_request.body }}',
]) {
  assert.ok(workflow.includes(snippet), `.github/workflows/ci.yml missing: ${snippet}`);
}

console.log('PR governance contract is valid.');
