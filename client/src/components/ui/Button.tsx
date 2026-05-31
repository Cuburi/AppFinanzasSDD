import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={cx("button", variant, className)} {...props}>
      {children}
    </button>
  );
}
