# Personal-use backlog

Use this file to capture real-use frictions and follow-up ideas before they become scoped issues/PRs.

## Inbox

- [ ] Recurring expenses.
- [ ] Improve success and error feedback beyond plain colored text.
- [ ] Improve the credit-card screen and logic after reviewing its current capabilities and defining the desired changes.

### User reports — monthly-use review

Additional report: "Me falto algo, el hacer un deposito a un bolsillo el campo de monto es mas pequeño que los demas, mejorar eso tambien"

1. "Mejorar las alertas de exito y error, solo son un texto verde"
2. "Intente guardar gastos el 31 de Oct y me decia que deberia de estar linkeado al mes activo que wefectivamente era octubre pero el 30 si me dejo, sospecho que son los meses que tienen 31 dias"
3. "Mejorar ui y logica del apartado del credit card (recurdame que permite hacer ahora mismo en este aspecto)"
4. "Mejorar pantalla de cierre de mes y lógica porque no se si siempre convenga que el mes quede en 0, me refiero si me sobro plata pero que no ira a ningun bolsillo"

## Recently resolved / no longer pending

- [x] Pocket deposit form: amount field at full field width (withdrawal amount too) and a “Usar máximo disponible” shortcut that fills the selected subcategory or month available amount without saving. Issue #223, PR #224. Client 267/267, TypeScript, build, Playwright 8/8 and Chromium 1440/320 passed; CI green.

- [x] Implement guided monthly closure with carry-all, exclude-all or exact split of surplus, persisted closure history and one-time opening balance distinct from income; preserve physical cash separately. Approved artboard: `design/monthly-closure/02-guided.html`; implementation/evidence: `odd/tasks/guided-monthly-closure.md`. Full server 353/353, full client suite, TypeScript/build and Chromium 1440/320 passed. Independent verification PASS: 50 focused tests, 15 PostgreSQL/HTTP probe groups and 19 baseline response comparisons; no blockers. Canvas handoff implemented. Delivered on `feat/guided-monthly-closure` in four commits; native review approved the three code commits with exact acknowledgement, and the evidence-only commit was approved but its acknowledgement was blocked by a review-tool defect (accepted by user disposition). No personal database migration.

- [x] Fix month-end expense-date rejection caused by local/UTC mismatch after 19:00 in Colombia, not by 31-day months. Expense-only explicit-offset submission and calendar-month validation preserve the real instant and boundary edit round trips. RED observed; focused server 24/24, full client 249/249, TypeScript, write-free production build, and isolated Chromium submission passed. Full server suite passed 342/342 with zero failures/skips using child-only dev PostgreSQL configuration (`postgres-dev`, port 5433, database `appfinanzas_dev`), resolving the six previous profile-dependent failures. Root `.env` and personal profile/data remained unchanged. Native assessment was unavailable due to undeclared untracked files; no review started.

- [x] Prevent the expense registration form layout from breaking when expenses are expanded. The expense form keeps its intrinsic height and draft values through ledger expansion, entry details, and collapse. Verified with Chromium at 320px and 1280px, existing expense filters, 21 visual contracts, TypeScript, and production build. Full client suite was not rerun after its earlier timeout. Native read-only assessment subsequently passed with explicit intended-untracked scope: medium risk, 10 paths / 320 changed lines, review not due (under budget).

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
