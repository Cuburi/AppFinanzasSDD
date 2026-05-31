import type { HTMLAttributes, ReactNode } from "react";

import type { Tone } from "./Card";
import { cx } from "./utils";

const toneLabels: Record<Tone, string> = {
  neutral: "Neutral",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
};

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: Tone;
};

export function StatusPill({ children, className, tone = "neutral", ...props }: StatusPillProps) {
  const text = typeof children === "string" || typeof children === "number" ? String(children) : "Status";

  return (
    <span
      aria-label={`${toneLabels[tone]}: ${text}`}
      className={cx("pill", tone, className)}
      role="status"
      {...props}
    >
      {children}
    </span>
  );
}
