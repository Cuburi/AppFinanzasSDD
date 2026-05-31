import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export type Tone = "neutral" | "success" | "warning" | "danger";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: Tone;
};

export function Card({ children, className, role = "region", tone = "neutral", ...props }: CardProps) {
  return (
    <div className={cx("card", `card-${tone}`, className)} role={role} {...props}>
      {children}
    </div>
  );
}
