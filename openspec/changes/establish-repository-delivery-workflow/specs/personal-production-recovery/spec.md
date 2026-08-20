# Personal Production Recovery Specification

## Purpose

Define safe, local, auditable recovery for the personal production PostgreSQL database without claiming hosted or off-device durability.

## Requirements

### Requirement: Guarded production backup

Before data-risking changes, and on the documented periodic cadence, an operator MUST be able to create a PostgreSQL backup only under an explicit production profile. The backup MUST be an identifiable local file with traceable timestamp/context, written outside the PostgreSQL volume/container, and MUST NOT contain committed secrets or be silently redirected to an unsafe destination. Off-device copies and hosted backup are out of scope.

#### Scenario: Safe backup succeeds

- GIVEN the production profile and an allowed external-to-volume destination are explicitly selected
- WHEN the operator runs the backup procedure
- THEN a uniquely identifiable backup file is created outside the PostgreSQL volume/container
- AND the command reports the destination and success without printing credentials

#### Scenario: Unsafe target is rejected

- GIVEN the destination is inside the PostgreSQL volume/container, missing, ambiguous, or the profile is not production
- WHEN the operator requests a production backup
- THEN the operation fails before database export
- AND the diagnostic states the required profile or destination correction

### Requirement: Isolated restore verification

Each recovery exercise MUST restore a selected backup into disposable isolation separate from the live production database and MUST verify restoration using observable PostgreSQL connectivity and data checks. A restore MUST NOT overwrite or connect to live production by default.

#### Scenario: Backup restores in isolation

- GIVEN a readable backup file and a disposable isolated target
- WHEN the operator restores and runs verification checks
- THEN the isolated database becomes reachable
- AND the checks confirm expected schema/data presence while production remains unchanged

#### Scenario: Corrupt or wrong backup fails safely

- GIVEN the backup is unreadable, invalid, or fails verification
- WHEN isolated restoration is attempted
- THEN the exercise is marked failed and the isolated target is discarded or quarantined
- AND no live production data is modified

### Requirement: Recovery evidence and diagnostics

Every backup and restore exercise MUST record timestamp, operator/context, source backup identity, destination class, profile, outcome, verification results, and actionable diagnostics. Evidence MUST be retained locally with the recovery record and MUST distinguish backup success from restore-verification success.

#### Scenario: Successful exercise is auditable

- GIVEN backup creation and isolated verification both succeed
- WHEN the operator closes the exercise
- THEN one evidence record contains both outcomes and the verification result

#### Scenario: Partial failure is visible

- GIVEN backup succeeds but restore verification fails or cannot run
- WHEN the exercise is recorded
- THEN backup and restore statuses are reported separately as incomplete/failed
- AND the record identifies the next recovery action
