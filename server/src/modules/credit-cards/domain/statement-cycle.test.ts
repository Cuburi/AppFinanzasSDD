import test from "node:test";
import assert from "node:assert/strict";

import { calculateStatementCycle, calculateStatementPeriodSplit } from "./statement-cycle.js";

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

test("statement period split includes the cutoff day in the closed statement and starts the open cycle on the next UTC day", () => {
  assert.deepEqual(calculateStatementPeriodSplit({ closingDay: 15, dueDay: 4, today: new Date("2026-07-15T18:30:00.000Z") }), {
    closedStatement: {
      periodStart: "2026-06-16",
      periodEnd: "2026-07-15",
      cutoffDate: "2026-07-15",
      dueDate: "2026-08-04",
      from: new Date("2026-06-16T00:00:00.000Z"),
      to: new Date("2026-07-15T23:59:59.999Z"),
    },
    inProgressCycle: {
      periodStart: "2026-07-16",
      periodEnd: "2026-08-15",
      cutoffDate: "2026-08-15",
      from: new Date("2026-07-16T00:00:00.000Z"),
      to: new Date("2026-08-15T23:59:59.999Z"),
    },
  });
});

test("statement period split keeps the same windows on the day after cutoff and clamps short-month cutoffs", () => {
  assert.deepEqual(calculateStatementPeriodSplit({ closingDay: 31, dueDay: 31, today: new Date("2026-03-01T12:00:00.000Z") }), {
    closedStatement: {
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
      cutoffDate: "2026-02-28",
      dueDate: "2026-03-31",
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-28T23:59:59.999Z"),
    },
    inProgressCycle: {
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      cutoffDate: "2026-03-31",
      from: new Date("2026-03-01T00:00:00.000Z"),
      to: new Date("2026-03-31T23:59:59.999Z"),
    },
  });
});
