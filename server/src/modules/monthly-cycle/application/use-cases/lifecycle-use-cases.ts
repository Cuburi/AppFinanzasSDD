import type { ClosureReviewView, MonthView, OpenMonthInput } from "../../dto/index.js";
import type { MonthRecord } from "../../shared/service-types.js";
import { createMonthLifecycleService } from "../../workflows/month-lifecycle-service.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const LIFECYCLE_USE_CASE_NAMES = ["openMonth", "getActiveMonth", "closeMonth"] as const;

export type LifecycleUseCases = {
  openMonth(input: OpenMonthInput): Promise<MonthView>;
  getActiveMonth(): Promise<MonthView | null>;
  closeMonth(monthId: string, buildClosureReview: (month: MonthRecord) => ClosureReviewView): Promise<MonthView>;
};

export const createLifecycleUseCases = (ports: MonthlyCyclePorts): LifecycleUseCases => createMonthLifecycleService(ports);
