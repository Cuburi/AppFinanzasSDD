import { createDebt, toDebtView } from "../../domain/debt.js";
import type { DebtRepository } from "../ports/debt-repository.port.js";
import type { CreateDebtInput } from "../../shared/types.js";

export const createCreateDebtUseCase = ({ debts }: { debts: DebtRepository }) => async (input: CreateDebtInput) => {
  const createdDebt = await debts.create(createDebt(input));
  return toDebtView(createdDebt);
};
