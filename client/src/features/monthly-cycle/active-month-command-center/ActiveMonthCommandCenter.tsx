import { Button, Card, KpiCard, StatusPill } from "../../../components/ui";
import type { CommandCenterViewModel, Metric } from "./model";

export type ActiveMonthCommandCenterProps = {
  viewModel: CommandCenterViewModel;
  onRetry: () => void;
};

const quickLinks = [
  ["Record income", "#monthly-income-workflow"],
  ["Record expense", "#expense-workflow"],
  ["View expense history", "#expense-history-workflow"],
  ["Manage month structure", "#month-structure-workflow"],
] as const;

const formatMetric = (metric: Metric) => (metric.status === "available" ? `$${metric.value.toFixed(2)}` : "Unavailable");

const metricTrend = (metric: Metric) => (metric.status === "available" && metric.value < 0 ? "negative" : "neutral");

export function ActiveMonthCommandCenter({ onRetry, viewModel }: ActiveMonthCommandCenterProps) {
  const isLoading = viewModel.lifecycle === "loading";
  const isClosed = viewModel.lifecycle === "closed";
  const isError = viewModel.lifecycle === "error" || viewModel.detail === "unavailable";
  const action = viewModel.action;

  return (
    <section aria-busy={isLoading} aria-labelledby="active-month-command-center-title">
      <Card className="stack-md">
        <div>
          <h2 id="active-month-command-center-title">Active month command center</h2>
          <p>Authoritative month context and the next available workflow.</p>
        </div>

        {isLoading ? <p role="status">Loading active month summary</p> : null}
        {viewModel.lifecycle === "unopened" ? <p role="status">No active month is open.</p> : null}
        {isClosed ? <StatusPill tone="neutral">Month closed: read-only summary</StatusPill> : null}
        {isError ? <p role="alert">{viewModel.lifecycle === "error" ? "Unable to load the active month summary." : "Authoritative financial data is unavailable. Retry the summary."}</p> : null}

        {!isLoading && viewModel.lifecycle !== "unopened" ? (
          <div className="grid grid-3">
            <KpiCard label="Available" trend={metricTrend(viewModel.metrics.available)} value={formatMetric(viewModel.metrics.available)} />
            <KpiCard label="Spent" trend={metricTrend(viewModel.metrics.spent)} value={formatMetric(viewModel.metrics.spent)} />
            <KpiCard label="Planned" trend={metricTrend(viewModel.metrics.planned)} value={formatMetric(viewModel.metrics.planned)} />
            <KpiCard label="Remaining" trend={metricTrend(viewModel.metrics.remaining)} value={formatMetric(viewModel.metrics.remaining)} />
          </div>
        ) : null}

        {action.kind === "retry-summary" ? <Button onClick={onRetry}>Retry summary</Button> : null}
        {!isClosed && action.target ? <a className="button primary" href={action.target}>{action.kind === "open-month" ? "Open a month" : action.explanation}</a> : null}

        <nav aria-label="Active month quick links">
          {quickLinks.map(([label, target]) => <a href={target} key={target}>{label}</a>)}
        </nav>
      </Card>
    </section>
  );
}
