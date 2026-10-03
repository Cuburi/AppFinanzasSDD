import type { SavingsPocketMovement } from "../../../types";

type PocketRecentMovementsProps = {
  movements: SavingsPocketMovement[];
};

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

const movementProvenance = (movement: SavingsPocketMovement) => {
  if (movement.sourceKind === "EXTERNAL") return movement.sourceLabel ? `Externo — ${movement.sourceLabel}` : "Origen externo";
  if (movement.type === "POCKET_DEPOSIT_FROM_AVAILABLE") return "Financiado por mes — Disponible del mes";
  if (movement.type === "POCKET_DEPOSIT_FROM_SUBCATEGORY") return "Financiado por mes — Subcategoría";
  if (movement.type === "DEFICIT_COVER_FROM_POCKET") return "Retiro o gasto del bolsillo";
  return "Movimiento de bolsillo";
};

export const PocketRecentMovements = ({ movements }: PocketRecentMovementsProps) => (
  <section className="pocket-recent-movements" aria-label="Movimientos recientes">
    <div className="pocket-recent-movements-heading">
      <h4>Movimientos recientes</h4>
      {movements.length > 0 ? <span>{Math.min(movements.length, 5)} más recientes</span> : null}
    </div>
    {movements.length > 0 ? (
      <ul>
        {movements.slice(0, 5).map((movement) => (
          <li className={`pocket-movement pocket-movement-${movement.direction}`} key={movement.id}>
            <div className="pocket-movement-main">
              <span className="pocket-movement-direction">{movement.direction === "in" ? "Entrada" : "Salida"}</span>
              <strong>{formatMoney(movement.amount)}</strong>
              <span>{movement.description ?? "Movimiento sin descripción"}</span>
            </div>
            <div className="pocket-movement-meta">
              <time dateTime={movement.occurredAt}>{new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(movement.occurredAt))}</time>
              <span>{movementProvenance(movement)}</span>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="pocket-movements-empty">No se recibieron movimientos recientes.</p>
    )}
  </section>
);
