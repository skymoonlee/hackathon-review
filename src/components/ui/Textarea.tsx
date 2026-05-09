import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, helpText, id, rows = 4, ...rest },
  ref,
) {
  const taId = id ?? rest.name;
  return (
    <label className="flex flex-col gap-1.5" htmlFor={taId}>
      {label ? (
        <span className="text-sm font-medium text-[var(--color-foreground)]">{label}</span>
      ) : null}
      <textarea
        ref={ref}
        id={taId}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] placeholder:text-zinc-400 transition-colors",
          "focus:border-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10",
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
