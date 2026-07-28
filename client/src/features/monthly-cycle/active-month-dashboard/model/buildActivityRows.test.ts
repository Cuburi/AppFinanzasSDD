import { describe, expect, it } from "vitest";

import { buildActivityRows } from "./buildActivityRows";

describe("buildActivityRows", () => {
  it("normalizes existing income and expense records into descending chronological activity rows", () => {
    const rows = buildActivityRows(
      [
        {
          id: "expense-older",
          occurredAt: "2026-05-03T00:00:00.000Z",
          paymentMethod: "CASH",
          amount: 20,
          description: "Café",
          creditCardId: null,
          category: { id: "category-1", name: "Comida" },
          subcategory: { id: "subcategory-1", name: "Cafeterías" },
        },
      ],
      [
        {
          id: "income-newer",
          monthId: "month-1",
          sourceName: "Sueldo",
          amount: 1000,
          receivedAt: "2026-05-05T00:00:00.000Z",
          notes: "Neto",
          createdAt: "2026-05-05T00:00:00.000Z",
          updatedAt: "2026-05-05T00:00:00.000Z",
        },
      ],
    );

    expect(rows).toEqual([
      expect.objectContaining({ id: "income-newer", type: "income", date: "2026-05-05T00:00:00.000Z", concept: "Sueldo", amount: 1000, metadata: "Neto" }),
      expect.objectContaining({ id: "expense-older", type: "expense", date: "2026-05-03T00:00:00.000Z", concept: "Café", amount: -20, metadata: "Cafeterías · Comida · Efectivo" }),
    ]);
  });

  it("keeps same-day records deterministic and gives an income without notes explicit metadata", () => {
    const rows = buildActivityRows(
      [],
      [
        { id: "income-b", monthId: "month-1", sourceName: "Venta", amount: 40, receivedAt: "2026-05-05T00:00:00.000Z", notes: null, createdAt: "", updatedAt: "" },
        { id: "income-a", monthId: "month-1", sourceName: "Reembolso", amount: 25, receivedAt: "2026-05-05T00:00:00.000Z", notes: null, createdAt: "", updatedAt: "" },
      ],
    );

    expect(rows.map(({ id, metadata }) => ({ id, metadata }))).toEqual([
      { id: "income-a", metadata: "Sin notas" },
      { id: "income-b", metadata: "Sin notas" },
    ]);
  });
});
