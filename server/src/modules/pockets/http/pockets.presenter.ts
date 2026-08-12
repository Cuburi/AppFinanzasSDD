import type { PocketListView, SavingsPocketView } from "../shared/types.js";

export const toPocketApiView = (pocket: SavingsPocketView): SavingsPocketView => ({
  id: pocket.id,
  name: pocket.name,
  goalAmount: pocket.goalAmount,
  active: pocket.active,
  balance: pocket.balance,
  recentMovements: pocket.recentMovements.map((movement) => ({
    id: movement.id,
    type: movement.type,
    amount: movement.amount,
    occurredAt: movement.occurredAt,
    description: movement.description,
    direction: movement.direction,
    ...(movement.sourceKind ? { sourceKind: movement.sourceKind, sourceLabel: movement.sourceLabel ?? null } : {}),
  })),
});

export const toPocketListApiResponse = (list: PocketListView): PocketListView => ({ pockets: list.pockets.map(toPocketApiView) });
