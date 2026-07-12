import { Prisma } from "../../../../lib/prisma-client.js";
import type { CreditCardRepository } from "../../application/ports/credit-card-repository.port.js";
import { rehydrateCreditCard } from "../../domain/credit-card.js";
import type { CreditCardListFilter } from "../../shared/types.js";

type CreditCardRecord = {
  id: string;
  ownerId: string;
  issuer: string;
  name: string;
  limit: { toString(): string } | null;
  closingDay: number;
  dueDay: number;
  active: boolean;
};

type PrismaCreditCardClient = {
  creditCard: {
    findMany(args: { where: { ownerId: string; active?: boolean }; orderBy: { name: "asc" } }): Promise<CreditCardRecord[]>;
    findFirst(args: { where: { ownerId: string; id?: string; name?: { equals: string; mode: "insensitive" } } }): Promise<CreditCardRecord | null>;
    create(args: { data: { ownerId: string; issuer: string; name: string; limit: Prisma.Decimal | null; closingDay: number; dueDay: number; active: true } }): Promise<CreditCardRecord>;
    update(args: { where: { id: string }; data: Partial<{ issuer: string; name: string; limit: Prisma.Decimal | null; closingDay: number; dueDay: number; active: boolean }> }): Promise<CreditCardRecord>;
  };
};

const decimal = (value: number | null | undefined) => (value === null || value === undefined ? null : new Prisma.Decimal(value.toFixed(2)));
const decimalLikeToNumber = (value: { toString(): string }) => Number(value.toString());

const mapRecord = (card: CreditCardRecord) =>
  rehydrateCreditCard({ ...card, limit: card.limit ? decimalLikeToNumber(card.limit) : null });

const whereFromFilter = (ownerId: string, filter: CreditCardListFilter) => ({ ownerId, ...(filter.active === "all" ? {} : { active: filter.active }) });

export const createCreditCardPrismaRepository = (db: PrismaCreditCardClient): CreditCardRepository => ({
  async findAllByOwner(ownerId, filter) {
    return (await db.creditCard.findMany({ where: whereFromFilter(ownerId, filter), orderBy: { name: "asc" } })).map(mapRecord);
  },
  async findByIdForOwner(ownerId, id) {
    const card = await db.creditCard.findFirst({ where: { ownerId, id } });
    return card ? mapRecord(card) : null;
  },
  async findByNameForOwner(ownerId, name) {
    const card = await db.creditCard.findFirst({ where: { ownerId, name: { equals: name, mode: "insensitive" } } });
    return card ? mapRecord(card) : null;
  },
  async create(input) {
    return mapRecord(await db.creditCard.create({ data: { ...input, limit: decimal(input.limit) } }));
  },
  async update(ownerId, id, input) {
    const existing = await db.creditCard.findFirst({ where: { ownerId, id } });
    if (!existing) throw new Error("Credit card was not found.");
    const { limit, ...rest } = input;
    return mapRecord(
      await db.creditCard.update({
        where: { id: existing.id },
        data: { ...rest, ...(limit !== undefined ? { limit: decimal(limit) } : {}) },
      }),
    );
  },
});
