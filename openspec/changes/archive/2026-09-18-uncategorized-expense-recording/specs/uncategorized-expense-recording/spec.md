# Uncategorized Expense Recording Specification

## Purpose

Define expense classification, financial aggregation, history/report presentation, and month-lifecycle behavior when an expense has no category.

## Requirements

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
