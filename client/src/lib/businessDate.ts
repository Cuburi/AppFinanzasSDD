import type { BusinessDate } from "../types";

// Build a formatting-only UTC date from calendar components, never parse a day as an instant.
export function formatBusinessDate(value: BusinessDate, options: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "numeric" }, locale = "es-CO"): string {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(calendar);
}
