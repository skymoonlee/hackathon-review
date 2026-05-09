"use client";

import { useState } from "react";
import { BRAND } from "@/config/global";
import { useAuth } from "@/components/shared/AuthProvider";
import { Button } from "@/components/ui/Button";
import { AuthDialog } from "@/components/shared/AuthDialog";
import { Logo } from "@/components/shared/Logo";

export function Header() {
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              {BRAND.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-xs text-[var(--color-foreground-muted)] sm:inline">
                  {user.name ? `${user.name} · ` : ""}
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <span className="hidden text-xs text-[var(--color-foreground-muted)] sm:inline">
                  Guest
                </span>
                <Button variant="secondary" size="sm" onClick={() => setAuthOpen(true)}>
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
