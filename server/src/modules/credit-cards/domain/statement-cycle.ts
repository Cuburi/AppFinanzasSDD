export type StatementCycleInput = {
  closingDay: number;
  dueDay: number;
  today: Date;
};

export type StatementCycle = {
  cycleStart: string;
  cycleEnd: string;
  cutoffDate: string;
  dueDate: string;
  from: Date;
  to: Date;
};

export type StatementPeriod = {
  periodStart: string;
  periodEnd: string;
  cutoffDate: string;
  from: Date;
  to: Date;
};

export type StatementPeriodSplit = {
  closedStatement: StatementPeriod & { dueDate: string };
  inProgressCycle: StatementPeriod;
};

const dateOnlyUtc = (year: number, monthIndex: number, day: number) => new Date(Date.UTC(year, monthIndex, day));
const daysInUtcMonth = (year: number, monthIndex: number) => dateOnlyUtc(year, monthIndex + 1, 0).getUTCDate();
const clampDay = (year: number, monthIndex: number, day: number) => Math.min(day, daysInUtcMonth(year, monthIndex));
const clampedUtcDate = (year: number, monthIndex: number, day: number) => dateOnlyUtc(year, monthIndex, clampDay(year, monthIndex, day));
const addUtcDays = (date: Date, days: number) => dateOnlyUtc(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const endOfUtcDate = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

export const calculateStatementCycle = ({ closingDay, dueDay, today }: StatementCycleInput): StatementCycle => {
  const todayDate = dateOnlyUtc(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const thisMonthCutoff = clampedUtcDate(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), closingDay);
  const cycleEnd = todayDate > thisMonthCutoff ? clampedUtcDate(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, closingDay) : thisMonthCutoff;
  const previousCutoff = clampedUtcDate(cycleEnd.getUTCFullYear(), cycleEnd.getUTCMonth() - 1, closingDay);
  const cycleStart = addUtcDays(previousCutoff, 1);
  const dueDate = clampedUtcDate(cycleEnd.getUTCFullYear(), cycleEnd.getUTCMonth() + 1, dueDay);

  return {
    cycleStart: dateKey(cycleStart),
    cycleEnd: dateKey(cycleEnd),
    cutoffDate: dateKey(cycleEnd),
    dueDate: dateKey(dueDate),
    from: cycleStart,
    to: endOfUtcDate(cycleEnd),
  };
};

const toStatementPeriod = (periodStart: Date, cutoff: Date): StatementPeriod => ({
  periodStart: dateKey(periodStart),
  periodEnd: dateKey(cutoff),
  cutoffDate: dateKey(cutoff),
  from: periodStart,
  to: endOfUtcDate(cutoff),
});

export const calculateStatementPeriodSplit = ({ closingDay, dueDay, today }: StatementCycleInput): StatementPeriodSplit => {
  const todayDate = dateOnlyUtc(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const thisMonthCutoff = clampedUtcDate(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), closingDay);
  const closedCutoff = todayDate >= thisMonthCutoff ? thisMonthCutoff : clampedUtcDate(todayDate.getUTCFullYear(), todayDate.getUTCMonth() - 1, closingDay);
  const previousCutoff = clampedUtcDate(closedCutoff.getUTCFullYear(), closedCutoff.getUTCMonth() - 1, closingDay);
  const closedStatement = toStatementPeriod(addUtcDays(previousCutoff, 1), closedCutoff);
  const openCutoff = clampedUtcDate(closedCutoff.getUTCFullYear(), closedCutoff.getUTCMonth() + 1, closingDay);

  return {
    closedStatement: {
      ...closedStatement,
      dueDate: dateKey(clampedUtcDate(closedCutoff.getUTCFullYear(), closedCutoff.getUTCMonth() + 1, dueDay)),
    },
    inProgressCycle: toStatementPeriod(addUtcDays(closedCutoff, 1), openCutoff),
  };
};
