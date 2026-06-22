import type { DebtRepository } from "./debt-repository.port.js";

export interface TransactionRunner {
  runSerializable<T>(work: (ports: { debts: DebtRepository }) => Promise<T>): Promise<T>;
}
