import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { ClosurePendingSurplus, ClosureReview, Month, SavingsPocket } from "../types";

type TextById = Record<string, string>;

export const CloseMonthPage = () => {
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [review, setReview] = useState<ClosureReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activePockets, setActivePockets] = useState<SavingsPocket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [surplusPocketIds, setSurplusPocketIds] = useState<TextById>({});
  const [surplusAmounts, setSurplusAmounts] = useState<TextById>({});
  const [deficitSourceIds, setDeficitSourceIds] = useState<TextById>({});
  const [deficitAmounts, setDeficitAmounts] = useState<TextById>({});

  const refresh = async () => {
    const month = await api.getActiveMonth();
    setActiveMonth(month);

    if (!month) {
      setReview(null);
      return;
    }

    const closureReview = await api.getClosureReview(month.id);
    setReview(closureReview);
    setSurplusPocketIds((current) => ({
      ...closureReview.pendingSurpluses.reduce<TextById>((defaults, surplus) => {
        defaults[surplus.subcategoryId] = current[surplus.subcategoryId] ?? surplus.defaultPocketId ?? "";
        return defaults;
      }, {}),
    }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const pockets = await api.getPockets("active");
        setActivePockets(pockets);
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la revisión de cierre y los bolsillos activos.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const applySurplusTransfer = async (event: React.FormEvent<HTMLFormElement>, subcategoryId: string) => {
    event.preventDefault();
    if (!activeMonth || !review) return;

    const pendingSurplus = review.pendingSurpluses.find((surplus) => surplus.subcategoryId === subcategoryId);
    if (!pendingSurplus) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await api.applyClosureAction({
        monthId: activeMonth.id,
        type: "SURPLUS_TO_POCKET_ON_CLOSE",
        sourceSubcategoryId: subcategoryId,
        targetPocketId: surplusPocketIds[subcategoryId] || pendingSurplus.defaultPocketId || undefined,
        amount: surplusAmounts[subcategoryId] ? Number(surplusAmounts[subcategoryId]) : undefined,
        description: "Transferencia de sobrante al cierre",
      });
      await refresh();
      setSurplusAmounts((current) => ({ ...current, [subcategoryId]: "" }));
      setSurplusPocketIds((current) => ({ ...current, [subcategoryId]: "" }));
      setMessage(`Sobrante de ${pendingSurplus.subcategoryName} transferido a bolsillo.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo transferir el sobrante.");
    } finally {
      setSubmitting(false);
    }
  };

  const applyDeficitCoverage = async (event: React.FormEvent<HTMLFormElement>, targetSubcategoryId: string) => {
    event.preventDefault();
    if (!activeMonth || !review) return;

    const pendingDeficit = review.pendingDeficits.find((deficit) => deficit.subcategoryId === targetSubcategoryId);
    if (!pendingDeficit) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await api.applyClosureAction({
        monthId: activeMonth.id,
        type: "DEFICIT_COVER_FROM_SUBCATEGORY",
        sourceSubcategoryId: deficitSourceIds[targetSubcategoryId],
        targetSubcategoryId,
        amount: deficitAmounts[targetSubcategoryId] ? Number(deficitAmounts[targetSubcategoryId]) : undefined,
        description: "Cobertura de desfalco al cierre",
      });
      await refresh();
      setDeficitAmounts((current) => ({ ...current, [targetSubcategoryId]: "" }));
      setDeficitSourceIds((current) => ({ ...current, [targetSubcategoryId]: "" }));
      setMessage(`Desfalco de ${pendingDeficit.subcategoryName} cubierto desde otra subcategoría.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo cubrir el desfalco.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeMonth = async () => {
    if (!activeMonth || !review?.canClose) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const closedMonth = await api.closeMonth(activeMonth.id);
      setActiveMonth(closedMonth);
      setReview(null);
      setMessage(`Mes ${closedMonth.year}-${String(closedMonth.month).padStart(2, "0")} cerrado. Ya no se puede modificar.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo cerrar el mes.");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p>Cargando revisión de cierre...</p>;
  }

  const renderPocketOptions = (surplus: ClosurePendingSurplus) => {
    const missingDefaultId = surplus.defaultPocketId && !activePockets.some((pocket) => pocket.id === surplus.defaultPocketId)
      ? surplus.defaultPocketId
      : null;

    return (
      <>
        <option value="">Elegí un bolsillo activo</option>
        {missingDefaultId ? <option value={missingDefaultId}>{missingDefaultId}</option> : null}
        {activePockets.map((pocket) => (
          <option key={pocket.id} value={pocket.id}>
            {pocket.name} (${pocket.balance.toFixed(2)})
          </option>
        ))}
      </>
    );
  };

  return (
    <section className="page stack-lg">
      <header className="page-header">
        <div>
          <h1>Cierre de mes</h1>
          <p>Resolvé explícitamente cada sobrante o desfalco antes de cerrar. El cierre bloquea el mes de forma irreversible.</p>
        </div>
        <button className="button secondary" disabled={submitting} onClick={() => void refresh()} type="button">
          Refrescar
        </button>
      </header>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!activeMonth ? (
        <article className="card stack-md">
          <h2>No hay mes activo</h2>
          <p>Abrí un mes desde “Mes activo” antes de revisar el cierre.</p>
        </article>
      ) : null}

      {activeMonth && review ? (
        <>
          <article className="card stack-md">
            <div className="row between wrap">
              <div>
                <h2>
                  {activeMonth.year}-{String(activeMonth.month).padStart(2, "0")}
                </h2>
                <p>Estado: {review.status}</p>
              </div>
              <button className="button primary" disabled={submitting || !review.canClose} onClick={() => void closeMonth()} type="button">
                {submitting ? "Procesando..." : "Cerrar mes"}
              </button>
            </div>

            {!review.canClose ? (
              <p className="error">El botón queda deshabilitado hasta resolver todos los saldos pendientes.</p>
            ) : (
              <p className="success">No quedan sobrantes ni desfalcos pendientes. Ya podés cerrar el mes.</p>
            )}
          </article>

          <article className="card stack-md">
            <h2>Sobrantes pendientes</h2>
            {review.pendingSurpluses.length === 0 ? <p>No hay sobrantes pendientes.</p> : null}

            <div className="stack-sm">
              {review.pendingSurpluses.map((surplus) => (
                <form className="budget-line align-start" key={surplus.subcategoryId} onSubmit={(event) => applySurplusTransfer(event, surplus.subcategoryId)}>
                  <div className="stack-sm grow">
                    <strong>{surplus.subcategoryName}</strong>
                    <span className="pill success">Sobrante: ${surplus.amount.toFixed(2)}</span>
                    {surplus.defaultPocketId ? (
                      <p>Se preseleccionó el bolsillo por defecto. Podés elegir otro bolsillo activo antes de transferir.</p>
                    ) : (
                      <p className="error">
                        Esta subcategoría no tiene bolsillo por defecto: elegí un bolsillo activo antes de transferir el sobrante.
                      </p>
                    )}
                  </div>

                  <label className="field">
                    <span>Bolsillo destino</span>
                    <select
                      required={surplus.requiresPocketSelection}
                      value={surplusPocketIds[surplus.subcategoryId] ?? ""}
                      onChange={(event) => setSurplusPocketIds((current) => ({ ...current, [surplus.subcategoryId]: event.target.value }))}
                    >
                      {renderPocketOptions(surplus)}
                    </select>
                  </label>

                  <label className="field small-field">
                    <span>Monto</span>
                    <input
                      max={surplus.amount}
                      min="0.01"
                      placeholder={surplus.amount.toFixed(2)}
                      step="0.01"
                      type="number"
                      value={surplusAmounts[surplus.subcategoryId] ?? ""}
                      onChange={(event) => setSurplusAmounts((current) => ({ ...current, [surplus.subcategoryId]: event.target.value }))}
                    />
                  </label>

                  <button className="button primary" disabled={submitting} type="submit">
                    Transferir sobrante
                  </button>
                </form>
              ))}
            </div>
          </article>

          <article className="card stack-md">
            <h2>Desfalcos pendientes</h2>
            {review.pendingDeficits.length === 0 ? <p>No hay desfalcos pendientes.</p> : null}

            <div className="stack-sm">
              {review.pendingDeficits.map((deficit) => (
                <form className="budget-line align-start" key={deficit.subcategoryId} onSubmit={(event) => applyDeficitCoverage(event, deficit.subcategoryId)}>
                  <div className="stack-sm grow">
                    <strong>{deficit.subcategoryName}</strong>
                    <span className="pill danger">Desfalco: ${deficit.amount.toFixed(2)}</span>
                    {review.pendingSurpluses.length === 0 ? (
                      <p className="error">No hay subcategorías con sobrante disponible. Registrá o resolvé una fuente antes de cubrir este desfalco.</p>
                    ) : null}
                  </div>

                  <label className="field">
                    <span>Subcategoría origen con sobrante</span>
                    <select
                      required
                      value={deficitSourceIds[deficit.subcategoryId] ?? ""}
                      onChange={(event) => setDeficitSourceIds((current) => ({ ...current, [deficit.subcategoryId]: event.target.value }))}
                    >
                      <option value="">Elegí origen</option>
                      {review.pendingSurpluses.map((surplus) => (
                        <option key={surplus.subcategoryId} value={surplus.subcategoryId}>
                          {surplus.subcategoryName} (${surplus.amount.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field small-field">
                    <span>Monto</span>
                    <input
                      max={deficit.amount}
                      min="0.01"
                      placeholder={deficit.amount.toFixed(2)}
                      step="0.01"
                      type="number"
                      value={deficitAmounts[deficit.subcategoryId] ?? ""}
                      onChange={(event) => setDeficitAmounts((current) => ({ ...current, [deficit.subcategoryId]: event.target.value }))}
                    />
                  </label>

                  <button className="button primary" disabled={submitting || review.pendingSurpluses.length === 0} type="submit">
                    Cubrir desfalco
                  </button>
                </form>
              ))}
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
};
