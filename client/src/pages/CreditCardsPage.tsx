import { useEffect, useState } from "react";

import { Button, Card, KpiCard, SectionHeader, StatusPill } from "../components/ui";
import { api } from "../lib/api";
import type { CreditCardStatementBucketView, CreditCardStatementSummaryListView, CreditCardStatementSummaryView, CreditCardView } from "../types";

const formatMoney = (amount: number) => `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return "unavailable";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "unavailable";

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
};

const formatPeriod = (bucket?: CreditCardStatementBucketView) => {
  if (!bucket) return "unavailable";
  const start = formatDate(bucket.periodStart);
  const end = formatDate(bucket.periodEnd);

  return start === "unavailable" || end === "unavailable" ? "unavailable" : `${start} – ${end}`;
};

const sumBucketAmounts = (statements: CreditCardStatementSummaryView[], bucket: "closedStatement" | "inProgressCycle") =>
  statements.reduce((total, statement) => total + statement[bucket].amount, 0);

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const emptyCardForm = () => ({ issuer: "", name: "", limit: "", closingDay: "", dueDay: "" });

type CardForm = ReturnType<typeof emptyCardForm>;

type CardFormInput = ReturnType<typeof cardInput>;

type Loadable<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

const initialState = <T,>(): Loadable<T> => ({ data: null, error: null, loading: true });

const CardStatus = ({ card }: { card: CreditCardView }) => (
  <StatusPill tone={card.active ? "success" : "neutral"}>{card.active ? "Active" : "Inactive"}</StatusPill>
);

const cardFormFromView = (card: CreditCardView): CardForm => ({
  issuer: card.issuer,
  name: card.name,
  limit: card.limit?.toString() ?? "",
  closingDay: card.closingDay.toString(),
  dueDay: card.dueDay.toString(),
});

function cardInput(form: CardForm) {
  return {
    issuer: form.issuer.trim(),
    name: form.name.trim(),
    limit: form.limit.trim() === "" ? null : Number(form.limit),
    closingDay: Number(form.closingDay),
    dueDay: Number(form.dueDay),
  };
}

const validCardInput = (input: CardFormInput) =>
  input.issuer.length > 0 &&
  input.name.length > 0 &&
  (input.limit === null || (Number.isFinite(input.limit) && input.limit > 0)) &&
  Number.isInteger(input.closingDay) &&
  input.closingDay >= 1 &&
  input.closingDay <= 31 &&
  Number.isInteger(input.dueDay) &&
  input.dueDay >= 1 &&
  input.dueDay <= 31;

const validationMessage = "Enter an issuer and card name, a positive limit when provided, and closing and due days from 1 to 31.";

const CardFormFields = ({ disabled, form, onChange }: { disabled: boolean; form: CardForm; onChange: (field: keyof CardForm, value: string) => void }) => (
  <>
    <label className="field">
      <span>Issuer</span>
      <input disabled={disabled} value={form.issuer} onChange={(event) => onChange("issuer", event.target.value)} required />
    </label>
    <label className="field">
      <span>Card name</span>
      <input disabled={disabled} value={form.name} onChange={(event) => onChange("name", event.target.value)} required />
    </label>
    <label className="field small-field">
      <span>Limit (optional)</span>
      <input disabled={disabled} min="0.01" step="0.01" type="number" value={form.limit} onChange={(event) => onChange("limit", event.target.value)} />
    </label>
    <label className="field small-field">
      <span>Closing day</span>
      <input disabled={disabled} min="1" max="31" step="1" type="number" value={form.closingDay} onChange={(event) => onChange("closingDay", event.target.value)} required />
    </label>
    <label className="field small-field">
      <span>Due day</span>
      <input disabled={disabled} min="1" max="31" step="1" type="number" value={form.dueDay} onChange={(event) => onChange("dueDay", event.target.value)} required />
    </label>
  </>
);

export const CreditCardsPage = () => {
  const [cardsState, setCardsState] = useState<Loadable<CreditCardView[]>>(initialState);
  const [statementState, setStatementState] = useState<Loadable<CreditCardStatementSummaryListView>>(initialState);
  const [newCard, setNewCard] = useState<CardForm>(emptyCardForm);
  const [editCards, setEditCards] = useState<Record<string, CardForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const applyCards = (cards: CreditCardView[]) => {
    setCardsState({ data: cards, error: null, loading: false });
    setEditCards(Object.fromEntries(cards.map((card) => [card.id, cardFormFromView(card)])));
  };

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
        if (!ignore) applyCards(data);
      })
      .catch((error) => {
        if (!ignore) setCardsState({ data: null, error: errorMessage(error, "Could not load credit cards."), loading: false });
      });

    return () => {
      ignore = true;
    };
  }, []);

  const refreshAfterMutation = async () => {
    const [cards, statements] = await Promise.all([api.getCreditCards("all"), api.getCurrentCreditCardStatements()]);
    applyCards(cards);
    setStatementState({ data: statements, error: null, loading: false });
  };

  const completeMutation = async (action: () => Promise<unknown>, success: string) => {
    setSubmitting(true);
    setMessage(null);
    setMutationError(null);

    try {
      await action();
    } catch (error) {
      setMutationError(errorMessage(error, "Could not save the credit card."));
      setSubmitting(false);
      return false;
    }

    try {
      await refreshAfterMutation();
      setMessage(success);
    } catch (error) {
      setMessage(success);
      setMutationError(`The credit card change was saved, but cards and statement periods could not be refreshed. ${errorMessage(error, "Please refresh the page.")}`);
    } finally {
      setSubmitting(false);
    }

    return true;
  };

  const createCard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = cardInput(newCard);

    if (!validCardInput(input)) {
      setMutationError(validationMessage);
      return;
    }

    if (await completeMutation(() => api.createCreditCard(input), "Credit card created.")) {
      setNewCard(emptyCardForm());
    }
  };

  const updateCard = async (card: CreditCardView) => {
    const input = cardInput(editCards[card.id] ?? emptyCardForm());

    if (!validCardInput(input)) {
      setMutationError(validationMessage);
      return;
    }

    await completeMutation(() => api.updateCreditCard(card.id, input), "Credit card updated.");
  };

  const changeLifecycle = async (card: CreditCardView) => {
    await completeMutation(
      () => (card.active ? api.inactivateCreditCard(card.id) : api.activateCreditCard(card.id)),
      card.active ? "Credit card inactivated." : "Credit card reactivated.",
    );
  };

  const statements = statementState.data?.cards ?? [];
  const closedStatementTotal = sumBucketAmounts(statements, "closedStatement");
  const inProgressCycleTotal = sumBucketAmounts(statements, "inProgressCycle");

  return (
    <section className="page stack-lg">
      <header className="page-header">
        <div>
          <p className="eyebrow">Credit Cards</p>
          <h1>Credit Cards</h1>
          <p>Manage your cards alongside their current statement periods and consumption.</p>
        </div>
      </header>

      <Card aria-label="Current credit card state" className="stack-md">
        <SectionHeader
          description="Closed statement periods and in-progress consumption are provided separately by the credit-card API."
          title="Credit card statement periods"
        />
        {statementState.loading ? <p>Loading credit card statement periods...</p> : null}
        {statementState.error ? <p role="alert" className="error">{statementState.error}</p> : null}
        {!statementState.loading && !statementState.error && statements.length === 0 ? <p>No credit-card statement periods are available yet.</p> : null}

        {statements.length > 0 ? (
          <div className="dashboard-kpi-grid">
            <KpiCard
              detail={`Amount from ${statements.length} closed statement period${statements.length === 1 ? "" : "s"}`}
              label="Closed statement total"
              trend={closedStatementTotal > 0 ? "negative" : "neutral"}
              value={formatMoney(closedStatementTotal)}
            />
            <KpiCard
              detail={`New consumption from ${statements.length} open cycle${statements.length === 1 ? "" : "s"}`}
              label="In-progress cycle total"
              trend={inProgressCycleTotal > 0 ? "negative" : "neutral"}
              value={formatMoney(inProgressCycleTotal)}
            />
          </div>
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
                  <p>{statement.issuer}</p>
                  <p>Closed statement: {formatMoney(statement.closedStatement.amount)} · {formatPeriod(statement.closedStatement)}</p>
                  <p>Due date: {formatDate(statement.closedStatement.dueDate)} · Cutoff: {formatDate(statement.closedStatement.cutoffDate)}</p>
                  <p>In-progress cycle: {formatMoney(statement.inProgressCycle.amount)} · {formatPeriod(statement.inProgressCycle)}</p>
                  <p>Cutoff: {formatDate(statement.inProgressCycle.cutoffDate)}</p>
                </div>
                <StatusPill tone="neutral">App-estimated</StatusPill>
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      <Card aria-label="Credit card inventory" className="stack-md">
        <SectionHeader description="Create, update, and manage the active status of your cards." title="Cards" />
        <form aria-label="Create credit card" className="row gap-sm wrap align-start" onSubmit={createCard}>
          <CardFormFields
            disabled={submitting}
            form={newCard}
            onChange={(field, value) => setNewCard((current) => ({ ...current, [field]: value }))}
          />
          <Button disabled={submitting} type="submit">Create card</Button>
        </form>

        {message ? <p className="success" role="status">{message}</p> : null}
        {mutationError ? <p className="error" role="alert">{mutationError}</p> : null}
        {cardsState.loading ? <p>Loading credit cards...</p> : null}
        {cardsState.error ? (
          <>
            <p role="alert" className="error">{cardsState.error}</p>
            <p>Statement data remains visible while card inventory could not load.</p>
          </>
        ) : null}
        {!cardsState.loading && !cardsState.error && cardsState.data?.length === 0 ? <p>No credit cards are registered yet.</p> : null}

        {cardsState.data?.length ? (
          <div className="stack-sm">
            {cardsState.data.map((card) => {
              const form = editCards[card.id] ?? emptyCardForm();
              const updateForm = (field: keyof CardForm, value: string) => {
                setEditCards((current) => ({ ...current, [card.id]: { ...form, [field]: value } }));
              };

              return (
                <article className="budget-line align-start" key={card.id}>
                  <div className="stack-sm grow">
                    <div>
                      <strong>{card.name}</strong>
                      <p>{card.issuer} · Limit: {card.limit === null ? "unavailable" : formatMoney(card.limit)}</p>
                      <p>Closing day {card.closingDay} · Due day {card.dueDay}</p>
                    </div>
                    <CardStatus card={card} />
                  </div>
                  <form aria-label={`Edit ${card.name}`} className="row gap-sm wrap align-start" onSubmit={(event) => { event.preventDefault(); void updateCard(card); }}>
                    <CardFormFields disabled={submitting} form={form} onChange={updateForm} />
                    <Button disabled={submitting} type="submit">Save changes</Button>
                    <Button disabled={submitting} onClick={() => void changeLifecycle(card)} type="button" variant="tertiary">
                      {card.active ? "Inactivate" : "Reactivate"}
                    </Button>
                  </form>
                </article>
              );
            })}
          </div>
        ) : null}
      </Card>
    </section>
  );
};
