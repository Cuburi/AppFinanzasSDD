export type QuiescenceValidation =
  | { ok: true }
  | { ok: false; message: string };

export function validateQuiescenceInput(environment: Record<string, string | undefined>): QuiescenceValidation;
export function quiesceDepositWriters(prisma: { $transaction(callback: (transaction: { $executeRawUnsafe(sql: string): Promise<unknown> }) => Promise<void>): Promise<void> }, schema?: string): Promise<void>;
export function reenableDepositWriters(prisma: { $transaction(callback: (transaction: { $executeRawUnsafe(sql: string): Promise<unknown> }) => Promise<void>): Promise<void> }, schema?: string): Promise<void>;
export function rollbackBackfill(prisma: { $transaction(callback: (transaction: { $executeRawUnsafe(sql: string): Promise<unknown> }) => Promise<void>): Promise<void> }, schema?: string): Promise<void>;
