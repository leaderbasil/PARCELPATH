import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref
) {
  const inputId = id ?? rest.name;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft",
          error && "border-danger",
          className
        )}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-5 text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs leading-5 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
