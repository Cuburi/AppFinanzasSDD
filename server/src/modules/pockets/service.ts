import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import type { CreatePocketInput, PocketListFilter, SavingsPocketView, UpdatePocketInput } from "./dto.js";

export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

type PocketMovementRecord = {
  id: string;
  type: string;
  amount: Prisma.Decimal;
  occurredAt: Date;
  description: string | null;
  sourcePocketId: string | null;
  targetPocketId: string | null;
};

type PocketRecord = {
  id: string;
  name: string;
  goalAmount: Prisma.Decimal | null;
  active: boolean;
  incomingMovements: PocketMovementRecord[];
  outgoingMovements: PocketMovementRecord[];
};

type PocketsDb = {
  savingsPocket: {
    findMany(args: {
      where?: { active?: boolean };
      orderBy: { name: "asc" };
      include: typeof pocketInclude;
    }): Promise<PocketRecord[]>;
    findUnique(args: {
      where: { id: string } | { name: string };
      include?: typeof pocketInclude;
    }): Promise<PocketRecord | null>;
    create(args: {
      data: { name: string; goalAmount: Prisma.Decimal | null; active: true };
      include: typeof pocketInclude;
    }): Promise<PocketRecord>;
    update(args: {
      where: { id: string };
      data: { name?: string; goalAmount?: Prisma.Decimal | null; active?: boolean };
      include: typeof pocketInclude;
    }): Promise<PocketRecord>;
  };
};

const recentMovementOrder = { occurredAt: "desc" as const };

const pocketInclude = {
  incomingMovements: { orderBy: recentMovementOrder },
  outgoingMovements: { orderBy: recentMovementOrder },
};

const decimal = (value: number | null | undefined) => (value === null || value === undefined ? null : new Prisma.Decimal(value.toFixed(2)));
const decimalToNumber = (value: Prisma.Decimal) => Number(value.toString());
const normalizeName = (name: string) => name.trim();

const readPocketById = async (db: PocketsDb, id: string): Promise<PocketRecord> => {
  const pocket = await db.savingsPocket.findUnique({ where: { id }, include: pocketInclude });

  if (!pocket) {
    throw new DomainError(404, "Pocket was not found.");
  }

  return pocket;
};

const assertUniqueName = async (db: PocketsDb, name: string, currentId?: string) => {
  const existing = await db.savingsPocket.findUnique({ where: { name: normalizeName(name) }, include: pocketInclude });

  if (existing && existing.id !== currentId) {
    throw new DomainError(409, "A pocket with that name already exists.");
  }
};

const calculateBalance = (pocket: PocketRecord) => {
  const incoming = pocket.incomingMovements.reduce((total, movement) => total + decimalToNumber(movement.amount), 0);
  const outgoing = pocket.outgoingMovements.reduce((total, movement) => total + decimalToNumber(movement.amount), 0);

  return Number((incoming - outgoing).toFixed(2));
};

const mapPocket = (pocket: PocketRecord): SavingsPocketView => {
  const incomingMovements = pocket.incomingMovements.map((movement) => ({ ...movement, direction: "in" as const }));
  const outgoingMovements = pocket.outgoingMovements.map((movement) => ({ ...movement, direction: "out" as const }));
  const recentMovements = [...incomingMovements, ...outgoingMovements]
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 5)
    .map((movement) => ({
      id: movement.id,
      type: movement.type,
      amount: decimalToNumber(movement.amount),
      occurredAt: movement.occurredAt.toISOString(),
      description: movement.description,
      direction: movement.direction,
    }));

  return {
    id: pocket.id,
    name: pocket.name,
    goalAmount: pocket.goalAmount ? decimalToNumber(pocket.goalAmount) : null,
    active: pocket.active,
    balance: calculateBalance(pocket),
    recentMovements,
  };
};

export const createPocketsService = (db: PocketsDb) => ({
  async listPockets(filter: PocketListFilter) {
    const pockets = await db.savingsPocket.findMany({
      where: filter.active === "all" ? {} : { active: filter.active },
      orderBy: { name: "asc" },
      include: pocketInclude,
    });

    return { pockets: pockets.map(mapPocket) };
  },

  async getPocket(id: string) {
    return mapPocket(await readPocketById(db, id));
  },

  async createPocket(input: CreatePocketInput) {
    await assertUniqueName(db, input.name);
    const pocket = await db.savingsPocket.create({
      data: { name: normalizeName(input.name), goalAmount: decimal(input.goalAmount), active: true },
      include: pocketInclude,
    });

    return mapPocket(pocket);
  },

  async updatePocket(id: string, input: UpdatePocketInput) {
    await readPocketById(db, id);

    if (input.name !== undefined) {
      await assertUniqueName(db, input.name, id);
    }

    const pocket = await db.savingsPocket.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: normalizeName(input.name) } : {}),
        ...(input.goalAmount !== undefined ? { goalAmount: decimal(input.goalAmount) } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: pocketInclude,
    });

    return mapPocket(pocket);
  },

  async deactivatePocket(id: string) {
    await readPocketById(db, id);
    const pocket = await db.savingsPocket.update({ where: { id }, data: { active: false }, include: pocketInclude });

    return mapPocket(pocket);
  },
});

const pocketsService = createPocketsService(prisma as unknown as PocketsDb);

export const listPockets = (filter: PocketListFilter) => pocketsService.listPockets(filter);
export const getPocket = (id: string) => pocketsService.getPocket(id);
export const createPocket = (input: CreatePocketInput) => pocketsService.createPocket(input);
export const updatePocket = (id: string, input: UpdatePocketInput) => pocketsService.updatePocket(id, input);
export const deactivatePocket = (id: string) => pocketsService.deactivatePocket(id);
