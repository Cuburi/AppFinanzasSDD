import { Prisma } from "../../../../lib/prisma-client.js";
import type { TransactionRunner } from "../../application/ports/transaction-runner.port.js";
import { createDebtPrismaRepository } from "./debt-prisma-repository.js";

const SERIALIZABLE_TRANSACTION_OPTIONS = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;
const MAX_TRANSACTION_ATTEMPTS = 3;

type PrismaTransactionClient = Parameters<
  Parameters<{ $transaction<T>(work: (tx: unknown) => Promise<T>, options?: unknown): Promise<T> }["$transaction"]>[0]
>[0];

type PrismaClientLike = {
  $transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>;
};

const isPrismaWriteConflict = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2034";

export const createPrismaTransactionRunner = (db: PrismaClientLike): TransactionRunner => ({
  async runSerializable(work) {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await db.$transaction(
          async (tx) => work({ debts: createDebtPrismaRepository(tx as Parameters<typeof createDebtPrismaRepository>[0]) }),
          SERIALIZABLE_TRANSACTION_OPTIONS,
        );
      } catch (error) {
        if (!isPrismaWriteConflict(error) || attempt === MAX_TRANSACTION_ATTEMPTS) {
          throw error;
        }
      }
    }

    throw new Error("Unreachable transaction retry exhaustion.");
  },
});
