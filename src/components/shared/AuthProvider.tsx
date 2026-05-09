"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getInsforge } from "@/lib/insforge-client";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const insforge = getInsforge();
      const { data } = await insforge.auth.getCurrentUser();
      const next = data?.user;
      if (next) {
        setUser({
          id: next.id,
          email: next.email,
          name: typeof next.profile?.name === "string" ? next.profile.name : null,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInWithPassword = useCallback<AuthContextValue["signInWithPassword"]>(
    async (email, password) => {
      const insforge = getInsforge();
      const { data, error } = await insforge.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, error: error.message };
      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: typeof data.user.profile?.name === "string" ? data.user.profile.name : null,
        });
      } else {
        await refresh();
      }
      return { ok: true };
    },
    [refresh],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (email, password, name) => {
      const insforge = getInsforge();
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
      });
      if (error) return { ok: false, error: error.message };
      if (data?.requireEmailVerification) {
        return { ok: true, needsVerification: true };
      }
      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: typeof data.user.profile?.name === "string" ? data.user.profile.name : null,
        });
      } else {
        await refresh();
      }
      return { ok: true };
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    const insforge = getInsforge();
    await insforge.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signInWithPassword, signUp, signOut, refresh }),
    [user, loading, signInWithPassword, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
