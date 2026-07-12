import test from "node:test";
import assert from "node:assert/strict";

import { createCreditCard, CreditCardValidationError, rehydrateCreditCard, toCreditCardView } from "./credit-card.js";

test("createCreditCard normalizes valid owned card input", () => {
  const card = createCreditCard("owner-1", {
    issuer: " Visa ",
    name: " Main Card ",
    limit: 2500000,
    closingDay: 15,
    dueDay: 28,
  });

  assert.deepEqual(card, {
    ownerId: "owner-1",
    issuer: "Visa",
    name: "Main Card",
    limit: 2500000,
    closingDay: 15,
    dueDay: 28,
    active: true,
  });
});

test("createCreditCard rejects missing text, invalid days, and non-positive limits", () => {
  assert.throws(() => createCreditCard("owner-1", { issuer: "", name: "Main", closingDay: 1, dueDay: 1 }), CreditCardValidationError);
  assert.throws(() => createCreditCard("owner-1", { issuer: "Visa", name: "Main", limit: 0, closingDay: 1, dueDay: 1 }), CreditCardValidationError);
  assert.throws(() => createCreditCard("owner-1", { issuer: "Visa", name: "Main", closingDay: 0, dueDay: 32 }), CreditCardValidationError);
});

test("rehydrateCreditCard and toCreditCardView preserve inactive historical cards", () => {
  const card = rehydrateCreditCard({
    id: "card-1",
    ownerId: "owner-1",
    issuer: " Mastercard ",
    name: " Backup ",
    limit: null,
    closingDay: 5,
    dueDay: 20,
    active: false,
  });

  assert.deepEqual(toCreditCardView(card), {
    id: "card-1",
    ownerId: "owner-1",
    issuer: "Mastercard",
    name: "Backup",
    limit: null,
    closingDay: 5,
    dueDay: 20,
    active: false,
  });
});
