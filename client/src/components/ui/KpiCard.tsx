import type { ReactNode } from "react";

import { Card } from "./Card";
import type { Tone } from "./Card";

export type KpiTrend = "positive" | "negative" | "neutral";

const trendTone: Record<KpiTrend, Tone> = {
  positive: "success",
  negative: "danger",
  neutral: "neutral",
};

const trendLabel: Record<KpiTrend, string> = {
  positive: "Positive trend",
  negative: "Negative trend",
  neutral: "Neutral trend",
};

export type KpiCardProps = {
  detail?: ReactNode;
  label: string;
  trend?: KpiTrend;
  value: ReactNode;
};

export function KpiCard({ detail, label, trend = "neutral", value }: KpiCardProps) {
  return (
    <Card aria-label={label} className="kpi-card" tone={trendTone[trend]}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      {detail ? <p className="kpi-detail">{detail}</p> : null}
      <p className="sr-only">{trendLabel[trend]}</p>
    </Card>
  );
}
