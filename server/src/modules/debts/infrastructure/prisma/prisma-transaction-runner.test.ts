import test from "node:test";
import assert from "node:assert/strict";

import { Prisma } from "../../../../lib/prisma-client.js";
import { createPrismaTransactionRunner } from "./prisma-transaction-runner.js";

test("PrismaTransactionRunner uses serializable isolation and exposes a debts repository inside the transaction", async () => {
  const options: unknown[] = [];
  const transactionRunner = createPrismaTransactionRunner({
    async $transaction(work, transactionOptions) {
      options.push(transactionOptions);
      return work({
        debt: {
          async findMany() {
            return [];
          },
          async findUnique() {
            return null;
          },
          async create() {
            throw new Error("Not used.");
          },
        },
        debtPayment: {
          async create() {
            throw new Error("Not used.");
          },
        },
      });
    },
  });

  const result = await transactionRunner.runSerializable(async ({ debts }) => debts.findAll());

  assert.deepEqual(result, []);
  assert.deepEqual(options, [{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }]);
});

test("PrismaTransactionRunner retries P2034 write conflicts and then succeeds", async () => {
  let attempts = 0;
  const transactionRunner = createPrismaTransactionRunner({
    async $transaction(work) {
      attempts += 1;
      if (attempts < 3) {
        throw Object.assign(new Error("Transaction write conflict"), { code: "P2034" });
      }

      return work({
        debt: {
          async findMany() {
            return [];
          },
          async findUnique() {
            return null;
          },
          async create() {
            throw new Error("Not used.");
          },
        },
        debtPayment: {
          async create() {
            throw new Error("Not used.");
          },
        },
      });
    },
  });

  const result = await transactionRunner.runSerializable(async () => "ok");

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});
