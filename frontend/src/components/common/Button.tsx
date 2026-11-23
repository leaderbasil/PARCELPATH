import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
  loading?: boolean;
}

const styles = {
  primary: "bg-primary text-surface hover:bg-primary-strong",
  secondary: "bg-surface text-text border border-border hover:bg-background dark:hover:bg-background",
  danger: "bg-danger text-surface hover:bg-danger-strong",
  ghost: "bg-transparent text-primary hover:bg-primary-soft dark:hover:bg-primary/20",
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
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className
      )}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
