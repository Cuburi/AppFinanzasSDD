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

export type CreateCreditCardInput = {
  issuer: string;
  name: string;
  limit?: number | null;
  closingDay: number;
  dueDay: number;
};

export type UpdateCreditCardInput = Partial<CreateCreditCardInput & { active: boolean }>;
