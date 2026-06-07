const BRANCH_NAME_PATTERN = /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$/;
const ISSUE_OR_SDD_REFERENCE_PATTERN =
  /\b(Refs|Closes|Fixes|Resolves)\s+#\d+\b|\bSDD\s*:|\bSDD\s+change\b/i;

function parseLabels(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Fall back to a comma-separated local format.
  }

  return value
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

export function validatePullRequestGovernance(metadata) {
  const headRef = metadata.headRef?.trim() ?? '';
  const baseRef = metadata.baseRef?.trim() ?? '';
  const body = metadata.body ?? '';
  const labels = parseLabels(metadata.labels);
  const errors = [];

  if (headRef === 'dev') {
    if (baseRef !== 'master') {
      errors.push('`dev` may only target `master` for promotion PRs.');
    }
  } else if (baseRef === 'master') {
    errors.push('feature branches must target `dev`; only `dev` may target `master`.');
  } else if (baseRef !== 'dev') {
    errors.push('normal feature branches must target `dev`.');
  } else if (!BRANCH_NAME_PATTERN.test(headRef)) {
    errors.push(
      'source branch must match `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)/[a-z0-9._-]+$` for PRs to `dev`.',
    );
  }

  const typeLabels = labels.filter((label) => label.startsWith('type:'));
  if (typeLabels.length !== 1) {
    errors.push('PR must have exactly one `type:` label.');
  }

  if (!ISSUE_OR_SDD_REFERENCE_PATTERN.test(body)) {
    errors.push(
      'PR body must include an issue or SDD reference: Refs #N, Closes #N, Fixes #N, Resolves #N, SDD:, or SDD change.',
    );
  }

  return errors;
}

function metadataFromEnv(env) {
  return {
    number: env.PR_NUMBER ?? '',
    title: env.PR_TITLE ?? '',
    headRef: env.PR_HEAD_REF ?? '',
    baseRef: env.PR_BASE_REF ?? '',
    labels: env.PR_LABELS ?? '',
    body: env.PR_BODY ?? '',
  };
}

const metadata = metadataFromEnv(process.env);
const errors = validatePullRequestGovernance(metadata);

if (errors.length > 0) {
  console.error(`PR governance metadata failed for #${metadata.number || 'unknown'}: ${metadata.title}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('PR governance metadata is valid.');
