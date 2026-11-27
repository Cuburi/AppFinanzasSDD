import type { MonthView, OpenMonthInput } from "../../dto/index.js";
import { createMonthLifecycleService } from "../../workflows/month-lifecycle-service.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const LIFECYCLE_USE_CASE_NAMES = ["openMonth", "getActiveMonth"] as const;

export type LifecycleUseCases = {
  openMonth(input: OpenMonthInput): Promise<MonthView>;
  getActiveMonth(): Promise<MonthView | null>;
};

export const createLifecycleUseCases = (ports: MonthlyCyclePorts): LifecycleUseCases => createMonthLifecycleService(ports);
