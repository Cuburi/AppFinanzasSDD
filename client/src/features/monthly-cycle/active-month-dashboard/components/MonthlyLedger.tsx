import { useId, useState } from "react";

import { Button, Card, SectionHeader } from "../../../../components/ui";
import type { LedgerDay, LedgerViewEntry } from "../model/monthlyLedger";

type MonthlyLedgerProps = {
  days: LedgerDay[];
  actionLabel?: (entry: LedgerViewEntry) => string;
  identityLabel?: (entry: LedgerViewEntry) => string | undefined;
  isActionable?: (entry: LedgerViewEntry) => boolean;
  onDelete?: (entry: LedgerViewEntry) => void;
  onEdit?: (entry: LedgerViewEntry) => void;
  onRetry?: () => void;
  unavailableActionReason?: (entry: LedgerViewEntry) => string | undefined;
  status: "loading" | "refreshing" | "ready" | "error";
};

const eventLabels: Record<string, string> = { MONTHLY_INCOME: "Ingreso", CASH_EXPENSE: "Gasto", NON_CASH_EXPENSE: "Gasto", CASH_WITHDRAWAL: "Retiro de efectivo", POCKET_DEPOSIT_FROM_SUBCATEGORY: "Depósito a bolsillo", POCKET_DEPOSIT_FROM_AVAILABLE: "Depósito a bolsillo", CASH_CARRYOVER: "Arrastre de efectivo", CLOSURE_SURPLUS: "Excedente de cierre", DEFICIT_RESOLUTION: "Resolución de déficit" };
const entityLabels: Record<string, string> = { MONTH: "Mes", SUBCATEGORY: "Subcategoría", POCKET: "Bolsillo", CASH: "Efectivo", EXTERNAL: "Externo", EXPENSE: "Gasto" };
const directionLabels = { INFLOW: "Entrada", OUTFLOW: "Salida", TRANSFER: "Transferencia" };
const money = (value: number) => `$${value < 0 ? "-" : ""}${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Math.abs(value))} COP`;
const time = (value: string) => new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
const day = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const readOnlyReason = (entry: LedgerViewEntry, actionable: boolean, unavailableActionReason?: string) => {
  if (entry.metadata.isSystemEvent) return "Este movimiento fue generado automáticamente y no se puede editar ni eliminar.";
  if (entry.direction === "TRANSFER") return "Esta transferencia no se puede editar ni eliminar desde este historial.";
  if (!(entry.eventType in eventLabels)) return "Este tipo de movimiento no se reconoce y no se puede editar ni eliminar desde este historial.";
  if (!actionable) return unavailableActionReason ?? "El registro original ya no está disponible para editar ni eliminar desde este historial.";
  return "Este tipo de movimiento no se puede editar ni eliminar desde este historial.";
};

function LedgerEntry({ actionLabel, entry, identityLabel, isActionable, onDelete, onEdit, unavailableActionReason }: Pick<MonthlyLedgerProps, "actionLabel" | "identityLabel" | "isActionable" | "onDelete" | "onEdit" | "unavailableActionReason"> & { entry: LedgerViewEntry }) {
  const actionable = isActionable?.(entry) ?? true;
  const hasAvailableAction = !entry.isReadOnly && actionable && (onEdit || onDelete);
  const entryLabel = eventLabels[entry.eventType] ?? "Movimiento no reconocido";
  const actionName = actionLabel?.(entry) ?? entry.metadata.description ?? entryLabel;
  const identity = identityLabel?.(entry);
  return <article className="monthly-ledger-entry" data-entry-key={entry.entryKey}>
    <details><summary className="monthly-ledger-disclosure"><div className="monthly-ledger-row"><time dateTime={entry.occurredAt}>{time(entry.occurredAt)}</time><div><strong>{entryLabel}</strong><span>{directionLabels[entry.direction]}</span>{identity ? <span>{identity}</span> : null}<span>{entry.metadata.description ?? entryLabel}</span></div><strong className="monthly-ledger-amount">{money(entry.amount)}</strong></div><span className="monthly-ledger-disclosure-show">Ver detalles de {actionName}</span><span className="monthly-ledger-disclosure-hide">Ocultar detalles de {actionName}</span></summary><dl className="monthly-ledger-details"><div><dt>Origen</dt><dd>Origen: {entityLabels[entry.source.kind]}</dd></div><div><dt>Destino</dt><dd>Destino: {entityLabels[entry.destination.kind]}</dd></div><div><dt>Descripción</dt><dd>Descripción: {entry.metadata.description ?? entryLabel}</dd></div><div><dt>Medio de pago</dt><dd>Medio de pago: {entry.metadata.paymentMethod === "NON_CASH" ? "No efectivo" : entry.metadata.paymentMethod === "CASH" ? "Efectivo" : "Sin registrar"}</dd></div><div><dt>Efectos</dt><dd>Disponible del mes: {money(entry.balanceEffects.availableMoney)}</dd><dd>Saldo en efectivo: {money(entry.balanceEffects.cashBalance)}</dd><dd>Disponible de subcategoría: {money(entry.balanceEffects.subcategoryAvailable)}</dd><dd>Saldo del bolsillo: {money(entry.balanceEffects.pocketBalance)}</dd></div></dl></details>
  {hasAvailableAction ? <div className="monthly-ledger-actions">{onEdit ? <Button onClick={() => onEdit(entry)} type="button" variant="secondary">Editar {actionName}</Button> : null}{onDelete ? <Button onClick={() => onDelete(entry)} type="button" variant="tertiary">Eliminar {actionName}</Button> : null}</div> : <p className="monthly-ledger-read-only">{readOnlyReason(entry, actionable, unavailableActionReason?.(entry))}</p>}
  </article>;
}

