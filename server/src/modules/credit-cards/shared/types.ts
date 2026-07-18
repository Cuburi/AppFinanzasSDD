export type CreditCardView = {
  id: string;
  ownerId: string;
  issuer: string;
  name: string;
  limit: number | null;
  closingDay: number;
  dueDay: number;
  active: boolean;
};

export type CreditCardListFilter = { active: boolean | "all" };

export type CreditCardListView = { cards: CreditCardView[] };

export type CreditCardStatementBucketView = {
  periodStart: string;
  periodEnd: string;
  cutoffDate: string;
  amount: number;
};

export type CreditCardStatementSummaryView = {
  creditCardId: string;
  name: string;
  issuer: string;
  limit: number | null;
  closedStatement: CreditCardStatementBucketView & { dueDate: string };
  inProgressCycle: CreditCardStatementBucketView;
};

export type CreditCardStatementSummaryListView = {
  estimation: "APP_ESTIMATED";
  cards: CreditCardStatementSummaryView[];
};

export type CreateCreditCardInput = {
  issuer: string;
  name: string;
  limit?: number | null;
  closingDay: number;
  dueDay: number;
};

export type UpdateCreditCardInput = Partial<CreateCreditCardInput & { active: boolean }>;
