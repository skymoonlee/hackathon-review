import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, helpText, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      {label ? (
        <span className="text-sm font-medium text-[var(--color-foreground)]">{label}</span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] placeholder:text-zinc-400 transition-colors",
          "focus:border-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10",
          "disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)]",
          className,
        )}
        {...rest}
      />
      {helpText ? (
        <span className="text-xs text-[var(--color-foreground-muted)]">{helpText}</span>
      ) : null}
    </label>
  );
});
