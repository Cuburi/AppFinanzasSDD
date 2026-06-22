import type { RegisterDebtPaymentInput } from "../../shared/types.js";
import { assertPaymentCanBeRegistered, toDebtView } from "../../domain/debt.js";
import { DebtNotFoundError } from "../errors/debt-application-errors.js";
import type { TransactionRunner } from "../ports/transaction-runner.port.js";

export const createRegisterDebtPaymentUseCase = ({ transactionRunner }: { transactionRunner: TransactionRunner }) =>
  async (debtId: string, input: RegisterDebtPaymentInput) =>
    transactionRunner.runSerializable(async ({ debts }) => {
      const debt = await debts.findById(debtId);
      if (!debt) {
        throw new DebtNotFoundError();
      }

      assertPaymentCanBeRegistered(debt, input.amount);
      await debts.addPayment(debtId, {
        amount: input.amount,
        paidAt: input.paidAt,
        notes: input.notes ?? null,
      });

      const updatedDebt = await debts.findById(debtId);
      if (!updatedDebt) {
        throw new DebtNotFoundError();
      }

      return toDebtView(updatedDebt);
    });
