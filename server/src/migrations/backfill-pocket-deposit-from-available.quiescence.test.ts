import assert from "node:assert/strict";
import test from "node:test";

import { validateQuiescenceInput } from "../../../scripts/backfill-pocket-deposit-from-available.mjs";

test("quiescence control aborts unless writers are explicitly disabled and drained", () => {
  assert.deepEqual(
    validateQuiescenceInput({ MONTHLY_LEDGER_WRITERS_QUIESCED: "false", MONTHLY_LEDGER_ACTIVE_DEPOSIT_WRITERS: "0" }),
    { ok: false, message: "Set MONTHLY_LEDGER_WRITERS_QUIESCED=true before backfill." },
  );
  assert.deepEqual(
    validateQuiescenceInput({ MONTHLY_LEDGER_WRITERS_QUIESCED: "true", MONTHLY_LEDGER_ACTIVE_DEPOSIT_WRITERS: "1" }),
    { ok: false, message: "MONTHLY_LEDGER_ACTIVE_DEPOSIT_WRITERS must be exactly 0." },
  );
});

test("quiescence control accepts an explicit zero-writer attestation", () => {
  assert.deepEqual(
    validateQuiescenceInput({ MONTHLY_LEDGER_WRITERS_QUIESCED: "true", MONTHLY_LEDGER_ACTIVE_DEPOSIT_WRITERS: "0" }),
    { ok: true },
  );
});
