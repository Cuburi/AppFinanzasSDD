import test from "node:test";
import assert from "node:assert/strict";

import { calculateStatementCycle } from "./statement-cycle.js";

test("statement cycle uses prior cutoff plus one day through current cutoff with next-month due date", () => {
  const cycle = calculateStatementCycle({ closingDay: 15, dueDay: 4, today: new Date("2026-07-10T18:30:00.000Z") });

  assert.deepEqual(cycle, {
    cycleStart: "2026-06-16",
    cycleEnd: "2026-07-15",
    cutoffDate: "2026-07-15",
    dueDate: "2026-08-04",
    from: new Date("2026-06-16T00:00:00.000Z"),
    to: new Date("2026-07-15T23:59:59.999Z"),
  });
});

test("statement cycle advances after cutoff and clamps closing and due days in short months", () => {
  const cycle = calculateStatementCycle({ closingDay: 31, dueDay: 31, today: new Date("2026-03-01T12:00:00.000Z") });

  assert.deepEqual(cycle, {
    cycleStart: "2026-03-01",
    cycleEnd: "2026-03-31",
    cutoffDate: "2026-03-31",
    dueDate: "2026-04-30",
    from: new Date("2026-03-01T00:00:00.000Z"),
    to: new Date("2026-03-31T23:59:59.999Z"),
  });
});
