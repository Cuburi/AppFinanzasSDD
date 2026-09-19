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


### Requirement: Nullable and atomic expense classification

The system MUST allow both category and subcategory to be absent. They MUST be supplied or omitted together; partial classification MUST be rejected. Categorized behavior remains unchanged, and the public contract MUST express absence without a synthetic category.

#### Scenario: Record an uncategorized expense

- GIVEN an active month and valid expense details without classification
- WHEN the expense is recorded
- THEN it is accepted with both values absent

#### Scenario: Reject partial classification

- GIVEN an active month and exactly one classification value
- WHEN the expense is recorded or updated
- THEN validation rejects it and no partial expense persists

#### Scenario: Preserve categorized compatibility

- GIVEN valid category and subcategory
- WHEN a categorized expense is recorded or read
- THEN existing categorized behavior remains unchanged

### Requirement: Include uncategorized expenses in financial results

The system MUST include uncategorized expenses in totals, balances, ledger/history, and reports. Reports MUST expose an explicit `Uncategorized` group.

#### Scenario: Aggregate an uncategorized expense

- GIVEN categorized and uncategorized expenses
- WHEN totals, balance, ledger, or reports are requested
- THEN each result includes the uncategorized amount once
- AND the report contains an `Uncategorized` group

#### Scenario: Empty uncategorized result

- GIVEN a month containing no uncategorized expenses
- WHEN an uncategorized report group or filtered list is requested
- THEN it returns an empty valid result

### Requirement: Explicit uncategorized history filtering and presentation

History and expense lists MUST expose an explicit `Uncategorized` filter. UI MUST use the accessible label `Uncategorized`, never a blank category or failure.

#### Scenario: Filter only uncategorized expenses

- GIVEN history with both expense types
- WHEN the `Uncategorized` filter is selected
- THEN only expenses with both classification values absent are returned

#### Scenario: Read nullable data safely

- GIVEN an uncategorized public result
- WHEN history, ledger, or report data is rendered
- THEN it remains visible with the `Uncategorized` label

### Requirement: Active-month categorization and closed-month immutability

The system MUST allow categorization while the owning month is active. Once closed, the expense remains valid and unchanged; recording, editing, deleting, or reclassifying it MUST be rejected. RM-012 retry protection is out of scope.

#### Scenario: Categorize during an active month

- GIVEN an uncategorized active-month expense and valid classification
- WHEN it is categorized
- THEN it succeeds and results treat it as categorized

#### Scenario: Reject reclassification after close

- GIVEN an uncategorized expense in a closed month
- WHEN any write or categorization operation targets it
- THEN it is rejected and remains unchanged

#### Scenario: Preserve closed-month reads

- GIVEN a closed month with an uncategorized expense
- WHEN totals, history, ledger, or reports are requested
- THEN it remains included and is shown in `Uncategorized`

### Requirement: Month-level authority during closure

Month-level remaining money MUST be authoritative cash availability at closure. Positive category/subcategory balance MUST remain visible as informational budget variance and MUST NOT be transferable cash, recreated as money, or block closure when month money is reconciled. Category-deficit closure behavior remains unchanged.

#### Scenario: Close with uncategorized spending and surplus variance

- GIVEN an active month with income of 10,000, an uncategorized non-cash expense of 10,000, and a category/subcategory surplus of 10,000
- WHEN closure is reviewed and the month is closed
- THEN month-level remaining money is 0, the surplus is visible as informational variance, and closure succeeds without a surplus transfer

#### Scenario: Present variance without cash semantics

- GIVEN a closure review with reconciled month-level remaining money and positive category variance
- WHEN the review is displayed
- THEN the variance is labeled as budget variance and is not offered as a transfer action or included in remaining money
