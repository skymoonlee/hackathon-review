"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/shared/AuthProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoginForm } from "@/components/shared/LoginForm";
import { BRAND } from "@/config/global";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-foreground-muted)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-foreground)]">
                {BRAND.shortName}
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold tracking-tight">
                  {BRAND.name}
                </span>
                <span className="text-xs text-[var(--color-foreground-muted)]">
                  {BRAND.tagline}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <LoginForm />
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
