import type { CreatePocketInput, PocketListFilter, UpdatePocketInput } from "../shared/types.js";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  throw new Error("Expected a valid number.");
};

const readName = (value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Pocket name is required.");
  }

  return value.trim();
};

const readOptionalGoalAmount = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;

  const amount = toNumber(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Pocket goal amount must be zero or greater.");
  }

  return amount;
};

const readOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error("Pocket active flag must be a boolean.");
};

export const parsePocketListFilter = (value: unknown): PocketListFilter => {
  if (value === "all") return { active: "all" };
  if (value === "false" || value === false) return { active: false };

  return { active: true };
};

export const parseCreatePocketInput = (payload: unknown): CreatePocketInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Pocket payload is required.");
  }

  const rawPayload = payload as { name?: unknown; goalAmount?: unknown };

  return {
    name: readName(rawPayload.name),
    goalAmount: readOptionalGoalAmount(rawPayload.goalAmount),
  };
};

export const parseUpdatePocketInput = (payload: unknown): UpdatePocketInput => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Pocket update payload is required.");
  }

  const rawPayload = payload as { name?: unknown; goalAmount?: unknown; active?: unknown };
  const input: UpdatePocketInput = {};

  if (rawPayload.name !== undefined) input.name = readName(rawPayload.name);
  if (rawPayload.goalAmount !== undefined) input.goalAmount = readOptionalGoalAmount(rawPayload.goalAmount);
  if (rawPayload.active !== undefined) input.active = readOptionalBoolean(rawPayload.active);

  return input;
};
