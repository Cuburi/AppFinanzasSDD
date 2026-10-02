# Delta for Uncategorized Expense Recording

## ADDED Requirements

### Requirement: Recover qualifying serialization conflicts

The transaction boundary MUST retry only errors classified simultaneously as Prisma `P2010` and nested PostgreSQL SQLSTATE `40001`. Each retry MUST execute the complete operation in a fresh Serializable transaction and reread the month state.

#### Scenario: Successful bounded retry
- GIVEN a strict deposit loses a serialization race on its first transaction
- WHEN the runner observes `P2010` with nested code `40001`
- THEN it starts a fresh transaction, reruns the complete callback, and returns its committed result

#### Scenario: Other raw-query failure
- GIVEN a callback raises `P2010` without nested code `40001`
- WHEN the runner classifies the error
- THEN it propagates the original failure without retrying or translating it

### Requirement: Close wins the final outcome

After a qualifying retry, the operation MUST return the existing `MONTH_NOT_ACTIVE` domain outcome when the month is closed. It MUST NOT mutate the pocket or create a movement.

#### Scenario: Close wins after retry
- GIVEN close commits while the first deposit transaction is waiting for the month lock
- WHEN the fresh attempt rereads the month as `CLOSED`
- THEN the caller receives `MONTH_NOT_ACTIVE`, the month remains `CLOSED`, and balance and movement counts are unchanged

### Requirement: Bounded exhaustion remains atomic

Qualifying retries MUST share the configured finite transaction-attempt budget. When the budget is exhausted, the runner MUST propagate an explicit exhaustion failure and MUST leave the operation atomic.

#### Scenario: Repeated serialization conflict
- GIVEN every permitted fresh attempt raises `P2010` with nested code `40001`
- WHEN the final attempt fails
- THEN no further attempt occurs, the exhaustion failure is observable, and no partial effect is committed

### Requirement: Preserve unknown P2010 visibility

The system MUST preserve the original error class and safe diagnostic metadata for unknown or non-serialization `P2010` failures. It MUST NOT blanket-map `P2010` to `MONTH_NOT_ACTIVE`.

#### Scenario: Malformed raw query
- GIVEN a raw query raises `P2010` for a non-`40001` defect
- WHEN the operation fails
- THEN the caller and diagnostics can distinguish that infrastructure failure from a closed-month outcome

### Requirement: Prevent duplicate effects

Retries MUST commit at most one successful deposit effect; rolled-back attempts MUST leave no durable writes.

#### Scenario: Effect counts after recovery
- GIVEN an operation succeeds on a later attempt
- WHEN the final state is inspected
- THEN exactly one intended movement and balance effect exists

### Requirement: Provide sanitized observability and deterministic evidence

Retry and exhaustion telemetry MUST expose attempt number, classification, and outcome without SQL text, financial values, or sensitive data. The real-PostgreSQL close-first matrix MUST run all 16 writers using isolated fixtures, release barriers during cleanup, aggregate failures, and assert `MONTH_NOT_ACTIVE`, `CLOSED`, and unchanged counts.

#### Scenario: Matrix reports every writer
- GIVEN the close-first concurrency matrix is executed
- WHEN one writer fails
- THEN remaining writers still execute and the final report identifies every writer outcome and cleanup result

#### Scenario: Telemetry is safe
- GIVEN a retry or exhaustion occurs
- WHEN telemetry is emitted
- THEN it contains sanitized classification and attempt data and excludes SQL and domain-sensitive values
