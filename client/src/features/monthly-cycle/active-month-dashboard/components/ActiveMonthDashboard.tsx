import { Button, Card } from "../../../../components/ui";
import type { OpenMonthInput } from "../api/dashboardApi";
import type { DashboardViewModel } from "../model/contracts";
import { DashboardActivationForm, DashboardOperationalSection } from "./DashboardSections";

export type ActiveMonthDashboardProps = {
  children?: React.ReactNode;
  input?: OpenMonthInput;
  onInputChange?: (input: OpenMonthInput) => void;
  onOpenMonth: (input: OpenMonthInput) => void;
  onRetryOpenMonth?: (input: OpenMonthInput) => void;
  onRetry: () => void;
  pending?: boolean;
  viewModel: DashboardViewModel;
};

export function ActiveMonthDashboard({ children, input, onInputChange, onOpenMonth, onRetry, onRetryOpenMonth, pending = false, viewModel }: ActiveMonthDashboardProps) {
  if (viewModel.lifecycle === "loading") return <p role="status">Cargando mes activo...</p>;

  if (viewModel.lifecycle === "blocking") {
    const retryOpenMonthInput = viewModel.action.kind === "retry-open-month" ? viewModel.action.input : undefined;
    const retry = retryOpenMonthInput ? () => onRetryOpenMonth?.(retryOpenMonthInput) : onRetry;
    return (
      <Card className="stack-md">
        <p role="alert">{viewModel.error ?? "No se pudo cargar el mes activo."}</p>
        <Button onClick={retry} type="button">Reintentar</Button>
      </Card>
    );
  }

  if (viewModel.lifecycle === "unopened") {
    const defaultInput = input ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    return (
      <section className="page stack-lg">
        <p role="status">Todavía no hay un mes activo.</p>
        <DashboardActivationForm input={defaultInput} onChange={onInputChange ?? (() => undefined)} onSubmit={() => onOpenMonth(defaultInput)} pending={pending} />
      </section>
    );
  }

  return <DashboardOperationalSection>{children}</DashboardOperationalSection>;
}
