import { sortDebtsForList, toDebtView } from "../../domain/debt.js";
import type { DebtRepository } from "../ports/debt-repository.port.js";

export const createListDebtsUseCase = ({ debts }: { debts: DebtRepository }) => async () => {
  const storedDebts = await debts.findAll();
  return sortDebtsForList(storedDebts).map((debt) => toDebtView(debt, { clampOverpayment: true }));
};
