import type { SavingsPocketMovement } from "../../../types";

type PocketRecentMovementsProps = {
  movements: SavingsPocketMovement[];
};

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

const movementProvenance = (movement: SavingsPocketMovement) => {
  if (movement.sourceKind === "EXTERNAL") return movement.sourceLabel ? `Externo — ${movement.sourceLabel}` : "Origen externo";
  if (movement.type === "POCKET_DEPOSIT_FROM_AVAILABLE") return "Financiado por mes — Disponible del mes";
  if (movement.type === "POCKET_DEPOSIT_FROM_SUBCATEGORY") return "Financiado por mes — Subcategoría";
  return "Movimiento de bolsillo";
};

export const PocketRecentMovements = ({ movements }: PocketRecentMovementsProps) => (
  <div>
    <strong>Movimientos recientes</strong>
    {movements.length > 0 ? (
      <ul>
        {movements.slice(0, 5).map((movement) => (
          <li key={movement.id}>
            <time dateTime={movement.occurredAt}>{new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(movement.occurredAt))}</time> · {movement.direction === "in" ? "Entrada" : "Salida"} {formatMoney(movement.amount)} · {movement.description ?? "Movimiento sin descripción"} · {movementProvenance(movement)}
          </li>
        ))}
      </ul>
    ) : (
      <p>No se recibieron movimientos recientes.</p>
    )}
  </div>
);
