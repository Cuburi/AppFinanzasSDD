import type { Prisma } from "../../../lib/prisma-client.js";

export type DebtDirection = "I_OWE" | "OWED_TO_ME";
export type DebtStatus = "OPEN" | "PAID";

export type DebtPaymentRecord = {
  id: string;
  debtId: string;
  amount: Prisma.Decimal;
  paidAt: Date;
  notes: string | null;
  createdAt: Date;
};

export type DebtRecord = {
  id: string;
  direction: DebtDirection;
  counterpartyName: string;
  description: string | null;
  totalAmount: Prisma.Decimal;
  currency: string;
  originDate: Date;
  createdAt: Date;
  updatedAt: Date;
  payments: DebtPaymentRecord[];
};

export type DebtView = {
  id: string;
  direction: DebtDirection;
  counterpartyName: string;
  description: string | null;
  totalAmount: number;
  currency: string;
  originDate: string;
  remainingBalance: number;
  status: DebtStatus;
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    notes: string | null;
  }>;
};

export type CreateDebtInput = {
  direction: DebtDirection;
  counterpartyName: string;
  description?: string | null;
  totalAmount: number;
  currency?: string;
  originDate: Date;
};

export type RegisterDebtPaymentInput = {
  amount: number;
  paidAt: Date;
  notes?: string | null;
};

export type DebtsDb = {
  $transaction<T>(callback: (tx: DebtsDb) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>;
  debt: {
    findMany(args?: unknown): Promise<DebtRecord[]>;
    findUnique(args: { where: { id: string }; include?: { payments?: true } }): Promise<DebtRecord | null>;
    create(args: {
      data: {
        direction: DebtDirection;
        counterpartyName: string;
        description: string | null;
        totalAmount: Prisma.Decimal;
        currency: string;
        originDate: Date;
      };
      include?: { payments?: true };
    }): Promise<DebtRecord>;
  };
  debtPayment: {
    create(args: {
      data: {
        debtId: string;
        amount: Prisma.Decimal;
        paidAt: Date;
        notes: string | null;
      };
    }): Promise<DebtPaymentRecord>;
  };
};
