"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pt-6">
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
      >
        ×
      </button>
    </div>
  );
}
