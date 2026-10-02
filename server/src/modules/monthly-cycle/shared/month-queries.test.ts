import assert from "node:assert/strict";
import test from "node:test";

import { lockMutableMonthForMutation } from "./month-queries.js";
import { MonthStatus } from "../application/monthly-cycle-types.js";

test("lockMutableMonthForMutation rejects a month that closed before its mutation can run", async () => {
  const closedMonth = {
    id: "month-1",
    year: 2026,
    month: 1,
    status: MonthStatus.CLOSED,
    openedAt: new Date("2026-01-01T00:00:00.000Z"),
    closedAt: new Date("2026-01-31T00:00:00.000Z"),
    categories: [],
    incomes: [],
    movements: [],
  };

  await assert.rejects(
    () => lockMutableMonthForMutation({ async lockForMutation() { return closedMonth; } }, "month-1"),
    { statusCode: 409, message: "Closed months are immutable." },
  );
});
