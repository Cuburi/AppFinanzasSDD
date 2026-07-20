import { Button, Card } from "../../../../components/ui";
import type { OpenMonthInput } from "../api/dashboardApi";

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

export function DashboardOperationalSection({ children }: { children: React.ReactNode }) {
  return <section aria-label="Operación del mes">{children}</section>;
}
