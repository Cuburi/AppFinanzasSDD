export type CreditCardMovementSummaryInput = {
  ownerId: string;
  creditCardId: string;
  from: Date;
  to: Date;
};

export type CreditCardMovementSummaryPort = {
  sumExpensesByCardInWindow(input: CreditCardMovementSummaryInput): Promise<number>;
};
