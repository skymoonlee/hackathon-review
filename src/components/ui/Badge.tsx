import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
} as const;

export type BadgeTone = keyof typeof TONES;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
