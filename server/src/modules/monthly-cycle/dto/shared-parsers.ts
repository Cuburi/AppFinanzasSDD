export const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  throw new Error("Expected a valid number.");
};

export const readNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
};

export const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
};

export const readPositiveAmount = (value: unknown, label: string): number => {
  const amount = toNumber(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return amount;
};

export const readIsoDateString = (value: unknown, label: string): string => {
  const date = readNonEmptyString(value, label);
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(date) ?? [];
  if (Number.isNaN(Date.parse(date)) || (year && (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()))) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
};
