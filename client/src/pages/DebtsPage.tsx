import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { api } from "../lib/api";
import { Button, Card, SectionHeader, StatusPill } from "../components/ui";
import type { DebtDirection, DebtView } from "../types";

const formatMoney = (amount: number, currency: string) => `${currency} $${amount.toFixed(2)}`;

const directionLabel = (direction: DebtDirection) => (direction === "I_OWE" ? "Yo debo" : "Me deben");

const debtStatusTone = (debt: DebtView) => {
  if (debt.status === "PAID") return "success";
  return debt.direction === "I_OWE" ? "danger" : "warning";
};

const debtBalanceTone = (debt: DebtView) => (debt.remainingBalance > 0 ? "warning" : "success");

const debtBalanceLabel = (debt: DebtView) => (debt.remainingBalance > 0 ? "Saldo pendiente" : "Saldo liquidado");

const parseOptionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const replaceDebt = (debts: DebtView[], nextDebt: DebtView) => debts.map((debt) => (debt.id === nextDebt.id ? nextDebt : debt));

export const DebtsPage = () => {
  const [debts, setDebts] = useState<DebtView[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<DebtDirection>("I_OWE");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [originDate, setOriginDate] = useState("");
  const [description, setDescription] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setDebts(await api.getDebts());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las deudas.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const createDebt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const createdDebt = await api.createDebt({
        direction,
        counterpartyName,
        totalAmount: Number(totalAmount),
        originDate,
        description: parseOptionalText(description),
      });
      setDebts((current) => [createdDebt, ...current]);
      setCounterpartyName("");
      setTotalAmount("");
      setOriginDate("");
      setDescription("");
      setMessage("Deuda creada.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la deuda.");
    } finally {
      setSubmitting(false);
    }
  };

  const registerPayment = async (debt: DebtView) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedDebt = await api.registerDebtPayment(debt.id, {
        amount: Number(paymentAmounts[debt.id] ?? ""),
        paidAt: paymentDates[debt.id] ?? "",
        notes: parseOptionalText(paymentNotes[debt.id] ?? ""),
      });
      setDebts((current) => replaceDebt(current, updatedDebt));
      setPaymentAmounts((current) => ({ ...current, [debt.id]: "" }));
      setPaymentDates((current) => ({ ...current, [debt.id]: "" }));
      setPaymentNotes((current) => ({ ...current, [debt.id]: "" }));
      setMessage("Pago registrado.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page stack-lg">
      <SectionHeader title="Deudas" description="Registrá deudas y pagos en COP sin afectar el ciclo mensual." />

      <Card aria-label="Crear deuda" className="stack-md">
        <h2>Crear deuda</h2>
        <form className="row gap-sm wrap align-start" onSubmit={createDebt}>
          <label className="field small-field">
            <span>Dirección</span>
            <select value={direction} onChange={(event) => setDirection(event.target.value as DebtDirection)}>
              <option value="I_OWE">Yo debo a alguien</option>
              <option value="OWED_TO_ME">Me deben a mí</option>
            </select>
          </label>
          <label className="field">
            <span>Contraparte</span>
            <input value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} required />
          </label>
          <label className="field small-field">
            <span>Monto total</span>
            <input min="0.01" step="0.01" type="number" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} required />
          </label>
          <label className="field small-field">
            <span>Fecha de origen</span>
            <input type="date" value={originDate} onChange={(event) => setOriginDate(event.target.value)} required />
          </label>
          <label className="field">
            <span>Descripción</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <Button disabled={submitting} type="submit">
            Crear deuda
          </Button>
        </form>
      </Card>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <Card aria-label="Listado de deudas" className="stack-md">
        <h2>Listado</h2>
        {loading ? <p>Cargando deudas...</p> : null}
        {!loading && debts.length === 0 ? <p>No hay deudas registradas.</p> : null}

        <div className="stack-sm">
          {debts.map((debt) => (
            <article className="budget-line align-start" key={debt.id}>
              <div className="stack-sm grow">
                <div>
                  <strong>{debt.counterpartyName}</strong>
                  <p>{directionLabel(debt.direction)}</p>
                </div>
                <p>{debt.description ?? "Sin descripción"}</p>
                <StatusPill tone={debtStatusTone(debt)} aria-label={`${debtStatusTone(debt) === "danger" ? "Danger" : debtStatusTone(debt) === "warning" ? "Warning" : "Success"}: ${directionLabel(debt.direction)} · ${debt.status}`}>
                  Estado: {debt.status}
                </StatusPill>
                <p>Total: {formatMoney(debt.totalAmount, debt.currency)}</p>
                <StatusPill tone={debtBalanceTone(debt)} aria-label={`${debtBalanceTone(debt) === "warning" ? "Warning" : "Success"}: ${debtBalanceLabel(debt)} ${formatMoney(debt.remainingBalance, debt.currency)}`}>
                  Saldo: {formatMoney(debt.remainingBalance, debt.currency)}
                </StatusPill>
                <div>
                  <strong>Pagos</strong>
                  {debt.payments.length > 0 ? (
                    <ul>
                      {debt.payments.map((payment) => (
                        <li key={payment.id}>
                          {payment.notes ?? "Pago sin notas"} · {formatMoney(payment.amount, debt.currency)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Sin pagos registrados.</p>
                  )}
                </div>
              </div>

              {debt.status === "OPEN" ? (
                <form className="row gap-sm wrap align-start" onSubmit={(event) => event.preventDefault()}>
                  <label className="field small-field">
                    <span>Monto del pago</span>
                    <input
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={paymentAmounts[debt.id] ?? ""}
                      onChange={(event) => setPaymentAmounts((current) => ({ ...current, [debt.id]: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="field small-field">
                    <span>Fecha de pago</span>
                    <input
                      type="date"
                      value={paymentDates[debt.id] ?? ""}
                      onChange={(event) => setPaymentDates((current) => ({ ...current, [debt.id]: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Notas del pago</span>
                    <input value={paymentNotes[debt.id] ?? ""} onChange={(event) => setPaymentNotes((current) => ({ ...current, [debt.id]: event.target.value }))} />
                  </label>
                  <Button disabled={submitting} onClick={() => void registerPayment(debt)} type="button">
                    Registrar pago
                  </Button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
};
