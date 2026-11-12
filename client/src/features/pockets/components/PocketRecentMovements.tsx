import { useId, useState } from "react";

import { formatBusinessDate } from "../../../lib/businessDate";
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

const previewCount = 3;

export const PocketRecentMovements = ({ movements }: PocketRecentMovementsProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const visibleMovements = showAll ? movements : movements.slice(0, previewCount);
  const hiddenCount = Math.max(movements.length - previewCount, 0);

  return (
    <section className="pocket-recent-movements" aria-label="Movimientos recientes">
      <div className="pocket-recent-movements-heading">
        <h4>Movimientos recientes</h4>
        {movements.length > 0 ? <span>{movements.length} recientes</span> : null}
      </div>
      {movements.length > 0 ? (
        <button
          aria-controls={listId}
          aria-expanded={expanded}
          className="button tertiary pocket-movements-toggle"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Ocultar movimientos" : `Ver movimientos (${movements.length})`}
        </button>
      ) : null}
      {movements.length > 0 && expanded ? (
        <>
          <ul id={listId}>
            {visibleMovements.map((movement) => (
              <li className={`pocket-movement pocket-movement-${movement.direction}`} key={movement.id}>
                <div className="pocket-movement-main">
                  <span className="pocket-movement-direction">{movement.direction === "in" ? "Entrada" : "Salida"}</span>
                  <strong>{formatMoney(movement.amount)}</strong>
                  <span>{movement.description ?? "Movimiento sin descripción"}</span>
                </div>
                <div className="pocket-movement-meta">
                  <time dateTime={movement.occurredAt}>{formatBusinessDate(movement.occurredAt, { dateStyle: "medium" })}</time>
                  <span>{movementProvenance(movement)}</span>
                </div>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <button className="button tertiary pocket-movements-toggle" onClick={() => setShowAll((current) => !current)} type="button">
              {showAll ? "Mostrar menos movimientos" : `Ver ${hiddenCount} movimientos más`}
            </button>
          ) : null}
        </>
      ) : null}
      {movements.length === 0 ? (
        <p className="pocket-movements-empty">No se recibieron movimientos recientes.</p>
      ) : null}
    </section>
  );
};
