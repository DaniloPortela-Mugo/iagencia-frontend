import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

// Definição dos tipos de Usuário e Função (Role)
export type Role = "admin" | "atendimento" | "planejamento" | "redator" | "da" | "midia" | "cliente" | "social_media";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  allowedTenants: string[]; // Ex: ["mugo", "ssavon"] ou ["all"]
}

export interface TenantAccess {
  tenantSlug: string;
  role: Role;
  allowedModules: string[];
}

interface AuthContextType {
  user: User | null;
  activeTenant: string | null; // O cliente selecionado no momento
  token: string | null;
  profileLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveTenant: (tenantSlug: string) => void;
  tenantAccess: TenantAccess[];
  currentRole: Role;
  currentModules: string[];
  isAuthenticated: boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTenant, setActiveTenant] = useState<string | null>(null);
  const [tenantAccess, setTenantAccess] = useState<TenantAccess[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const usingCachedSessionRef = React.useRef(false);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timeoutId: number | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const isTimeoutError = (err: unknown) =>
    err instanceof Error && err.message.toLowerCase().includes("timeout");

  const retryAsync = async <T,>(
    fn: () => Promise<T>,
    retries: number,
    delayMs: number
  ): Promise<T> => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (!isTimeoutError(err) || i === retries) throw err;
        await sleep(delayMs * (i + 1));
      }
    }
    throw lastErr;
  };

  const getCachedSession = () => {
    try {
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (!keys.length) return null;
      const raw = localStorage.getItem(keys[0] || "");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const accessToken = parsed?.access_token || parsed?.currentSession?.access_token;
      const user = parsed?.user || parsed?.currentSession?.user;
      if (!accessToken || !user?.id) return null;
      return { accessToken, user };
    } catch {
      return null;
    }
  };

  const normalizeModules = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((v) => typeof v === "string") as string[];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
        } catch {
          return [];
        }
      }
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return trimmed
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  const resolveActiveTenant = (allowedTenants: string[]) => {
    const storedTenant = localStorage.getItem("iagencia_tenant");
    if (storedTenant && (allowedTenants.includes("all") || allowedTenants.includes(storedTenant))) {
      setActiveTenant(storedTenant);
      return;
    }
    if (allowedTenants.length > 0 && allowedTenants[0] !== "all") {
      setActiveTenant(allowedTenants[0]);
      localStorage.setItem("iagencia_tenant", allowedTenants[0]);
      return;
    }
    setActiveTenant(null);
  };

  const loadProfile = async (userId: string, email: string | null) => {
    setProfileLoading(true);
    try {
      const { data, error } = await retryAsync(
        () =>
          withTimeout(
            supabase.from("profiles").select("id,name,email").eq("id", userId).single().then((r) => r),
            8000,
            "profiles"
          ),
        2,
        500
      );

      const { data: accessRows, error: accessError } = await retryAsync(
        () =>
          withTimeout(
            supabase.from("user_tenants").select("tenant_slug, role, allowed_modules").eq("user_id", userId).then((r) => r),
            8000,
            "user_tenants"
          ),
        2,
        500
      );

      if (error || !data) {
        const fallbackUser: User = {
          id: userId,
          name: email || "Usuário",
          email: email || "",
          role: "admin",
          allowedTenants: ["all"],
        };
        setUser(fallbackUser);
        setTenantAccess([]);
        resolveActiveTenant(fallbackUser.allowedTenants);
        return;
      }

      if (accessError) {
        console.error("user_tenants select error:", accessError.message);
        const restrictedUser: User = {
          id: data.id,
          name: data.name || data.email || email || "Usuário",
          email: email || "",
          role: "cliente",
          allowedTenants: [],
        };
        setUser(restrictedUser);
        setTenantAccess([]);
        resolveActiveTenant([]);
        return;
      }

      let allowedTenants: string[] = [];
      let access: TenantAccess[] = [];
      if (Array.isArray(accessRows) && accessRows.length > 0) {
        access = accessRows.map((row: any) => ({
          tenantSlug: row.tenant_slug,
          role: (row.role as Role) || "admin",
          allowedModules: normalizeModules(row.allowed_modules),
        }));
        allowedTenants = access.map((a) => a.tenantSlug);
      } else {
        allowedTenants = [];
      }

      const newUser: User = {
        id: data.id,
        name: data.name || data.email || email || "Usuário",
        email: data.email || email || "",
        role: "cliente",
        allowedTenants,
      };

      setUser(newUser);
      setTenantAccess(access);
      resolveActiveTenant(allowedTenants);
    } catch (err) {
      if (!isTimeoutError(err)) {
        console.error("loadProfile failed:", err);
      }
      const fallbackUser: User = {
        id: userId,
        name: email || "Usuário",
        email: email || "",
        role: "admin",
        allowedTenants: ["all"],
      };
      setUser(fallbackUser);
      setTenantAccess([]);
      resolveActiveTenant(fallbackUser.allowedTenants);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authInitialized = false;
    let profileLoadInProgress = false;
    let userProfileLoaded = false;

    // Helper: carrega perfil uma única vez; seguro para chamar de múltiplos listeners
    const loadOnce = async (userId: string, email: string | null) => {
      if (userProfileLoaded || profileLoadInProgress) return;
      profileLoadInProgress = true;
      try { await loadProfile(userId, email); }
      finally { profileLoadInProgress = false; userProfileLoaded = true; }
    };

    const finishInit = () => {
      if (!authInitialized) {
        authInitialized = true;
        clearTimeout(fallback);
        if (mounted) setAuthLoading(false);
      }
    };

    // Fallback: libera authLoading se nenhum evento disparar (ex: Supabase offline)
    const fallback = setTimeout(() => {
      if (mounted) { authInitialized = true; setAuthLoading(false); }
    }, 6000);

    const init = async () => {
      try {
        const { data } = await retryAsync(
          () => withTimeout(supabase.auth.getSession(), 8000, "getSession"),
          2,
          500
        );
        if (!mounted) return;
        if (data?.session?.user) {
          setToken(data.session.access_token || null);
          await loadOnce(data.session.user.id, data.session.user.email ?? null);
        }
      } catch (err) {
        if (!isTimeoutError(err)) {
          console.error("getSession failed:", err);
        }
        const cached = getCachedSession();
        if (cached?.user?.id) {
          usingCachedSessionRef.current = true;
          setToken(cached.accessToken || null);
          await loadOnce(cached.user.id, cached.user.email ?? null);
          // tenta revalidar em background quando o Supabase voltar
          setTimeout(async () => {
            try {
              const { data } = await withTimeout(supabase.auth.getSession(), 8000, "getSession");
              if (data?.session?.user) {
                usingCachedSessionRef.current = false;
                setToken(data.session.access_token || null);
                await loadOnce(data.session.user.id, data.session.user.email ?? null);
              }
            } catch {
              // mantém cache silenciosamente
            }
          }, 3000);
        }
      } finally {
        finishInit();
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "TOKEN_REFRESHED") {
        if (session?.user) {
          setToken(session.access_token || null);
          // Carrega perfil se ainda não foi carregado — acontece quando
          // INITIAL_SESSION disparou null (token expirado) e o refresh trouxe sessão válida
          await loadOnce(session.user.id, session.user.email ?? null);
          if (userProfileLoaded) finishInit();
        }
        return;
      }

      if (session?.user) {
        setToken(session.access_token || null);
        await loadOnce(session.user.id, session.user.email ?? null);
      } else {
        // Sign-out ou sessão vazia — reseta tudo
        profileLoadInProgress = false;
        userProfileLoaded = false;
        setToken(null);
        setUser(null);
        setActiveTenant(null);
        setTenantAccess([]);
        setProfileLoading(false);
      }

      finishInit();
    });

    return () => {
      mounted = false;
      clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.session?.user) {
      // Apenas seta o token; o perfil será carregado pelo onAuthStateChange(SIGNED_IN)
      // Evita duplo loadProfile (uma vez aqui e outra no listener)
      setToken(data.session.access_token || null);
      toast.success("Bem-vindo(a)!");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
    setActiveTenant(null);
    setTenantAccess([]);
    localStorage.removeItem("iagencia_tenant");
    toast.info("Você saiu do sistema.");
  };

  const handleSetActiveTenant = (slug: string) => {
      setActiveTenant(slug);
      localStorage.setItem("iagencia_tenant", slug);
      toast.success(`Contexto alterado para cliente: ${slug.toUpperCase()}`);
  };

  const currentRole = (() => {
    if (tenantAccess.length === 0) return user?.role || "admin";
    const hit = tenantAccess.find((t) => t.tenantSlug === activeTenant);
    return (hit?.role as Role) || user?.role || "admin";
  })();

  const currentModules = (() => {
    if (tenantAccess.length === 0) return [];
    const hit = tenantAccess.find((t) => t.tenantSlug === activeTenant) ?? tenantAccess[0];
    return Array.isArray(hit?.allowedModules) ? hit!.allowedModules : [];
  })();

  return (
    <AuthContext.Provider value={{
        user,
        token,
        activeTenant,
        login,
        logout,
        setActiveTenant: handleSetActiveTenant,
        tenantAccess,
        currentRole,
        currentModules,
        isAuthenticated: !!token,
        authLoading,
        profileLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
