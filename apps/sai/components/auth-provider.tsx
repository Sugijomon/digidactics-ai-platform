"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient, hasSupabaseBrowserEnv } from "@/lib/supabase/client";
import { isAppRole, type AppRole } from "@/lib/supabase/roles";

type RoleRecord = {
  role: string | null;
  org_id: string | null;
};

export type AuthContextValue = {
  user: User | null;
  role: AppRole | null;
  orgId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isSupabaseConfigured = useMemo(() => hasSupabaseBrowserEnv(), []);
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createClient() : null),
    [isSupabaseConfigured],
  );
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(
    isSupabaseConfigured ? null : "Missing public Supabase environment variables.",
  );

  const loadAuthState = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      setRole(null);
      setOrgId(null);
      setLoading(false);
      setError("Missing public Supabase environment variables.");
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setUser(null);
      setRole(null);
      setOrgId(null);
      setError(userError.message);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    if (!currentUser) {
      setRole(null);
      setOrgId(null);
      setLoading(false);
      return;
    }

    const { data, error: roleError } = await supabase
      .from("user_roles")
      .select("role, org_id")
      .eq("user_id", currentUser.id)
      .limit(1)
      .maybeSingle<RoleRecord>();

    if (roleError) {
      setRole(null);
      setOrgId(null);
      setError(roleError.message);
      setLoading(false);
      return;
    }

    setRole(isAppRole(data?.role) ? data.role : null);
    setOrgId(data?.org_id ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    queueMicrotask(() => {
      void loadAuthState();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadAuthState();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAuthState, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      orgId,
      loading,
      error,
      refresh: loadAuthState,
    }),
    [error, loadAuthState, loading, orgId, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
