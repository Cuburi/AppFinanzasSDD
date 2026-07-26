import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { Button, Card, SectionHeader, StatusPill } from "../components/ui";
import type { ClosurePendingSurplus, ClosureReview, Month, SavingsPocket } from "../types";
import { ClosedMonthDashboard } from "../features/monthly-cycle/closed-month-dashboard/components/ClosedMonthDashboard";

type TextById = Record<string, string>;

const renderAvailableMoneyBlocker = (review: ClosureReview) => {
  if (review.availableMoneyBlocker === "SURPLUS") {
    return (
      <StatusPill tone="warning" className="status-message" aria-label="Warning: Dinero disponible con sobrante">
        Sobra dinero disponible del mes: ${review.availableMoney.toFixed(2)}. Antes de cerrar, asignalo registrando el gasto, corrigiendo ingresos o depositándolo en un bolsillo desde Mes activo.
      </StatusPill>
    );
  }

  if (review.availableMoneyBlocker === "DEFICIT") {
    return (
      <StatusPill tone="danger" className="status-message" aria-label="Danger: Dinero disponible en déficit">
        El dinero disponible del mes está en negativo: ${review.availableMoney.toFixed(2)}. Corregí ingresos, gastos o depósitos; este MVP no agrega un retiro genérico desde bolsillos para cubrir disponibilidad.
      </StatusPill>
    );
  }

  return <StatusPill tone="success" className="status-message">Dinero disponible del mes balanceado en $0.00.</StatusPill>;
};

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

  const openNextMonth = async () => {
    if (!activeMonth) return;

    const input = activeMonth.month === 12
      ? { year: activeMonth.year + 1, month: 1 }
      : { year: activeMonth.year, month: activeMonth.month + 1 };

    try {
      const openedMonth = await api.openMonth(input);
      setActiveMonth(openedMonth);
      setMessage(`Mes ${input.year}-${String(input.month).padStart(2, "0")} abierto.`);
      setReview(null);

      try {
        const closureReview = await api.getClosureReview(openedMonth.id);
        setReview(closureReview);
      } catch (reviewError) {
        const reviewErrorMessage = reviewError instanceof Error ? reviewError.message : "No se pudo cargar la revisión de cierre.";
        setError(`El mes se abrió, pero no se pudo cargar la revisión de cierre: ${reviewErrorMessage}`);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo abrir el siguiente mes.");
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

  if (activeMonth?.status === "CLOSED") {
    return (
      <section className="page stack-lg">
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <ClosedMonthDashboard month={activeMonth} onOpenNextMonth={() => void openNextMonth()} />
      </section>
    );
  }

  return (
    <section className="page stack-lg">
      <SectionHeader
        title="Cierre de mes"
        description="Resolvé explícitamente cada sobrante o desfalco antes de cerrar. El cierre bloquea el mes de forma irreversible."
        action={
          <Button variant="secondary" disabled={submitting} onClick={() => void refresh()} type="button">
            Refrescar
          </Button>
        }
      />

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!activeMonth ? (
        <Card aria-label="Sin mes activo" className="stack-md">
          <h2>No hay mes activo</h2>
          <p>Abrí un mes desde “Mes activo” antes de revisar el cierre.</p>
        </Card>
      ) : null}

      {activeMonth && review ? (
        <>
          <Card aria-label="Estado de cierre" className="stack-md">
            <div className="row between wrap">
              <div>
                <h2>
                  {activeMonth.year}-{String(activeMonth.month).padStart(2, "0")}
                </h2>
                <p>Estado: {review.status}</p>
                <p>Disponible del mes: ${review.availableMoney.toFixed(2)}</p>
              </div>
              <Button disabled={submitting || !review.canClose} onClick={() => void closeMonth()} type="button">
                {submitting ? "Procesando..." : "Cerrar mes"}
              </Button>
            </div>

            {!review.canClose ? (
              <StatusPill tone="warning" aria-label="Warning: Cierre bloqueado">El botón queda deshabilitado hasta resolver todos los saldos pendientes.</StatusPill>
            ) : (
              <StatusPill tone="success">Cierre listo</StatusPill>
            )}

            {renderAvailableMoneyBlocker(review)}
          </Card>

          <Card aria-label="Sobrantes pendientes" className="stack-md">
            <h2>Sobrantes pendientes</h2>
            {review.pendingSurpluses.length === 0 ? <p>No hay sobrantes pendientes.</p> : null}

            <div className="stack-sm">
              {review.pendingSurpluses.map((surplus) => (
                <form className="budget-line align-start" key={surplus.subcategoryId} onSubmit={(event) => applySurplusTransfer(event, surplus.subcategoryId)}>
                  <div className="stack-sm grow">
                    <strong>{surplus.subcategoryName}</strong>
                    <StatusPill tone="success" aria-label={`Success: Sobrante $${surplus.amount.toFixed(2)}`}>
                      Sobrante: ${surplus.amount.toFixed(2)}
                    </StatusPill>
                    {surplus.defaultPocketId ? (
                      <p>Se preseleccionó el bolsillo por defecto. Podés elegir otro bolsillo activo antes de transferir.</p>
                    ) : (
                      <StatusPill tone="warning" className="status-message">
                        Esta subcategoría no tiene bolsillo por defecto: elegí un bolsillo activo antes de transferir el sobrante.
                      </StatusPill>
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

                  <Button disabled={submitting} type="submit">
                    Transferir sobrante
                  </Button>
                </form>
              ))}
            </div>
          </Card>

          <Card aria-label="Desfalcos pendientes" className="stack-md">
            <h2>Desfalcos pendientes</h2>
            {review.pendingDeficits.length === 0 ? <p>No hay desfalcos pendientes.</p> : null}

            <div className="stack-sm">
              {review.pendingDeficits.map((deficit) => (
                <form className="budget-line align-start" key={deficit.subcategoryId} onSubmit={(event) => applyDeficitCoverage(event, deficit.subcategoryId)}>
                  <div className="stack-sm grow">
                    <strong>{deficit.subcategoryName}</strong>
                    <StatusPill tone="danger" aria-label={`Danger: Desfalco $${deficit.amount.toFixed(2)}`}>
                      Desfalco: ${deficit.amount.toFixed(2)}
                    </StatusPill>
                    {review.pendingSurpluses.length === 0 ? (
                      <StatusPill tone="danger" className="status-message">No hay subcategorías con sobrante disponible. Registrá o resolvé una fuente antes de cubrir este desfalco.</StatusPill>
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

                  <Button disabled={submitting || review.pendingSurpluses.length === 0} type="submit">
                    Cubrir desfalco
                  </Button>
                </form>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
};
