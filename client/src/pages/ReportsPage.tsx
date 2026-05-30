import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { BasicMonthlyReport, BasicReportSubcategory, Month } from "../types";

const formatMonthLabel = (report: BasicMonthlyReport) => `${report.summary.year}-${String(report.summary.month).padStart(2, "0")}`;
const formatMoney = (amount: number) => `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)}`;

type ReportSectionProps = {
  title: string;
  emptyMessage: string;
  items: BasicReportSubcategory[];
};

const ReportSubcategorySection = ({ title, emptyMessage, items }: ReportSectionProps) => (
  <section aria-label={title} className="card stack-sm">
    <h2>{title}</h2>
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
  </section>
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
          <h1>Basic Reports</h1>
          <p>Active month: {formatMonthLabel(report)} · {report.summary.status}</p>
        </div>
      </header>

      <article className="card stack-md">
        <h2>Summary</h2>
        <div className="row gap-sm wrap">
          <span className="pill success">Monthly income: {formatMoney(report.summary.monthlyIncomeTotal)}</span>
          <span className={report.summary.availableMoney < 0 ? "pill danger" : "pill success"}>Available money: {formatMoney(report.summary.availableMoney)}</span>
          <span className={report.summary.cashBalance < 0 ? "pill danger" : "pill success"}>Cash balance: {formatMoney(report.summary.cashBalance)}</span>
          <span className="pill">Total planned: {formatMoney(report.summary.totalPlanned)}</span>
          <span className="pill danger">Cash spending: {formatMoney(report.summary.totalSpentCash)}</span>
          <span className="pill danger">Non-cash spending: {formatMoney(report.summary.totalSpentNonCash)}</span>
        </div>
      </article>

      <ReportSubcategorySection title="Top spending subcategories" emptyMessage="No spending recorded for this active month." items={report.topSpendingSubcategories} />
      <ReportSubcategorySection title="Surplus subcategories" emptyMessage="No surplus subcategories for this active month." items={report.surplusSubcategories} />
      <ReportSubcategorySection title="Deficit subcategories" emptyMessage="No deficit subcategories for this active month." items={report.deficitSubcategories} />
    </section>
  );
};
