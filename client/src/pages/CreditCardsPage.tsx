import { useEffect, useState } from "react";

import { Card, KpiCard, SectionHeader, StatusPill } from "../components/ui";
import { api } from "../lib/api";
import type { CreditCardStatementSummaryListView, CreditCardStatementSummaryView, CreditCardView } from "../types";

const formatMoney = (amount: number) => `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return "unavailable";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "unavailable";

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
};

const formatCycle = (statement?: CreditCardStatementSummaryView) => {
  if (!statement) return "unavailable";
  const start = formatDate(statement.cycleStart);
  const end = formatDate(statement.cycleEnd);

  return start === "unavailable" || end === "unavailable" ? "unavailable" : `${start} – ${end}`;
};

const sumStatements = (statements: CreditCardStatementSummaryView[]) => statements.reduce((total, statement) => total + statement.estimatedSpent, 0);

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

type Loadable<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

const initialState = <T,>(): Loadable<T> => ({ data: null, error: null, loading: true });

const CardStatus = ({ card }: { card: CreditCardView }) => (
  <StatusPill tone={card.active ? "success" : "neutral"}>{card.active ? "Active" : "Inactive"}</StatusPill>
);

export const CreditCardsPage = () => {
  const [cardsState, setCardsState] = useState<Loadable<CreditCardView[]>>(initialState);
  const [statementState, setStatementState] = useState<Loadable<CreditCardStatementSummaryListView>>(initialState);

  useEffect(() => {
    let ignore = false;

    void api
      .getCurrentCreditCardStatements()
      .then((data) => {
        if (!ignore) setStatementState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!ignore) setStatementState({ data: null, error: errorMessage(error, "Could not load current statements."), loading: false });
      });

    void api
      .getCreditCards("all")
      .then((data) => {
        if (!ignore) setCardsState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!ignore) setCardsState({ data: null, error: errorMessage(error, "Could not load credit cards."), loading: false });
      });

    return () => {
      ignore = true;
    };
  }, []);

  const statements = statementState.data?.cards ?? [];
  const primaryStatement = statements[0];
  const total = sumStatements(statements);

  return (
    <section className="page stack-lg">
      <header className="page-header">
        <div>
          <p className="eyebrow">Credit Cards</p>
          <h1>Credit Cards</h1>
          <p>Read-only current statement dashboard with app-estimated amounts.</p>
        </div>
      </header>

      <Card aria-label="Current statement" className="stack-md">
        <SectionHeader
          description="App-estimated current statement usage across all cards, not bank-confirmed debt."
          title="Current statement"
        />

        {statementState.loading ? <p>Loading current statement...</p> : null}
        {statementState.error ? <p role="alert" className="error">{statementState.error}</p> : null}
        {!statementState.loading && !statementState.error && statements.length === 0 ? <p>No current credit-card statement usage yet.</p> : null}

        {statements.length > 0 ? (
          <>
            <div className="dashboard-kpi-grid">
              <KpiCard
                detail={`App-estimated from ${statements.length} current card statement${statements.length === 1 ? "" : "s"}`}
                label="Current statement total"
                trend={total > 0 ? "negative" : "neutral"}
                value={formatMoney(total)}
              />
              <KpiCard detail="Across the leading current statement" label="Cycle" value={formatCycle(primaryStatement)} />
              <KpiCard detail="Payment timing from statement data" label="Due date" value={formatDate(primaryStatement?.dueDate)} />
            </div>
            <div className="row gap-sm wrap">
              <StatusPill>Cycle: {formatCycle(primaryStatement)}</StatusPill>
              <StatusPill>Cutoff: {formatDate(primaryStatement?.cutoffDate)}</StatusPill>
              <StatusPill tone="warning">Due: {formatDate(primaryStatement?.dueDate)}</StatusPill>
              <StatusPill tone="neutral">App-estimated</StatusPill>
            </div>
          </>
        ) : null}
      </Card>

      {statements.length > 0 ? (
        <Card aria-label="Statement breakdown by card" className="stack-md">
          <SectionHeader title="Statement breakdown by card" />
          <div className="stack-sm">
            {statements.map((statement) => (
              <article className="budget-line align-start" key={statement.creditCardId}>
                <div>
                  <strong>{statement.name}</strong>
                  <p>{statement.issuer} · {formatMoney(statement.estimatedSpent)} app-estimated</p>
                </div>
                <StatusPill tone="warning">Payment due {formatDate(statement.dueDate)}</StatusPill>
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      <Card aria-label="Credit card inventory" className="stack-md">
        <SectionHeader description="Card status context only. Management flows are out of scope for this read-only slice." title="Cards" />
        {cardsState.loading ? <p>Loading credit cards...</p> : null}
        {cardsState.error ? (
          <>
            <p role="alert" className="error">{cardsState.error}</p>
            <p>Statement data remains visible while card inventory could not load.</p>
          </>
        ) : null}
        {!cardsState.loading && !cardsState.error && cardsState.data?.length === 0 ? <p>No credit cards are registered yet.</p> : null}
        {cardsState.data && cardsState.data.length > 0 ? (
          <div className="stack-sm">
            {cardsState.data.map((card) => (
              <article className="budget-line align-start" key={card.id}>
                <div>
                  <strong>{card.name}</strong>
                  <p>{card.issuer} · Limit: {card.limit === null ? "unavailable" : formatMoney(card.limit)}</p>
                  <p>Closing day {card.closingDay} · Due day {card.dueDay}</p>
                </div>
                <CardStatus card={card} />
              </article>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  );
};
