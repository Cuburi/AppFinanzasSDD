# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

An ordinary person managing personal finances. Their primary Active Month job is to understand, within 30 seconds, how much money remains available for the current month. A secondary job is to register an expense quickly so that available money remains accurate.

## Product Purpose

AppFinanzasSDD is a personal-finance application for organizing monthly budgets by category and subcategory, tracking income and expenses, separating spending from money reserved for future purposes, and supporting more informed monthly decisions. Success means the person can reliably see their remaining monthly availability and keep it current through expense registration.

## Positioning

The product is organized around a monthly lifecycle: one active month at a time, with calculated monthly availability and budget snapshots by category and subcategory. Differentiated market positioning is an open decision.

## Operating Context

The product is used to manage an active or closed month. The current implementation includes monthly incomes, expenses, cash withdrawals, physical cash, pockets, card deposits, and budget structures. It also has local degraded states. Cash withdrawal and cash-paid expense handling affect available money and physical cash differently.

## Capabilities and Constraints

- Monthly budgets are organized by categories and subcategories.
- Expenses can be recorded with date, payment method, and optional description; registering them updates the relevant calculated availability.
- One active month is supported at a time; months can be closed.
- The MVP currently has no authentication and assumes one implicit user.
- The current application is implemented as a React/Vite frontend with an Express/TypeScript backend and PostgreSQL via Prisma.
- Open decision: data privacy, backup, multi-user support, and authentication requirements have not been confirmed.

## Evidence on Hand

- `README.md` documents the product purpose, domain rules, local usage, and implemented technology.
- Repository modules and client routes evidence the monthly lifecycle, pockets, debts, credit cards, reports, active/closed months, and degraded-state handling.
- No validated testimonials, customer claims, positioning claims, or brand assets have been provided; future work must not fabricate them.

## Product Principles

1. **Make remaining monthly availability immediately legible.** The Active Month must answer the primary question within 30 seconds.
2. **Protect accuracy through low-friction expense capture.** Recording an expense must be fast enough to happen when the expense occurs.
3. **Preserve financial meaning.** Available money, category/subcategory budgets, reserved money, and physical cash must not be presented as interchangeable balances.
4. **Reflect the current month truthfully.** Active, closed, and degraded states must clearly communicate what can be acted on and how reliable the displayed information is.

## Accessibility & Inclusion

Open decision: product-specific accessibility requirements and supported standards have not been confirmed.
