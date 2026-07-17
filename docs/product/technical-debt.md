# Product Technical Debt

This document tracks product and contract debt that can affect user trust, financial correctness, or future implementation slices. Items here are not cosmetic polish; they should be resolved before the product depends on the ambiguous behavior.

## Credit card statement period split

**Status:** Backend contract implemented; frontend presentation remains pending.

### Problem

The current Credit Cards dashboard does not distinguish between:

- closed statement amount due now
- new in-progress cycle spending after the latest cutoff

Example:

- Closed statement until yesterday: `200000`
- New cycle spending today: `90000`

The user needs to understand that `200000` is payable now, while `90000` belongs to the next cycle.

### Risk

A single "current statement" amount can mislead the user into mixing payable debt with new-cycle spending. In a finance app, this is more than a UI wording issue: it can cause the user to make the wrong payment decision.

### Needed

Audit and likely extend the backend contract so the frontend can show both statement periods explicitly:

- amount due now
- due date
- closed statement cycle range
- current/new cycle spending
- next cutoff date

### Constraint

The frontend must not invent this split if the backend does not expose it. The UI can label current backend values more carefully, but a true split requires a trustworthy backend contract.

### Candidate Slice

`credit-card-statement-period-split`

Expected scope:

- verify current backend semantics
- extend statement summary contract if needed
- update Credit Cards dashboard to separate "to pay now" from "current cycle spending"
- add regression tests for cutoff-boundary examples

## Credit card statement payment tracking

**Status:** Deferred — not implemented.

### Problem

The statement endpoint reports the original consumption inside `closedStatement.amount`, but the system cannot record whether that statement has been paid. Paying the physical card therefore does not reduce any application-owned outstanding balance.

### Risk

Once the due date approaches, the user can see the correct statement total but cannot distinguish an unpaid statement from one already paid. Overwriting `closedStatement.amount` with zero would also destroy the historical statement value.

### Needed

Add explicit statement-payment tracking while preserving the original amount:

- `paidAmount`
- `remainingAmount`
- payment status such as `UNPAID`, `PARTIALLY_PAID`, or `PAID`
- payment date and payment history
- partial-payment and overpayment rules

### Constraint

A credit-card payment must be recorded as a non-expense financial movement. The purchase was already counted as an expense when it occurred; recording the payment as another expense would double-count spending.

### Candidate Slice

`credit-card-statement-payment-tracking`

Expected scope:

- define statement identity and persistence across billing periods
- register full and partial payments
- update available cash without duplicating expenses
- expose original, paid, and remaining amounts in the statement contract
- add regression tests for repeated, partial, and excessive payments

## Credit card statement history

**Status:** Deferred — the current endpoint exposes a rolling snapshot only.

### Problem

`GET /api/credit-cards/statements/current` recalculates the latest closed statement and in-progress cycle from the current date. After the next cutoff, the previous closed statement is no longer returned by this endpoint.

### Risk

The user can understand the current billing position but cannot browse, reconcile, or audit older statements. Future payment tracking also needs a stable statement identity instead of relying only on calculated date ranges.

### Needed

- persist or expose addressable historical statements
- assign a stable statement identity per card and period
- retain original period totals after later expense edits according to an explicit reconciliation policy
- list statements by card and period
- connect statement payments to the exact historical statement

### Candidate Slice

`credit-card-statement-history`
