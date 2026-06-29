export type PocketListFilter = {
  active: boolean | "all";
};

export type CreatePocketInput = {
  name: string;
  goalAmount?: number | null;
};

export type UpdatePocketInput = {
  name?: string;
  goalAmount?: number | null;
  active?: boolean;
};

export type PocketMovement = {
  id: string;
  type: string;
  amount: number;
  occurredAt: Date;
  description: string | null;
};

export type PocketMovementView = {
  id: string;
  type: string;
  amount: number;
  occurredAt: string;
  description: string | null;
  direction: "in" | "out";
};

export type SavingsPocketView = {
  id: string;
  name: string;
  goalAmount: number | null;
  active: boolean;
  balance: number;
  recentMovements: PocketMovementView[];
};

export type PocketListView = {
  pockets: SavingsPocketView[];
};
