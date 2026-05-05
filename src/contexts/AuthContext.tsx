import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "leader" | "supervisor" | "manager";

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  /** Effective role for routing — derived from DB user_roles. */
  effectiveRole: AppRole | null;
  /**
   * Profile record dari tabel profiles (otomatis dibuat saat signup).
   * Berisi display_name dan email untuk user yang sedang login.
   */
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [user, setUser]         = useState<User | null>(null);
  const [roles, setRoles]       = useState<AppRole[]>([]);
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [rolesReady,   setRolesReady]   = useState(false);

  const loading = !sessionReady || !rolesReady;

  // ── Auth state listener ──────────────────────────────────────────────
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setRoles([]);
        setProfile(null);
        setRolesReady(true);
      } else {
        setRolesReady(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setSessionReady(true);
      if (!s?.user) setRolesReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Load roles whenever user changes ────────────────────────────────
  useEffect(() => {
    if (!user) { setRoles([]); setRolesReady(true); return; }
    setRolesReady(false);
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_my_roles");
      if (cancelled) return;
      if (error) { setRoles([]); } else { setRoles((data as AppRole[]) ?? []); }
      setRolesReady(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── Load profile from profiles table ────────────────────────────────
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setProfile(null); return; }
      setProfile(data as UserProfile);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── Derived effective role ───────────────────────────────────────────
  const effectiveRole: AppRole | null = useMemo(() => {
    if (roles.includes("super_admin")) return "super_admin";
    if (roles.includes("leader"))      return "leader";
    if (roles.includes("supervisor"))  return "supervisor";
    if (roles.includes("manager"))     return "manager";
    return null;
  }, [roles]);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, displayName) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    return { error: error?.message };
  };

  const signOut = async () => {
    setProfile(null);
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    session, user, roles, loading, effectiveRole, profile,
    signIn, signUp, signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
