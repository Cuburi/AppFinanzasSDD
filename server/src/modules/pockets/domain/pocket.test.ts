import test from "node:test";
import assert from "node:assert/strict";

import { calculatePocketBalance, createPocket, normalizePocketName, projectRecentMovements, rehydratePocket, toPocketView } from "./pocket.js";

test("pocket domain normalizes names and calculates balance from incoming minus outgoing movements", () => {
  const pocket = rehydratePocket({
    id: "pocket-1",
    name: "  Emergency  ",
    goalAmount: 1000,
    active: true,
    incomingMovements: [{ id: "in-1", type: "POCKET_DEPOSIT_EXTERNAL", amount: 125.55, occurredAt: new Date("2026-05-10T00:00:00.000Z"), description: null }],
    outgoingMovements: [{ id: "out-1", type: "DEFICIT_COVER_FROM_POCKET", amount: 25.1, occurredAt: new Date("2026-05-11T00:00:00.000Z"), description: "Coverage" }],
  });

  assert.equal(normalizePocketName("  Emergency  "), "Emergency");
  assert.equal(calculatePocketBalance(pocket), 100.45);
  assert.equal(pocket.name, "Emergency");
});

test("pocket domain projects the latest five movements with directions and ISO dates", () => {
  const pocket = rehydratePocket({
    id: "pocket-1",
    name: "Emergency",
    goalAmount: null,
    active: true,
    incomingMovements: [1, 2, 3].map((day) => ({ id: `in-${day}`, type: "POCKET_DEPOSIT_EXTERNAL", amount: day, occurredAt: new Date(`2026-05-0${day}T00:00:00.000Z`), description: null })),
    outgoingMovements: [4, 5, 6].map((day) => ({ id: `out-${day}`, type: "DEFICIT_COVER_FROM_POCKET", amount: day, occurredAt: new Date(`2026-05-0${day}T00:00:00.000Z`), description: null })),
  });

  const recentMovements = projectRecentMovements(pocket);

  assert.deepEqual(recentMovements.map((movement) => movement.id), ["out-6", "out-5", "out-4", "in-3", "in-2"]);
  assert.equal(recentMovements[0]?.direction, "out");
  assert.equal(recentMovements[4]?.direction, "in");
  assert.equal(toPocketView(pocket).recentMovements[0]?.occurredAt, "2026-05-06T00:00:00.000Z");
});

test("createPocket returns normalized data with active default", () => {
  assert.deepEqual(createPocket({ name: "  Travel  ", goalAmount: undefined }), { name: "Travel", goalAmount: null, active: true });
});
