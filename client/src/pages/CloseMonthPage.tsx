import { useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import { Button, Card, FeedbackBanner } from "../components/ui";
import type { CloseMonthInput, ClosureReview, Month } from "../types";
import { ClosedMonthDashboard } from "../features/monthly-cycle/closed-month-dashboard/components/ClosedMonthDashboard";
import { GuidedClosure } from "../features/monthly-cycle/month-closure/GuidedClosure";
import { formatCop } from "../lib/money";
const errorText = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la operación.";
const selectedClosedId = () => new URLSearchParams(window.location.search).get("closedMonthId");
const selectClosed = (id: string | null) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("closedMonthId", id);
  else url.searchParams.delete("closedMonthId");
  window.history.replaceState(window.history.state, "", url);
};
const assertReview = (month: Month, review: ClosureReview) => {
  if (review.monthId !== month.id || review.status !== month.status) {
    throw new Error("La identidad de la revisión no coincide con el mes. Refrescá para continuar.");
  }
};

export const CloseMonthPage = () => {
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [review, setReview] = useState<ClosureReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const busy = useRef(false);

  const refresh = async () => {
    const token = ++request.current;
    const selector = selectedClosedId();
    setReview(null);
    setRevision(value => value + 1);
    let month: Month | null;
    if (selector) {
      month = await api.getMonth(selector);
      if (month.id !== selector || month.status !== "CLOSED") {
        throw new Error("La identidad del mes cerrado no coincide con la URL.");
      }
    } else {
      month = await api.getActiveMonth();
      if (!month) month = await api.getLatestClosedMonth();
    }
    if (token !== request.current || selectedClosedId() !== selector) return;
    setActiveMonth(month);
    if (month?.status === "CLOSED") {
      selectClosed(month.id);
      return;
    }
    if (month) {
      const nextReview = await api.getClosureReview(month.id);
      assertReview(month, nextReview);
      if (token === request.current && selectedClosedId() === selector) setReview(nextReview);
    }
  };

  const reload = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await refresh();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    const pop = () => {
      if (!busy.current) {
        setActiveMonth(null);
        void reload();
      }
    };
    window.addEventListener("popstate", pop);
    return () => {
      ++request.current;
      window.removeEventListener("popstate", pop);
    };
  }, []);

  const closeMonth = async (input?: CloseMonthInput) => {
    if (!activeMonth || !review || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const id = activeMonth.id;
    try {
      const closed = input === undefined ? await api.closeMonth(id) : await api.closeMonth(id, input);
      if (closed.id !== id || closed.status !== "CLOSED") {
        throw new Error("La identidad de la respuesta de cierre no coincide con el mes.");
      }
      if (selectedClosedId() && selectedClosedId() !== id) {
        throw new Error("El mes seleccionado cambió durante el cierre. Refrescá para continuar.");
      }
      ++request.current;
      setActiveMonth(closed);
      setReview(null);
      selectClosed(closed.id);
      setMessage("Mes cerrado. Ya no se puede modificar.");
    } catch (failure) {
      const original = errorText(failure);
      setReview(null);
      try {
        await refresh();
        setError(original);
      } catch (refreshFailure) {
        setError(`${original} No se pudo actualizar la revisión: ${errorText(refreshFailure)}`);
      }
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const openNextMonth = async () => {
    if (!activeMonth || activeMonth.status !== "CLOSED" || busy.current) return;
    const input = activeMonth.month === 12
      ? { year: activeMonth.year + 1, month: 1 }
      : { year: activeMonth.year, month: activeMonth.month + 1 };
    busy.current = true;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const opened = await api.openMonth(input);
      if (opened.status !== "ACTIVE" || opened.year !== input.year || opened.month !== input.month) {
        throw new Error("La identidad del mes abierto no coincide con el destino.");
      }
      ++request.current;
      selectClosed(null);
      setActiveMonth(opened);
      setReview(null);
      setRevision(value => value + 1);
      setMessage(`Mes ${input.year}-${String(input.month).padStart(2, "0")} abierto.`);
      try {
        const nextReview = await api.getClosureReview(opened.id);
        assertReview(opened, nextReview);
        setReview(nextReview);
      } catch (failure) {
        setError(`El mes se abrió, pero no se pudo cargar la revisión de cierre: ${errorText(failure)}`);
      }
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section className="page month-closure-page">
      <header className="month-closure-header">
        <div>
          <p className="month-closure-eyebrow">Cierre mensual</p>
          <h1>Cierre de mes</h1>
          <p>{activeMonth ? `${activeMonth.year}-${String(activeMonth.month).padStart(2, "0")} · ` : ""}Una decisión a la vez. Nada cambia hasta confirmar.</p>
        </div>
        <Button variant="secondary" disabled={loading || submitting} onClick={() => void reload()}>
          Refrescar
        </Button>
      </header>
      {loading ? <p role="status">Cargando revisión de cierre...</p> : null}
      {message ? <FeedbackBanner tone="success">{message}</FeedbackBanner> : null}
      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}
      {!loading && !activeMonth && !error ? (
        <Card aria-label="Sin mes activo">
          <h2>No hay mes activo</h2>
          <p>Abrí un mes desde “Mes activo” antes de revisar el cierre.</p>
        </Card>
      ) : null}
      {!loading && activeMonth?.status === "CLOSED" ? (
        <ClosedMonthDashboard
          isOpeningNextMonth={submitting}
          month={activeMonth}
          onOpenNextMonth={() => void openNextMonth()}
        />
      ) : null}
      {!loading && activeMonth?.status === "ACTIVE" && !review ? (
        <Card>
          <h2>Revisión no disponible</h2>
          <p>Refrescá para revisar este mes antes de cerrarlo. Saldo inicial: {formatCop(activeMonth.openingBalance ?? 0)}; no es un ingreso nuevo.</p>
        </Card>
      ) : null}
      {!loading && activeMonth?.status === "ACTIVE" && review ? (
        <GuidedClosure
          key={`${activeMonth.id}-${revision}`}
          month={activeMonth}
          review={review}
          pending={submitting}
          onClose={input => void closeMonth(input)}
        >

        </GuidedClosure>
      ) : null}
    </section>
  );
};
