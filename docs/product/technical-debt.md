# Product Technical Debt

This document tracks product and contract debt that can affect user trust, financial correctness, or future implementation slices. Items here are not cosmetic polish; they should be resolved before the product depends on the ambiguous behavior.

## Credit card statement period split

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
