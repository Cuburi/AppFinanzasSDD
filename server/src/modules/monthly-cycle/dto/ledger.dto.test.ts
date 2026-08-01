import test from "node:test";
import assert from "node:assert/strict";

import { parseMonthlyLedgerQueryInput } from "./ledger.dto.js";
import { SemanticError } from "../shared/service-errors.js";

test("ledger query DTO maps blank month ids to semantic client errors", () => {
  assert.throws(
    () => parseMonthlyLedgerQueryInput("   ", {}),
    (error: unknown) => error instanceof SemanticError
      && error.code === "INVALID_QUERY"
      && error.statusCode === 400
      && error.message === "Month id is required.",
  );
});

test("ledger query DTO trims month ids and parses valid system-event flags", () => {
  assert.deepEqual(
    parseMonthlyLedgerQueryInput(" month-1 ", { includeSystemEvents: "true" }),
    { monthId: "month-1", includeSystemEvents: true },
  );
});
