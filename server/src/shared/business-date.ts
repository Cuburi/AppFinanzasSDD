export const APP_TIME_ZONE = "America/Bogota";

/** A business date is a calendar day, never an instant or an offset timestamp. */
export const parseBusinessDate = (value: unknown, label = "La fecha"): string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} debe ser una fecha válida en formato YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} debe ser una fecha válida en formato YYYY-MM-DD.`);
  }
  return value;
};

export const businessDateToPrisma = (day: string): Date => new Date(`${parseBusinessDate(day)}T00:00:00.000Z`);

export const businessDateFromPrisma = (date: Date): string =>
  `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

export const isBusinessDateInMonth = (day: string, month: { year: number; month: number }): boolean => {
  const validDay = parseBusinessDate(day);
  return Number(validDay.slice(0, 4)) === month.year && Number(validDay.slice(5, 7)) === month.month;
};

const bogotaFormatter = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Pass an instant explicitly for deterministic generated dates and opening events. */
export const todayInBogota = (now: Date = new Date()): string => {
  const parts = bogotaFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)!.value;
  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
};
