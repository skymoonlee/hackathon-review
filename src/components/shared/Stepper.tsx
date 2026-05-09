import { FLOW_STEPS, type FlowStepKey } from "@/config/global";
import { cn } from "@/lib/cn";

interface StepperProps {
  current: FlowStepKey;
}

export function Stepper({ current }: StepperProps) {
  const currentIndex = FLOW_STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-2 text-xs">
      {FLOW_STEPS.map((step, idx) => {
        const state =
          idx < currentIndex ? "done" : idx === currentIndex ? "active" : "pending";
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-medium",
                state === "done" && "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white",
                state === "active" && "border-[var(--color-foreground)] bg-white text-[var(--color-foreground)]",
                state === "pending" && "border-[var(--color-border-strong)] bg-white text-[var(--color-foreground-muted)]",
              )}
            >
              {idx + 1}
            </span>
            <span
              className={cn(
                "font-medium",
                state === "pending"
                  ? "text-[var(--color-foreground-muted)]"
                  : "text-[var(--color-foreground)]",
              )}
            >
              {step.label}
            </span>
            {idx < FLOW_STEPS.length - 1 ? (
              <span className="ml-1 hidden h-px w-8 bg-[var(--color-border-strong)] sm:inline-block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
