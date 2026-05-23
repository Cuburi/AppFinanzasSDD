import { Prisma } from "../../../lib/prisma-client.js";
import { DomainError } from "../shared/domain-error.js";
import { decimalToNumber, roundMoney, toDecimal } from "../shared/money.js";
import type { CreateDebtInput, DebtRecord, DebtsDb, DebtView, RegisterDebtPaymentInput } from "../shared/types.js";

const DEBT_INCLUDE = { payments: true } as const;
const SERIALIZABLE_TRANSACTION_OPTIONS = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;
const MAX_TRANSACTION_ATTEMPTS = 3;

const assertPositiveAmount = (amount: number, message: string) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError(400, message);
  }
};

const sortPayments = (debt: DebtRecord) =>
  [...debt.payments].sort((left, right) => left.paidAt.getTime() - right.paidAt.getTime());

const calculatePaidAmount = (debt: DebtRecord) =>
  roundMoney(sortPayments(debt).reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0));

const calculateRemainingBalance = (debt: DebtRecord, { clampOverpayment = false }: { clampOverpayment?: boolean } = {}) => {
  const remainingBalance = roundMoney(decimalToNumber(debt.totalAmount) - calculatePaidAmount(debt));
  if (remainingBalance < 0) {
    if (clampOverpayment) {
      return 0;
    }

    throw new DomainError(409, "Debt payments exceed total debt amount.");
  }

  return remainingBalance;
};

const toDebtView = (debt: DebtRecord, options?: { clampOverpayment?: boolean }): DebtView => {
  const remainingBalance = calculateRemainingBalance(debt, options);

  return {
    id: debt.id,
    direction: debt.direction,
    counterpartyName: debt.counterpartyName,
    description: debt.description,
    totalAmount: decimalToNumber(debt.totalAmount),
    currency: debt.currency,
    originDate: debt.originDate.toISOString(),
    remainingBalance,
    status: remainingBalance === 0 ? "PAID" : "OPEN",
    payments: sortPayments(debt).map((payment) => ({
      id: payment.id,
      amount: decimalToNumber(payment.amount),
      paidAt: payment.paidAt.toISOString(),
      notes: payment.notes,
    })),
  };
};

const sortDebtsForList = (debts: DebtRecord[]) =>
  [...debts].sort((left, right) => {
    const originDateDiff = right.originDate.getTime() - left.originDate.getTime();
    if (originDateDiff !== 0) {
      return originDateDiff;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });

const isPrismaWriteConflict = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2034";

const runSerializableTransaction = async <T>(db: DebtsDb, callback: (tx: DebtsDb) => Promise<T>) => {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(callback, SERIALIZABLE_TRANSACTION_OPTIONS);
    } catch (error) {
      if (!isPrismaWriteConflict(error) || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new DomainError(409, "Could not register payment due to concurrent updates.");
};

export const createDebtWorkflowService = (db: DebtsDb) => ({
  async listDebts() {
    const debts = await db.debt.findMany({ include: DEBT_INCLUDE, orderBy: [{ originDate: "desc" }, { createdAt: "desc" }] });
    return sortDebtsForList(debts).map((debt) => toDebtView(debt, { clampOverpayment: true }));
  },

  async createDebt(input: CreateDebtInput) {
    assertPositiveAmount(input.totalAmount, "Debt amount must be positive.");

    const debt = await db.debt.create({
      data: {
        direction: input.direction,
        counterpartyName: input.counterpartyName,
        description: input.description ?? null,
        totalAmount: toDecimal(input.totalAmount),
        currency: input.currency ?? "COP",
        originDate: input.originDate,
      },
      include: DEBT_INCLUDE,
    });

    return toDebtView(debt);
  },

  async registerPayment(debtId: string, input: RegisterDebtPaymentInput) {
    assertPositiveAmount(input.amount, "Payment amount must be positive.");

    return runSerializableTransaction(db, async (tx) => {
      const debt = await tx.debt.findUnique({ where: { id: debtId }, include: DEBT_INCLUDE });
      if (!debt) {
        throw new DomainError(404, "Debt not found.");
      }

      const remainingBalance = calculateRemainingBalance(debt);
      if (remainingBalance === 0) {
        throw new DomainError(409, "Debt is already paid.");
      }
      if (input.amount > remainingBalance) {
        throw new DomainError(409, "Payment exceeds remaining debt balance.");
      }

      await tx.debtPayment.create({
        data: {
          debtId,
          amount: toDecimal(input.amount),
          paidAt: input.paidAt,
          notes: input.notes ?? null,
        },
      });

      const updatedDebt = await tx.debt.findUnique({ where: { id: debtId }, include: DEBT_INCLUDE });
      if (!updatedDebt) {
        throw new DomainError(404, "Debt not found.");
      }

      return toDebtView(updatedDebt);
    });
  },
});