function SystemRun({ actionLabel, entries, isActionable, onDelete, onEdit, unavailableActionReason }: Pick<MonthlyLedgerProps, "actionLabel" | "isActionable" | "onDelete" | "onEdit" | "unavailableActionReason"> & { entries: LedgerViewEntry[] }) {
  const [open, setOpen] = useState(false); const id = useId(); const count = entries.length;
  return <section className="monthly-ledger-system-run" data-ledger-item={entries[0].entryKey}><button aria-controls={id} aria-expanded={open} className="monthly-ledger-disclosure" onClick={() => setOpen(!open)} type="button">{count} {count === 1 ? "movimiento automático" : "movimientos automáticos"}</button>{open ? <div id={id}>{entries.map((entry) => <LedgerEntry actionLabel={actionLabel} entry={entry} isActionable={isActionable} key={entry.entryKey} onDelete={onDelete} onEdit={onEdit} unavailableActionReason={unavailableActionReason} />)}</div> : null}</section>;
}

export function MonthlyLedger({ actionLabel, days, identityLabel, isActionable, onDelete, onEdit, onRetry, status, unavailableActionReason }: MonthlyLedgerProps) {
  return <Card aria-label="Movimientos del mes" className="monthly-ledger" role="region"><SectionHeader description="Actividad completa del mes en el orden registrado." title="Movimientos del mes" />
    {status === "loading" || status === "refreshing" ? <p role="status">{status === "loading" ? "Cargando movimientos del mes." : "Actualizando movimientos del mes."}</p> : null}
    {status === "error" ? <div role="alert">No se pudieron cargar los movimientos del mes. {onRetry ? <Button onClick={onRetry} type="button" variant="secondary">Reintentar carga</Button> : null}</div> : null}
    {status === "ready" && days.length === 0 ? <p>No hay movimientos registrados para este mes.</p> : null}
    {days.map((ledgerDay) => <section aria-labelledby={`ledger-day-${ledgerDay.key}`} className="monthly-ledger-day" key={ledgerDay.key}><h3 id={`ledger-day-${ledgerDay.key}`}>{day(ledgerDay.key)}</h3>{ledgerDay.items.map((item, index) => item.kind === "entry" ? <div data-ledger-item={item.entry.entryKey} key={item.entry.entryKey}><LedgerEntry actionLabel={actionLabel} entry={item.entry} identityLabel={identityLabel} isActionable={isActionable} onDelete={onDelete} onEdit={onEdit} unavailableActionReason={unavailableActionReason} /></div> : <SystemRun actionLabel={actionLabel} entries={item.entries} isActionable={isActionable} key={`${item.entries[0].entryKey}-${index}`} onDelete={onDelete} onEdit={onEdit} unavailableActionReason={unavailableActionReason} />)}</section>)}
  </Card>;
}
