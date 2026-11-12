import { useRef, useState } from "react";

import { Button, Card, MoneyInput, StatusPill } from "../../../components/ui";
import { formatCop } from "../../../lib/money";
import type { CloseMonthInput, ClosureReview, Month } from "../../../types";

// Parse whole strings into exact integer cents, never rounded or partially parsed.
function cents(text: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

type Props = {
  month: Month;
  review: ClosureReview;
  pending: boolean;
  onClose: (input?: CloseMonthInput) => void;
  children: React.ReactNode;
};

export function GuidedClosure({ month, review, pending, onClose, children }: Props) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("carry");
  const [carry, setCarry] = useState("");
  const [excluded, setExcluded] = useState("");
  const details = useRef<HTMLDetailsElement>(null);
  const headings = useRef<(HTMLElement | null)[]>([]);
  const total = cents(String(review.availableMoney));
  const carryCents = mode === "carry" ? total : mode === "outside" ? 0 : cents(carry);
  const excludedCents = mode === "outside" ? total : mode === "carry" ? 0 : cents(excluded);
  const valid = total !== null
    && carryCents !== null
    && excludedCents !== null
    && Number.isSafeInteger(carryCents + excludedCents)
    && carryCents + excludedCents === total;
  const ready = month.status === "ACTIVE"
    && review.status === "ACTIVE"
    && total !== null
    && review.pendingDeficits.length === 0
    && (total > 0 || review.canClose);

  const go = (next: number) => {
    if (pending) return;
    if (details.current) details.current.open = false;
    setStep(next);
    requestAnimationFrame(() => headings.current[next - 1]?.focus());
  };
  const opening = month.openingBalance ?? 0;
  // Net outflows include cash withdrawals and pocket deposits; cash expenses
  // are not deducted again. This reconciles exactly with server availability.
  const netOutflows = (
    Math.round(opening * 100)
    + Math.round(month.monthlyIncomeTotal * 100)
    - Math.round(review.availableMoney * 100)
  ) / 100;
  const planned = month.categories
    .flatMap(category => category.subcategories)
    .reduce((sum, sub) => sum + Math.round(sub.plannedAmount * 100), 0) / 100;

  return (
    <div className="month-closure-flow">
      <aside className="month-closure-rail" aria-label="Progreso del cierre">
        <ol className="month-closure-steps">
          {["Revisar", "Destino", "Confirmar"].map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
              <strong>{index + 1}. {label}</strong>
              <span>{["Entendé tu saldo", "Elegí qué sigue", "Revisá tu decisión"][index]}</span>
            </li>
          ))}
        </ol>
        <p>Tu dinero no necesita desaparecer para que el mes termine.</p>
        <p>Podés volver y cambiar la distribución antes de confirmar.</p>
      </aside>

      <Card className="month-closure-panel" hidden={step !== 1} aria-labelledby="month-closure-review-heading">
        <p className="month-closure-eyebrow">Paso 1 de 3</p>
        <h2
          id="month-closure-review-heading"
          tabIndex={-1}
          ref={node => { headings.current[0] = node; }}
        >
          Esto es lo que te queda
        </h2>
        <p>Dinero real disponible al terminar el mes</p>
        <div className="month-closure-amount">{formatCop(review.availableMoney)}</div>
        <dl className="month-closure-equation">
          <div><dt>Saldo inicial</dt><dd>{formatCop(opening)}</dd></div>
          <div><dt>+ Ingresos</dt><dd>{formatCop(month.monthlyIncomeTotal)}</dd></div>
          <div><dt>Salidas netas</dt><dd>{formatCop(netOutflows)}</dd></div>
        </dl>
        <details className="month-closure-details" ref={details}>
          <summary>Ver efectivo, bolsillos y presupuesto</summary>
          <dl>
            <div><dt>Efectivo físico</dt><dd>{formatCop(month.cashBalance)}</dd></div>
            <div><dt>Presupuesto planeado</dt><dd>{formatCop(planned)}</dd></div>
          </dl>
          <p>El efectivo no se suma otra vez al disponible. Las salidas netas incluyen retiros de efectivo y depósitos a bolsillos, menos sus ajustes; los gastos en efectivo no se descuentan dos veces.</p>
          <h3>Tu plan no es tu saldo</h3>
          <p>El margen presupuestario es informativo, no es dinero extra ni representa dinero transferible.</p>
          {review.budgetVariances.length === 0 ? (
            <p>No hay variaciones presupuestarias.</p>
          ) : review.budgetVariances.map(variance => (
            <p key={variance.subcategoryId}>
              {variance.subcategoryName}: {formatCop(variance.amount)} · {variance.kind === "DEFICIT" ? "Desfalco presupuestario" : "Sobrante presupuestario"}
            </p>
          ))}
        </details>
        {review.availableMoney < 0 ? (
          <StatusPill tone="danger" aria-label="Danger: Dinero disponible en déficit">
            El dinero disponible del mes está en negativo. Corregí ingresos, gastos o depósitos desde Mes activo antes de cerrar.
          </StatusPill>
        ) : null}
        {!ready ? (
          <StatusPill tone="warning">
            Cierre bloqueado: resolvé los desfalcos y el disponible negativo. Si ya los resolviste, refrescá la revisión.
          </StatusPill>
        ) : (
          <StatusPill tone="success">Cierre listo para revisar</StatusPill>
        )}
        {children}
        <div className="month-closure-actions">
          <Button disabled={pending || !ready} onClick={() => go(2)}>Elegir destino →</Button>
        </div>
      </Card>

      <Card className="month-closure-panel" hidden={step !== 2} aria-labelledby="month-closure-destination-heading">
        <p className="month-closure-eyebrow">Paso 2 de 3 · {formatCop(review.availableMoney)} disponibles</p>
        <fieldset disabled={pending || total === 0}>
          <legend
            id="month-closure-destination-heading"
            tabIndex={-1}
            ref={node => { headings.current[1] = node; }}
          >
            ¿Cómo querés repartir el sobrante?
          </legend>
          {[
            ["carry", "Pasar todo al siguiente mes", "Saldo inicial del siguiente mes; no cuenta como nuevo ingreso."],
            ["outside", "Dejar todo fuera del seguimiento", "La decisión queda en el historial del cierre, no como gasto."],
            ["split", "Dividir el sobrante", "Una parte para el siguiente mes y otra fuera de la app."],
          ].map(([value, label, hint]) => (
            <label className="month-closure-option" key={value}>
              <input
                type="radio"
                name="month-closure-destination"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              <span><strong>{label}</strong><small>{hint}</small></span>
            </label>
          ))}
        </fieldset>
        {total === 0 ? <p>No hay sobrante para distribuir. Podés cerrar con ambos destinos en cero.</p> : null}
        {mode === "split" && total !== 0 ? (
          <div>
            <p>Montos COP no negativos, en pesos enteros.</p>
            <div className="month-closure-fields">
              <label className="field">
                Al siguiente mes (COP)
                <MoneyInput
                  disabled={pending}
                  value={carry}
                  onValueChange={setCarry}
                  aria-invalid={!valid}
                  aria-describedby="month-closure-feedback"
                />
              </label>
              <label className="field">
                Fuera del seguimiento (COP)
                <MoneyInput
                  disabled={pending}
                  value={excluded}
                  onValueChange={setExcluded}
                  aria-invalid={!valid}
                  aria-describedby="month-closure-feedback"
                />
              </label>
            </div>
          </div>
        ) : null}
        <p
          id="month-closure-feedback"
          role="status"
          aria-label="Distribución"
          className={valid ? "month-closure-valid" : "month-closure-invalid"}
        >
          {valid
            ? `✓ Total distribuido: ${formatCop(review.availableMoney)}`
            : `Revisá los montos: usá números no negativos con hasta dos decimales que sumen exactamente ${formatCop(review.availableMoney)}.`}
        </p>
        <div className="month-closure-actions">
          <Button variant="secondary" disabled={pending} onClick={() => go(1)}>← Volver a revisar</Button>
          <Button disabled={pending || !valid || !ready} onClick={() => go(3)}>Revisar cierre →</Button>
        </div>
      </Card>

      <Card className="month-closure-panel" hidden={step !== 3} aria-labelledby="month-closure-confirmation-heading">
        <p className="month-closure-eyebrow">Paso 3 de 3</p>
        <h2
          id="month-closure-confirmation-heading"
          tabIndex={-1}
          ref={node => { headings.current[2] = node; }}
        >
          Tu decisión para el mes
        </h2>
        <dl>
          <div><dt>Saldo inicial del siguiente mes</dt><dd>{formatCop((carryCents ?? 0) / 100)}</dd></div>
          <div><dt>Fuera del seguimiento</dt><dd>{formatCop((excludedCents ?? 0) / 100)}</dd></div>
          <div><dt>Total distribuido</dt><dd>{formatCop(review.availableMoney)}</dd></div>
        </dl>
        <p className="month-closure-note">El mes cerrado queda de solo lectura. El traspaso no es un ingreso nuevo. La parte fuera del seguimiento se registra en el historial del cierre; no es un gasto ni un borrado.</p>
        <p>Nada cambia hasta confirmar el cierre.</p>
        <div className="month-closure-actions">
          <Button variant="secondary" disabled={pending} onClick={() => go(2)}>← Cambiar destino</Button>
          <Button
            disabled={pending || !ready || !valid}
            onClick={() => {
              if (ready && valid) {
                onClose(total === 0 ? undefined : {
                  carryAmount: carryCents! / 100,
                  excludedAmount: excludedCents! / 100,
                });
              }
            }}
          >
            {pending ? "Cerrando mes..." : "Confirmar cierre"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
