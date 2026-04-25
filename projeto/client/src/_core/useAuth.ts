import { useEffect, useState } from "react";
import { authService } from "@/services/authService";

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

    async function load() {
      try {
        const currentUser = await authService.getUser?.();
        if (mounted) setUser((currentUser as AuthUser) ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
