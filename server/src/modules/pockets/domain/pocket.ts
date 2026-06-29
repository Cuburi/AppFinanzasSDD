import type { CreatePocketInput, PocketMovement, SavingsPocketView } from "../shared/types.js";

export type Pocket = {
  id: string;
  name: string;
  goalAmount: number | null;
  active: boolean;
  incomingMovements: PocketMovement[];
  outgoingMovements: PocketMovement[];
};

export type NewPocket = {
  name: string;
  goalAmount: number | null;
  active: true;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const normalizePocketName = (name: string) => name.trim();

const sortRecentMovements = (movements: Array<PocketMovement & { direction: "in" | "out" }>) =>
  [...movements].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());

export const createPocket = (input: CreatePocketInput): NewPocket => ({
  name: normalizePocketName(input.name),
  goalAmount: input.goalAmount ?? null,
  active: true,
});

export const rehydratePocket = (pocket: Pocket): Pocket => ({
  ...pocket,
  name: normalizePocketName(pocket.name),
  goalAmount: pocket.goalAmount ?? null,
  incomingMovements: pocket.incomingMovements.map((movement) => ({ ...movement, description: movement.description ?? null })),
  outgoingMovements: pocket.outgoingMovements.map((movement) => ({ ...movement, description: movement.description ?? null })),
});

export const calculatePocketBalance = (pocket: Pocket) => {
  const incoming = pocket.incomingMovements.reduce((total, movement) => total + movement.amount, 0);
  const outgoing = pocket.outgoingMovements.reduce((total, movement) => total + movement.amount, 0);

  return roundMoney(incoming - outgoing);
};

export const projectRecentMovements = (pocket: Pocket) => {
  const incomingMovements = pocket.incomingMovements.map((movement) => ({ ...movement, direction: "in" as const }));
  const outgoingMovements = pocket.outgoingMovements.map((movement) => ({ ...movement, direction: "out" as const }));

  return sortRecentMovements([...incomingMovements, ...outgoingMovements])
    .slice(0, 5)
    .map((movement) => ({
      id: movement.id,
      type: movement.type,
      amount: movement.amount,
      occurredAt: movement.occurredAt.toISOString(),
      description: movement.description,
      direction: movement.direction,
    }));
};

export const toPocketView = (pocket: Pocket): SavingsPocketView => ({
  id: pocket.id,
  name: pocket.name,
  goalAmount: pocket.goalAmount,
  active: pocket.active,
  balance: calculatePocketBalance(pocket),
  recentMovements: projectRecentMovements(pocket),
});
