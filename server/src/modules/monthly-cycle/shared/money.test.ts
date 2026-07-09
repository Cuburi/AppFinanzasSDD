import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../../../lib/prisma-client.js";

import { decimal, decimalToNumber } from "./money.js";

test("decimal returns a structural money value with the existing normalized decimal string", () => {
  assert.equal(decimal(10).toString(), new Prisma.Decimal("10.00").toString());
  assert.equal(decimal(10.2).toString(), new Prisma.Decimal("10.20").toString());
  assert.equal(decimal(10.239).toString(), new Prisma.Decimal("10.24").toString());
});

test("decimal does not expose a Prisma Decimal instance from shared money helpers", () => {
  assert.equal(decimal(12.34) instanceof Prisma.Decimal, false);
});

test("decimalToNumber accepts structural money values", () => {
  assert.equal(decimalToNumber({ toString: () => "123.45" }), 123.45);
});
