import { Button, Card, StatusPill } from "../../../../components/ui";
import type { OpenMonthInput } from "../api/dashboardApi";
import type { Month } from "../../../../types";

export type DashboardActivationFormProps = {
  input: OpenMonthInput;
  onChange: (input: OpenMonthInput) => void;
  onSubmit: () => void;
  pending: boolean;
};

export function DashboardActivationForm({ input, onChange, onSubmit, pending }: DashboardActivationFormProps) {
  return (
    <Card aria-label="Abrir mes manualmente" className="stack-md">
      <h2>Abrir mes manualmente</h2>
      <form className="row gap-sm wrap" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <label className="field small-field">
          <span>Año</span>
          <input min="2000" onChange={(event) => onChange({ ...input, year: Number(event.target.value) })} required step="1" type="number" value={input.year} />
        </label>
        <label className="field small-field">
          <span>Mes</span>
          <input max="12" min="1" onChange={(event) => onChange({ ...input, month: Number(event.target.value) })} required step="1" type="number" value={input.month} />
        </label>
        <Button disabled={pending} type="submit">
          {pending ? "Abriendo..." : "Abrir mes"}
        </Button>
      </form>
    </Card>
  );
}

export function DashboardOperationalSection({ activityContent, financialContent, month, primaryAction, quickActions, warnings }: {
  activityContent?: React.ReactNode;
  financialContent?: React.ReactNode;
  month: Month;
  primaryAction?: React.ReactNode;
  quickActions?: React.ReactNode;
  warnings?: React.ReactNode;
}) {
  const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
  const title = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${month.year}`;
  const isClosed = month.status === "CLOSED" || Boolean(month.closedAt);

  return (
    <section aria-label="Panel del mes activo" className="active-month-dashboard dashboard-operational stack-lg">
      <section aria-label="Estado del mes" className="dashboard-context">
        <div>
          <h1 id="active-month-dashboard-title">{title}</h1>
          <p className="section-description">Resumen operativo de tus finanzas personales.</p>
        </div>
        <div className="dashboard-context-actions">
          <StatusPill aria-label={isClosed ? "Mes cerrado" : "Mes abierto"} tone={isClosed ? "neutral" : "success"}>{isClosed ? "Mes cerrado" : "Mes abierto"}</StatusPill>
          <p className="dashboard-context-meta">Información actual del mes</p>
        </div>
      </section>
      {financialContent ? <section aria-label="Resumen financiero">{financialContent}</section> : null}
      {primaryAction ? <section aria-label="Próxima acción" className="dashboard-actions dashboard-primary-action"><p className="eyebrow">Próxima acción</p>{primaryAction}</section> : null}
      {quickActions ? <section aria-label="Acciones rápidas" className="dashboard-actions dashboard-quick-actions"><p className="eyebrow">Acciones rápidas</p>{quickActions}</section> : null}
      {warnings}
      {activityContent ? <section aria-label="Actividad y contexto" className="dashboard-activity">{activityContent}</section> : null}
    </section>
  );
}
