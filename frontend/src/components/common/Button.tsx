import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
  loading?: boolean;
}

const styles = {
  primary: "bg-primary text-surface hover:bg-primary-strong",
  secondary: "bg-surface text-text border border-border hover:bg-background",
  danger: "bg-danger text-surface hover:bg-danger-strong",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
} satisfies Record<NonNullable<ButtonProps["variant"]>, string>;

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled ?? loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className
      )}
    >
      {loading ? "..." : children}
    </button>
  );
}
