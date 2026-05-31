import { Children, isValidElement } from "react";
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

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join(" ").replace(/\s+/g, " ").trim();
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);

  return "";
}

export function StatusPill({ children, className, tone = "neutral", ...props }: StatusPillProps) {
  const { "aria-label": ariaLabel, ...restProps } = props;
  const text = textFromNode(Children.toArray(children)) || "Status";

  return (
    <span
      aria-label={ariaLabel ?? `${toneLabels[tone]}: ${text}`}
      className={cx("pill", tone, className)}
      role="status"
      {...restProps}
    >
      {children}
    </span>
  );
}
