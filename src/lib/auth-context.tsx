import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";
export type PlanType = "free" | "premium";

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  plan: PlanType;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function loadRoleAndPlan(userId: string): Promise<{ role: AppRole | null; plan: PlanType }> {
  const [{ data: roleRow }, { data: subRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).order("role", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("subscriptions").select("plan,status,current_period_end").eq("user_id", userId).maybeSingle(),
  ]);
  const role = (roleRow?.role as AppRole | undefined) ?? "user";
  let plan: PlanType = "free";
  if (subRow?.plan === "premium" && subRow?.status === "active") {
    const notExpired = !subRow.current_period_end || new Date(subRow.current_period_end) > new Date();
    if (notExpired) plan = "premium";
  }
  return { role, plan };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [plan, setPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const applyUser = async (nextUser: User | null) => {
    setUser(nextUser);
    if (!nextUser) {
      setRole(null);
      setPlan("free");
      return;
    }
    try {
      const { role: r, plan: p } = await loadRoleAndPlan(nextUser.id);
      setRole(r);
      setPlan(p);
    } catch {
      setRole("user");
      setPlan("free");
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await applyUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "TOKEN_REFRESHED") return;
      setSession(nextSession);
      // Defer async work to avoid deadlocks in the callback
      (async () => {
        await applyUser(nextSession?.user ?? null);

        router.invalidate();

        if (event !== "SIGNED_OUT") {
          queryClient.invalidateQueries();
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const refresh = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setSession(session);

    await applyUser(session?.user ?? null);
  };
  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user,
      role,
      plan,
      isAuthenticated: !!user,
      isAdmin: role === "admin",
      isPremium: plan === "premium" || role === "admin",
      signOut,
      refresh,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, session, user, role, plan],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
