import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { Month, SavingsPocket } from "../types";

const now = new Date();

export const ActiveMonthPage = () => {
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activePockets, setActivePockets] = useState<SavingsPocket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expenseSubcategoryId, setExpenseSubcategoryId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [depositSourceSubcategoryId, setDepositSourceSubcategoryId] = useState("");
  const [depositPocketId, setDepositPocketId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositExternalSource, setDepositExternalSource] = useState("");

  const refresh = async () => {
    const monthData = await api.getActiveMonth();
    setActiveMonth(monthData);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [monthData, pockets] = await Promise.all([api.getActiveMonth(), api.getPockets("active")]);
        setActiveMonth(monthData);
        setActivePockets(pockets);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo consultar el mes activo y los bolsillos activos.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleOpenMonth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const createdMonth = await api.openMonth({
        year: Number(year),
        month: Number(month),
      });

      setActiveMonth(createdMonth);
      setMessage(`Mes ${createdMonth.year}-${String(createdMonth.month).padStart(2, "0")} abierto con snapshot de la plantilla vigente.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo abrir el mes.");
    } finally {
      setSubmitting(false);
    }
  };

  const subcategories = activeMonth?.categories.flatMap((category) => category.subcategories) ?? [];

  const handleExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMonth = await api.recordExpense({
        monthId: activeMonth.id,
        sourceSubcategoryId: expenseSubcategoryId,
        amount: Number(expenseAmount),
        description: expenseDescription,
      });
      setActiveMonth(updatedMonth);
      setExpenseAmount("");
      setExpenseDescription("");
      setMessage("Gasto registrado y saldos recalculados.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el gasto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMonth) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const updatedMonth = await api.depositToPocket({
        monthId: activeMonth.id,
        sourceSubcategoryId: depositSourceSubcategoryId || undefined,
        targetPocketId: depositPocketId,
        amount: Number(depositAmount),
        externalSourceLabel: depositSourceSubcategoryId ? undefined : depositExternalSource,
      });
      setActiveMonth(updatedMonth ?? (await api.getActiveMonth()));
      setDepositAmount("");
      setDepositExternalSource("");
      setMessage("Depósito a bolsillo registrado.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el depósito.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p>Cargando mes activo...</p>;
  }

  return (
    <section className="page stack-lg">
      <header className="page-header">
        <div>
          <h1>Mes activo</h1>
          <p>Abrí manualmente un mes nuevo. La API bloquea abrir un segundo mes mientras exista uno activo.</p>
        </div>
      </header>

      <article className="card stack-md">
        <h2>Abrir mes manualmente</h2>

        <form className="row gap-sm wrap" onSubmit={handleOpenMonth}>
          <label className="field small-field">
            <span>Año</span>
            <input min="2000" step="1" type="number" value={year} onChange={(event) => setYear(event.target.value)} />
          </label>

          <label className="field small-field">
            <span>Mes</span>
            <input min="1" max="12" step="1" type="number" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>

          <button className="button primary" disabled={submitting} type="submit">
            {submitting ? "Abriendo..." : "Abrir mes"}
          </button>
        </form>

        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </article>

      {activeMonth ? (
        <article className="card stack-md">
          <h2>Operación diaria</h2>

          <form className="row gap-sm wrap" onSubmit={handleExpense}>
            <label className="field">
              <span>Subcategoría del gasto</span>
              <select value={expenseSubcategoryId} onChange={(event) => setExpenseSubcategoryId(event.target.value)} required>
                <option value="">Elegí una subcategoría</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name} (${subcategory.available.toFixed(2)})
                  </option>
                ))}
              </select>
            </label>
            <label className="field small-field">
              <span>Monto</span>
              <input min="0.01" step="0.01" type="number" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required />
            </label>
            <label className="field">
              <span>Descripción</span>
              <input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} />
            </label>
            <button className="button primary" disabled={submitting} type="submit">
              Registrar gasto
            </button>
          </form>

          <form className="row gap-sm wrap" onSubmit={handleDeposit}>
            <label className="field">
              <span>Origen subcategoría (opcional)</span>
              <select value={depositSourceSubcategoryId} onChange={(event) => setDepositSourceSubcategoryId(event.target.value)}>
                <option value="">Ingreso externo</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name} (${subcategory.available.toFixed(2)})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Bolsillo destino</span>
              <select value={depositPocketId} onChange={(event) => setDepositPocketId(event.target.value)} required>
                <option value="">Elegí un bolsillo activo</option>
                {activePockets.map((pocket) => (
                  <option key={pocket.id} value={pocket.id}>
                    {pocket.name} (${pocket.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </label>
            <label className="field small-field">
              <span>Monto</span>
              <input min="0.01" step="0.01" type="number" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} required />
            </label>
            <label className="field">
              <span>Origen externo</span>
              <input disabled={Boolean(depositSourceSubcategoryId)} value={depositExternalSource} onChange={(event) => setDepositExternalSource(event.target.value)} />
            </label>
            <button className="button primary" disabled={submitting} type="submit">
              Depositar en bolsillo
            </button>
          </form>
        </article>
      ) : null}

      <article className="card stack-md">
        <div className="row between wrap">
          <h2>Snapshot del mes activo</h2>
          <button className="button secondary" onClick={() => void refresh()} type="button">
            Refrescar
          </button>
        </div>

        {activeMonth ? (
          <>
            <p>
              <strong>
                {activeMonth.year}-{String(activeMonth.month).padStart(2, "0")}
              </strong>{" "}
              · estado {activeMonth.status}
            </p>

            <div className="stack-md">
              {activeMonth.categories.map((category) => (
                <section className="stack-sm" key={category.id}>
                  <h3>{category.name}</h3>

                  <div className="stack-sm">
                    {category.subcategories.map((subcategory) => (
                      <div className="budget-line" key={subcategory.id}>
                        <div>
                          <strong>{subcategory.name}</strong>
                          <p>Planificado: ${subcategory.plannedAmount.toFixed(2)}</p>
                        </div>

                        <span className={subcategory.available < 0 ? "pill danger" : "pill success"}>
                          Disponible: ${subcategory.available.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <p>Todavía no hay un mes activo.</p>
        )}
      </article>
    </section>
  );
};
