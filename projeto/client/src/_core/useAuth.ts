import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthUser = {
  id?: string;
  email?: string | null;
  [key: string]: unknown;
};

type UseAuthResult = {
  user: AuthUser | null;
  loading: boolean;
};

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error || !session) {
        supabase.auth.signOut();
        setUser(null);
      } else {
        setUser(session.user as AuthUser);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user as AuthUser ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
