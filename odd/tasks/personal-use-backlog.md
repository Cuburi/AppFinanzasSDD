# Personal-use backlog

Use this file to capture real-use frictions and follow-up ideas before they become scoped issues/PRs.

## Inbox

- [ ] Recurring expenses.
- [ ] Add a “use maximum available” shortcut when depositing to a pocket from a subcategory.
- [ ] Prevent the expense registration form layout from breaking when expenses are expanded.

## Recently resolved / no longer pending

- [x] Add filters for the expense list and clearly show the date each expense occurred, not just the time. Verified with 66 focused tests, TypeScript, production build, and a Chromium browser test at 320px and 1280px. Full client suite timed out. Native read-only assessment subsequently passed with explicit intended-untracked scope: medium risk, 10 paths / 320 changed lines, review not due (under budget).

- [x] Active Month layout regression.
- [x] Basic COP amount normalization and formatting.
- [x] Pocket external deposits and withdrawals/spending.
- [x] Pockets UI polish.
- [x] Collapsible Template categories.
- [x] Category/subcategory selection clarity.
- [x] Main card spacing, padding, and border polish.
- [x] Movement date/time daily-use polish.
- [x] Responsive menu trigger and drawer polish.
- [x] Active Month category editor and explicit Template propagation.

## Notes

- Keep new entries short and concrete.
- Promote an item to a GitHub issue only when we choose to implement it.
- Group related small frictions into one issue/PR only when they share the same user workflow.
