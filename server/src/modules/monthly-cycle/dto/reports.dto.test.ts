import test from "node:test";
import assert from "node:assert/strict";

import { parseBasicReportInput } from "./reports.dto.js";

test("basic report DTO parsing rejects blank month ids", () => {
  assert.throws(() => parseBasicReportInput(""), /month id is required/i);
  assert.throws(() => parseBasicReportInput("   "), /month id is required/i);
});

test("basic report DTO parsing returns a trimmed month id", () => {
  assert.deepEqual(parseBasicReportInput(" month-1 "), { monthId: "month-1" });
});
