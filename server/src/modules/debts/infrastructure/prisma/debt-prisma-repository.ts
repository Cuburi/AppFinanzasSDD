import { toDecimal } from "../../shared/money.js";
import { rehydrateDebt } from "../../domain/debt.js";
import type { DebtRepository } from "../../application/ports/debt-repository.port.js";

const DEBT_INCLUDE = { payments: true } as const;

const decimalLikeToNumber = (value: { toString(): string }) => Number(value.toString());

type PrismaDebtPaymentRecord = {
  id: string;
  debtId: string;
  amount: { toString(): string };
  paidAt: Date;
  notes: string | null;
  createdAt: Date;
};

type PrismaDebtRecord = {
  id: string;
  direction: "I_OWE" | "OWED_TO_ME";
  counterpartyName: string;
  description: string | null;
  totalAmount: { toString(): string };
  currency: string;
  originDate: Date;
  createdAt: Date;
  updatedAt: Date;
  payments: PrismaDebtPaymentRecord[];
};

type PrismaDebtClient = {
  debt: {
    findMany(args?: { include?: { payments?: true } }): Promise<PrismaDebtRecord[]>;
    findUnique(args: { where: { id: string }; include?: { payments?: true } }): Promise<PrismaDebtRecord | null>;
    create(args: {
      data: {
        direction: "I_OWE" | "OWED_TO_ME";
        counterpartyName: string;
        description: string | null;
        totalAmount: ReturnType<typeof toDecimal>;
        currency: string;
        originDate: Date;
      };
      include?: { payments?: true };
    }): Promise<PrismaDebtRecord>;
  };
  debtPayment: {
    create(args: {
      data: {
        debtId: string;
        amount: ReturnType<typeof toDecimal>;
        paidAt: Date;
        notes: string | null;
      };
    }): Promise<unknown>;
  };
};

const mapDebtRecord = (debt: PrismaDebtRecord) =>
  rehydrateDebt({
    id: debt.id,
    direction: debt.direction,
    counterpartyName: debt.counterpartyName,
    description: debt.description,
    totalAmount: decimalLikeToNumber(debt.totalAmount),
    currency: debt.currency,
    originDate: debt.originDate,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
    payments: debt.payments.map((payment) => ({
      id: payment.id,
      amount: decimalLikeToNumber(payment.amount),
      paidAt: payment.paidAt,
      notes: payment.notes,
      createdAt: payment.createdAt,
    })),
  });

export const createDebtPrismaRepository = (db: PrismaDebtClient): DebtRepository => ({
  async findAll() {
    return (await db.debt.findMany({ include: DEBT_INCLUDE })).map(mapDebtRecord);
  },

  async findById(id) {
    const debt = await db.debt.findUnique({ where: { id }, include: DEBT_INCLUDE });
    return debt ? mapDebtRecord(debt) : null;
  },

  async create(input) {
    const debt = await db.debt.create({
      data: {
        direction: input.direction,
        counterpartyName: input.counterpartyName,
        description: input.description,
        totalAmount: toDecimal(input.totalAmount),
        currency: input.currency,
        originDate: input.originDate,
      },
      include: DEBT_INCLUDE,
    });

    return mapDebtRecord(debt);
  },

  async addPayment(debtId, payment) {
    await db.debtPayment.create({
      data: {
        debtId,
        amount: toDecimal(payment.amount),
        paidAt: payment.paidAt,
        notes: payment.notes ?? null,
      },
    });
  },
});
