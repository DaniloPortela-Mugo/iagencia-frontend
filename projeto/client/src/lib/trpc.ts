import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getMyWorkspaceId } from "@/lib/workspace";

type AnyObj = Record<string, any>;
type UUID = string;

function qk(key: string, input?: unknown) {
  return input ? [key, input] : [key];
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn("[trpc] safe fallback:", e);
    return fallback;
  }
}

/**
 * ✅ useUtils PADRÃO (pra telas não quebrarem)
 * utils.invalidate("clients.list")
 * utils.invalidate("productionEvents.listByClientId", { clientId })
 */
function useUtils() {
  const qc = useQueryClient();
  return {
    invalidate: (key: string, input?: any) =>
      qc.invalidateQueries({ queryKey: qk(key, input) }),
    invalidateAll: () => qc.invalidateQueries(),
  };
}

/**
 * ✅ evita TS enlouquecer com tipos do Supabase
 */
const sb: any = supabase;

async function listAll(table: string, orderCol?: string) {
  let q = sb.from(table).select("*");
  if (orderCol) q = q.order(orderCol, { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function listBy(table: string, col: string, value: any, orderCol?: string) {
  let q = sb.from(table).select("*").eq(col, value);
  if (orderCol) q = q.order(orderCol, { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export type Client = {
  id: UUID;
  workspace_id: UUID;
  name: string | null;
  description?: string | null;
  status?: string | null;
  created_by?: UUID | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const trpc = {
  useUtils,

  /**
   * CLIENTS (fonte real: client_profile)
   * ✅ filtra por workspace do user logado
   * ✅ inclui status NULL e status != inactive
   */
  clients: {
    list: {
      useQuery: (opts?: { enabled?: boolean }) =>
        useQuery({
          queryKey: qk("clients.list"),
          enabled: opts?.enabled ?? true,
          queryFn: async (): Promise<Client[]> =>
            safe(async () => {
              const workspaceId = await getMyWorkspaceId();
              if (!workspaceId) return [];

              const { data, error } = await sb
                .from("client_profile")
                .select(
                  "id,workspace_id,name,description,status,created_by,created_at,updated_at"
                )
                .eq("workspace_id", workspaceId)
                .or("status.is.null,status.neq.inactive")
                .order("created_at", { ascending: false });

              if (error) throw error;
              return (data ?? []) as Client[];
            }, []),
        }),
    },

    get: {
      useQuery: (input: { clientId: UUID }, opts?: { enabled?: boolean }) =>
        useQuery({
          queryKey: qk("clients.get", input),
          enabled: (opts?.enabled ?? true) && !!input?.clientId,
          queryFn: async (): Promise<Client | null> =>
            safe(async () => {
              const workspaceId = await getMyWorkspaceId();
              if (!workspaceId) return null;

              const { data, error } = await sb
                .from("client_profile")
                .select(
                  "id,workspace_id,name,description,status,created_by,created_at,updated_at"
                )
                .eq("workspace_id", workspaceId)
                .eq("id", input.clientId)
                .maybeSingle();

              if (error) throw error;
              return (data ?? null) as Client | null;
            }, null),
        }),
    },
  },

  /**
   * ✅ CLIENT PROFILE (só pra tela CampaignConfig não quebrar)
   */
  clientProfile: {
    get: {
      useQuery: (input: { clientId: UUID }, opts?: { enabled?: boolean }) =>
        useQuery({
          queryKey: qk("clientProfile.get", input),
          enabled: (opts?.enabled ?? true) && !!input?.clientId,
          queryFn: async () =>
            safe(async () => {
              const workspaceId = await getMyWorkspaceId();
              if (!workspaceId) return null;

              const { data, error } = await sb
                .from("client_profile")
                .select("*")
                .eq("workspace_id", workspaceId)
                .eq("id", input.clientId)
                .maybeSingle();

              if (error) throw error;
              return data ?? null;
            }, null),
        }),
    },
  },

  /**
   * CONTENTS
   */
  contents: {
    listByClientId: {
      useQuery: (input: { clientId: UUID }, options?: { enabled?: boolean }) =>
        useQuery({
          queryKey: qk("contents.listByClientId", input),
          enabled: (options?.enabled ?? true) && !!input?.clientId,
          queryFn: async () =>
            safe(async () => {
              if (!input?.clientId) return [];
              return await listBy("contents", "client_id", input.clientId, "created_at");
            }, []),
        }),
    },
  },

  /**
   * APPROVALS (via content_ids)
   */
  approvals: {
    listByClientId: {
      useQuery: (input: { clientId: UUID }, options?: { enabled?: boolean }) =>
        useQuery({
          queryKey: qk("approvals.listByClientId", input),
          enabled: (options?.enabled ?? true) && !!input?.clientId,
          queryFn: async () =>
            safe(async () => {
              if (!input?.clientId) return [];

              const contents = await listBy("contents", "client_id", input.clientId, "created_at");
              const ids = (contents ?? []).map((c: any) => c.id);
              if (!ids.length) return [];

              const { data, error } = await sb
                .from("approvals")
                .select("*")
                .in("content_id", ids)
                .order("created_at", { ascending: false });

              if (error) throw error;
              return data ?? [];
            }, []),
        }),
    },

    update: {
      useMutation: (opts?: { onSuccess?: () => void; onError?: (e: any) => void }) => {
        const qc = useQueryClient();
        return useMutation({
          mutationFn: async (input: { id: UUID; status?: string; feedback?: string; priority?: string }) => {
            const { id, ...patch } = input;
            const { data, error } = await sb
              .from("approvals")
              .update(patch)
              .eq("id", id)
              .select("*")
              .single();
            if (error) throw error;
            return data;
          },
          onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["approvals.listByClientId"] as any });
            opts?.onSuccess?.();
          },
          onError: (e) => opts?.onError?.(e),
        });
      },
    },

    delete: {
      useMutation: (opts?: { onSuccess?: () => void; onError?: (e: any) => void }) => {
        const qc = useQueryClient();
        return useMutation({
          mutationFn: async (input: { id: UUID }) => {
            const { error } = await sb.from("approvals").delete().eq("id", input.id);
            if (error) throw error;
            return true;
          },
          onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["approvals.listByClientId"] as any });
            opts?.onSuccess?.();
          },
          onError: (e) => opts?.onError?.(e),
        });
      },
    },
  },

  /**
   * PRODUCTION EVENTS
   */
  productionEvents: {
    list: {
      useQuery: () =>
        useQuery({
          queryKey: qk("productionEvents.list"),
          queryFn: async () => safe(async () => await listAll("production_events", "created_at"), []),
        }),
    },
    listByClientId: {
      useQuery: (input: { clientId: UUID }, options?: { enabled?: boolean }) =>
        useQuery({
          queryKey: qk("productionEvents.listByClientId", input),
          enabled: (options?.enabled ?? true) && !!input?.clientId,
          queryFn: async () =>
            safe(async () => {
              if (!input?.clientId) return [];
              return await listBy("production_events", "client_id", input.clientId, "created_at");
            }, []),
        }),
    },
    create: {
      useMutation: (opts?: { onSuccess?: () => void; onError?: (e: any) => void }) => {
        const qc = useQueryClient();
        return useMutation({
          mutationFn: async (input: AnyObj) => {
            const { data, error } = await sb.from("production_events").insert([input]).select("*").single();
            if (error) throw error;
            return data;
          },
          onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["productionEvents.list"] as any });
            await qc.invalidateQueries({ queryKey: ["productionEvents.listByClientId"] as any });
            opts?.onSuccess?.();
          },
          onError: (e) => opts?.onError?.(e),
        });
      },
    },
    update: {
      useMutation: (opts?: { onSuccess?: () => void; onError?: (e: any) => void }) => {
        const qc = useQueryClient();
        return useMutation({
          mutationFn: async (input: AnyObj & { id: UUID }) => {
            const { id, ...patch } = input;
            const { data, error } = await sb
              .from("production_events")
              .update(patch)
              .eq("id", id)
              .select("*")
              .single();
            if (error) throw error;
            return data;
          },
          onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["productionEvents.list"] as any });
            await qc.invalidateQueries({ queryKey: ["productionEvents.listByClientId"] as any });
            opts?.onSuccess?.();
          },
          onError: (e) => opts?.onError?.(e),
        });
      },
    },
    delete: {
      useMutation: (opts?: { onSuccess?: () => void; onError?: (e: any) => void }) => {
        const qc = useQueryClient();
        return useMutation({
          mutationFn: async (input: { id: UUID }) => {
            const { error } = await sb.from("production_events").delete().eq("id", input.id);
            if (error) throw error;
            return true;
          },
          onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["productionEvents.list"] as any });
            await qc.invalidateQueries({ queryKey: ["productionEvents.listByClientId"] as any });
            opts?.onSuccess?.();
          },
          onError: (e) => opts?.onError?.(e),
        });
      },
    },
  },
};
