import { Button, Card } from "../../../../components/ui";
import type { OpenMonthInput } from "../api/dashboardApi";
import type { DashboardViewModel } from "../model/contracts";
import { DashboardActivationForm, DashboardOperationalSection } from "./DashboardSections";

export type ActiveMonthDashboardProps = {
  children?: React.ReactNode;
  financialContent?: React.ReactNode;
  input?: OpenMonthInput;
  onInputChange?: (input: OpenMonthInput) => void;
  onOpenMonth: (input: OpenMonthInput) => void;
  onRefresh?: () => void;
  onRetryOpenMonth?: (input: OpenMonthInput) => void;
  onRetrySupport?: (source: "report" | "closure-review") => void;
  onRetry: () => void;
  pending?: boolean;
  primaryAction?: React.ReactNode;
  viewModel: DashboardViewModel;
};

export function ActiveMonthDashboard({ children, financialContent, input, onInputChange, onOpenMonth, onRefresh, onRetry, onRetryOpenMonth, onRetrySupport, pending = false, primaryAction, viewModel }: ActiveMonthDashboardProps) {
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

  return (
    <DashboardOperationalSection
      activityContent={children}
      financialContent={financialContent}
      month={viewModel.month!}
      primaryAction={primaryAction}
      quickActions={onRefresh ? <Button onClick={onRefresh} type="button" variant="secondary">Actualizar información</Button> : undefined}
      warnings={viewModel.supportFailures?.map((source) => (
        <Card key={source} className="stack-sm">
          <p role="alert">{source === "report" ? "No se pudo cargar el reporte." : "No se pudo cargar la revisión de cierre."}</p>
          <Button onClick={() => onRetrySupport?.(source)} type="button">
            {source === "report" ? "Reintentar reporte" : "Reintentar revisión de cierre"}
          </Button>
        </Card>
      ))}
    />
  );
}
