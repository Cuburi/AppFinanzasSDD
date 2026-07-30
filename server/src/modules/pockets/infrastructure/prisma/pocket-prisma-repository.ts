import { Prisma } from "../../../../lib/prisma-client.js";
import type { PocketRepository } from "../../application/ports/pocket-repository.port.js";
import { rehydratePocket } from "../../domain/pocket.js";
import type { PocketListFilter } from "../../shared/types.js";

const recentMovementOrder = { occurredAt: "desc" as const };

const pocketInclude = {
  incomingMovements: { orderBy: recentMovementOrder },
  outgoingMovements: { orderBy: recentMovementOrder },
};

type PocketMovementRecord = {
  id: string;
  type: string;
  amount: { toString(): string };
  occurredAt: Date;
  description: string | null;
  sourcePocketId: string | null;
  targetPocketId: string | null;
};

type PocketRecord = {
  id: string;
  name: string;
  goalAmount: { toString(): string } | null;
  active: boolean;
  incomingMovements: PocketMovementRecord[];
  outgoingMovements: PocketMovementRecord[];
};

type PrismaPocketClient = {
  savingsPocket: {
    findMany(args: { where?: { active?: boolean }; orderBy: { name: "asc" }; include: typeof pocketInclude }): Promise<PocketRecord[]>;
    findUnique(args: { where: { id: string } | { name: string }; include?: typeof pocketInclude }): Promise<PocketRecord | null>;
    findFirst(args: { where: { name: { equals: string; mode: "insensitive" } }; include?: typeof pocketInclude }): Promise<PocketRecord | null>;
    create(args: { data: { name: string; goalAmount: Prisma.Decimal | null; active: true }; include: typeof pocketInclude }): Promise<PocketRecord>;
    update(args: { where: { id: string }; data: { name?: string; goalAmount?: Prisma.Decimal | null; active?: boolean }; include: typeof pocketInclude }): Promise<PocketRecord>;
  };
};

const decimal = (value: number | null | undefined) => (value === null || value === undefined ? null : new Prisma.Decimal(value.toFixed(2)));
const decimalLikeToNumber = (value: { toString(): string }) => Number(value.toString());
const AVAILABLE_DEPOSIT_TYPE = "POCKET_DEPOSIT_FROM_AVAILABLE";
const LEGACY_EXTERNAL_DEPOSIT_TYPE = "POCKET_DEPOSIT_EXTERNAL";
const mapCompatibilityMovementType = (type: string) => (type === AVAILABLE_DEPOSIT_TYPE ? LEGACY_EXTERNAL_DEPOSIT_TYPE : type);

const mapMovementRecord = (movement: PocketMovementRecord) => ({
  id: movement.id,
  type: mapCompatibilityMovementType(movement.type),
  amount: decimalLikeToNumber(movement.amount),
  occurredAt: movement.occurredAt,
  description: movement.description,
});

const mapPocketRecord = (pocket: PocketRecord) =>
  rehydratePocket({
    id: pocket.id,
    name: pocket.name,
    goalAmount: pocket.goalAmount ? decimalLikeToNumber(pocket.goalAmount) : null,
    active: pocket.active,
    incomingMovements: pocket.incomingMovements.map(mapMovementRecord),
    outgoingMovements: pocket.outgoingMovements.map(mapMovementRecord),
  });

const whereFromFilter = (filter: PocketListFilter) => (filter.active === "all" ? {} : { active: filter.active });

export const createPocketPrismaRepository = (db: PrismaPocketClient): PocketRepository => ({
  async findAll(filter) {
    return (await db.savingsPocket.findMany({ where: whereFromFilter(filter), orderBy: { name: "asc" }, include: pocketInclude })).map(mapPocketRecord);
  },

  async findById(id) {
    const pocket = await db.savingsPocket.findUnique({ where: { id }, include: pocketInclude });
    return pocket ? mapPocketRecord(pocket) : null;
  },

  async findByName(name) {
    const pocket = await db.savingsPocket.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, include: pocketInclude });
    return pocket ? mapPocketRecord(pocket) : null;
  },

  async create(input) {
    return mapPocketRecord(
      await db.savingsPocket.create({
        data: { name: input.name, goalAmount: decimal(input.goalAmount), active: input.active },
        include: pocketInclude,
      }),
    );
  },

  async update(id, input) {
    return mapPocketRecord(
      await db.savingsPocket.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.goalAmount !== undefined ? { goalAmount: decimal(input.goalAmount) } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
        include: pocketInclude,
      }),
    );
  },

  async deactivate(id) {
    return mapPocketRecord(await db.savingsPocket.update({ where: { id }, data: { active: false }, include: pocketInclude }));
  },
});
