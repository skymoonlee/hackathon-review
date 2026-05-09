"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/shared/AuthProvider";
import { getInsforge } from "@/lib/insforge-client";

const TABS = [
  { key: "signin", label: "Sign in" },
  { key: "signup", label: "Sign up" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const OTP_LENGTH = 6;

export function LoginForm() {
  const { signInWithPassword, signUp, refresh } = useAuth();
  const [tab, setTab] = useState<TabKey>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function reset(toTab?: TabKey) {
    if (toTab) setTab(toTab);
    setError(null);
    setInfo(null);
    setOtp("");
    setPendingVerification(false);
  }

  async function handleVerify() {
    setSubmitting(true);
    setError(null);
    try {
      const insforge = getInsforge();
      const { error: verr } = await insforge.auth.verifyEmail({ email, otp });
      if (verr) {
        setError(verr.message);
        return;
      }
      const signRes = await signInWithPassword(email, password);
      if (!signRes.ok) {
        setInfo("Email verified. Please sign in.");
        setPendingVerification(false);
        setTab("signin");
        await refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pendingVerification) {
      await handleVerify();
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (tab === "signin") {
        const res = await signInWithPassword(email, password);
        if (!res.ok) setError(res.error ?? "Sign in failed");
      } else {
        const res = await signUp(email, password, name);
        if (!res.ok) {
          setError(res.error ?? "Sign up failed");
        } else if (res.needsVerification) {
          setPendingVerification(true);
          setInfo(`We sent a ${OTP_LENGTH}-digit code to ${email}. Paste it below.`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {!pendingVerification ? (
        <div className="flex w-full rounded-2xl border border-[var(--color-border)] p-1 text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => reset(t.key)}
              className={
                "flex-1 rounded-xl py-2 font-medium transition-colors " +
                (tab === t.key
                  ? "bg-[var(--color-foreground)] text-white"
                  : "text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {!pendingVerification && tab === "signup" ? (
        <Input
          name="name"
          label="Name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
      ) : null}

      {!pendingVerification ? (
        <>
          <Input
            name="email"
            label="Email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            name="password"
            label="Password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
          />
        </>
      ) : (
        <Input
          name="otp"
          label={`Verification code (${OTP_LENGTH} digits)`}
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
          inputMode="numeric"
          pattern={`\\d{${OTP_LENGTH}}`}
          required
          autoFocus
        />
      )}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </p>
      ) : null}

      <Button type="submit" loading={submitting} size="lg">
        {pendingVerification
          ? "Verify & sign in"
          : tab === "signin"
            ? "Sign in"
            : "Create account"}
      </Button>

      {pendingVerification ? (
        <button
          type="button"
          onClick={() => reset("signin")}
          className="text-xs font-medium text-[var(--color-foreground-muted)] underline-offset-2 hover:underline"
        >
          ← Back to sign in
        </button>
      ) : null}
    </form>
  );
}
