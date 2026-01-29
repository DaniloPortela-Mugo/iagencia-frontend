import { useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { getMyWorkspaceId } from "@/lib/workspace";
import * as api from "@/lib/campaign-config.api";
import { asUuid } from "@/lib/id";

type ClientProfile = {
  id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  workspace_id: string | null;
  created_at: string | null;

  // extras (se existirem na sua tabela)
  bio?: string | null;
  tone_notes?: string | null;
  goals?: string | null;
  audiences?: string | null;
  restrictions?: string | null;
};

export default function CampaignConfig() {
  const [, setLocation] = useLocation();

  // rota: /clients/:id/config
  const [, params] = useRoute<{ id: string }>("/clients/:id/config");
  const clientId = useMemo(() => asUuid(params?.id), [params?.id]);
  const enabled = !!clientId;

  const workspaceQuery = useQuery({
    queryKey: ["workspaceId"],
    queryFn: async () => {
      const id = await getMyWorkspaceId();
      if (!id) throw new Error("Workspace não encontrado para este usuário.");
      return id;
    },
  });

  const clientQuery = useQuery<ClientProfile | null>({
    queryKey: ["client_profile_by_id", workspaceQuery.data, clientId],
    enabled: !!workspaceQuery.data && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_profile")
        .select(
          "id,name,description,status,workspace_id,created_at,bio,tone_notes,goals,audiences,restrictions"
        )
        .eq("workspace_id", workspaceQuery.data!)
        .eq("id", clientId!)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as ClientProfile | null;
    },
  });

  const logsQuery = useQuery({
    queryKey: ["campaignConfig.logs", clientId],
    enabled,
    queryFn: async () => {
      // se a função existir e aceitar clientId, beleza.
      // se não aceitar, retorna [] por enquanto.
      // @ts-ignore
      return (await api.listScheduledSearchLogs?.(clientId)) ?? [];
    },
  });

  if (!clientId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Configuração</h2>
        <p>ClientId inválido na URL (esperado UUID).</p>
        <button onClick={() => setLocation("/clients")}>Voltar</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Configuração de Campanha</h2>

      <pre style={{ fontSize: 12, opacity: 0.8 }}>clientId: {clientId}</pre>

      {workspaceQuery.isLoading ? (
        <p>Carregando workspace...</p>
      ) : workspaceQuery.error ? (
        <p style={{ color: "crimson" }}>Erro workspace: {(workspaceQuery.error as any)?.message}</p>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <h3>Client Profile</h3>
        {clientQuery.isLoading ? (
          <p>Carregando cliente...</p>
        ) : clientQuery.error ? (
          <p style={{ color: "crimson" }}>Erro cliente: {(clientQuery.error as any)?.message}</p>
        ) : (
          <pre style={{ fontSize: 12 }}>{JSON.stringify(clientQuery.data ?? null, null, 2)}</pre>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Logs</h3>
        {logsQuery.isLoading ? (
          <p>Carregando logs...</p>
        ) : logsQuery.error ? (
          <p style={{ color: "crimson" }}>Erro logs: {(logsQuery.error as any)?.message}</p>
        ) : (
          <pre style={{ fontSize: 12 }}>{JSON.stringify(logsQuery.data ?? [], null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
