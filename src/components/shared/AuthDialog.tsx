"use client";

import { useEffect } from "react";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { LoginForm } from "@/components/shared/LoginForm";
import { useAuth } from "@/components/shared/AuthProvider";
import { BRAND } from "@/config/global";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const { user } = useAuth();

  // Auto-close once the user is signed in.
  useEffect(() => {
    if (open && user) onClose();
  }, [open, user, onClose]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-foreground)]">
            {BRAND.shortName}
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight">Sign in to save reviews</span>
            <span className="text-xs text-[var(--color-foreground-muted)]">
              Optional — you can keep using the app as a guest.
            </span>
          </div>
        </div>
      </DialogHeader>
      <div className="px-6 py-5">
        <LoginForm />
      </div>
    </Dialog>
  );
}
