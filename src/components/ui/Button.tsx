import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500",
  secondary:
    "bg-white text-[var(--color-foreground)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50",
  ghost:
    "bg-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-2xl",
  lg: "h-12 px-6 text-base rounded-2xl",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-foreground)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});
