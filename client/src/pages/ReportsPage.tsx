import { useEffect, useState } from "react";

import { Card, KpiCard, SectionHeader, StatusPill } from "../components/ui";
import { api } from "../lib/api";
import type { BasicMonthlyReport, BasicReportSubcategory, Month } from "../types";

const formatMonthLabel = (report: BasicMonthlyReport) => `${report.summary.year}-${String(report.summary.month).padStart(2, "0")}`;
const formatMoney = (amount: number) => `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)}`;
const balanceTrend = (amount: number) => (amount < 0 ? "negative" : "positive");

type ReportSectionProps = {
  title: string;
  emptyMessage: string;
  items: BasicReportSubcategory[];
};

const ReportSubcategorySection = ({ title, emptyMessage, items }: ReportSectionProps) => (
  <Card aria-label={title} className="stack-sm">
    <SectionHeader title={title} />
    {items.length === 0 ? <p>{emptyMessage}</p> : null}
    <div className="stack-sm">
      {items.map((item) => (
        <article className="budget-line align-start" key={item.subcategoryId}>
          <div>
            <strong>{item.subcategoryName}</strong>
            <p>
              {item.categoryName} · {formatMoney(item.amount)}
            </p>
          </div>
        </article>
      ))}
    </div>
  </Card>
);

export const ReportsPage = () => {
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [report, setReport] = useState<BasicMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadReport = async () => {
      try {
        const month = await api.getActiveMonth();
        if (ignore) return;

        setActiveMonth(month);
        if (!month) {
          setReport(null);
          return;
        }

        const nextReport = await api.getBasicReport(month.id);
        if (!ignore) {
          setReport(nextReport);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the active month report.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadReport();

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <p>Loading active month report...</p>;
  }

  if (error) {
    return <p role="alert" className="error">{error}</p>;
  }

  if (!activeMonth || !report) {
    return <p>There is no active month to report yet.</p>;
  }

  return (
    <section className="page stack-lg">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reports dashboard</p>
          <h1>Basic Reports</h1>
          <p>Active month: {formatMonthLabel(report)} · {report.summary.status}</p>
        </div>
      </header>

      <Card aria-label="Summary" className="stack-md">
        <SectionHeader
          description="Current active month totals, spending pressure, and available balances."
          title="Summary"
        />
        <div className="dashboard-kpi-grid">
          <KpiCard
            detail="Income booked for the active month"
            label="Monthly income"
            trend="positive"
            value={formatMoney(report.summary.monthlyIncomeTotal)}
          />
          <KpiCard
            detail="Money available after planning"
            label="Available money"
            trend={balanceTrend(report.summary.availableMoney)}
            value={formatMoney(report.summary.availableMoney)}
          />
          <KpiCard
            detail="Cash position for spending"
            label="Cash balance"
            trend={balanceTrend(report.summary.cashBalance)}
            value={formatMoney(report.summary.cashBalance)}
          />
        </div>
        <div className="row gap-sm wrap">
          <StatusPill aria-label={`Neutral: Total planned ${formatMoney(report.summary.totalPlanned)}`}>
            Total planned: {formatMoney(report.summary.totalPlanned)}
          </StatusPill>
          <StatusPill aria-label={`Danger: Cash spending ${formatMoney(report.summary.totalSpentCash)}`} tone="danger">
            Cash spending: {formatMoney(report.summary.totalSpentCash)}
          </StatusPill>
          <StatusPill aria-label={`Danger: Non-cash spending ${formatMoney(report.summary.totalSpentNonCash)}`} tone="danger">
            Non-cash spending: {formatMoney(report.summary.totalSpentNonCash)}
          </StatusPill>
        </div>
      </Card>

      <ReportSubcategorySection title="Top spending subcategories" emptyMessage="No spending recorded for this active month." items={report.topSpendingSubcategories} />
      <ReportSubcategorySection title="Surplus subcategories" emptyMessage="No surplus subcategories for this active month." items={report.surplusSubcategories} />
      <ReportSubcategorySection title="Deficit subcategories" emptyMessage="No deficit subcategories for this active month." items={report.deficitSubcategories} />
    </section>
  );
};
