import { supabase } from "@/lib/supabase";
import { assertUuid } from "@/lib/ids";

export async function listCalendarEvents(clientIdRaw: unknown) {
  const client_id = assertUuid(clientIdRaw, "clientId");

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("client_id", client_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listProductionEvents(clientIdRaw: unknown) {
  const client_id = assertUuid(clientIdRaw, "clientId");

  const { data, error } = await supabase
    .from("production_events")
    .select("*")
    .eq("client_id", client_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function upsertClientProfile(input: {
  workspaceId: unknown;
  name: string;
  description?: string | null;
  status?: string | null;
}) {
  const workspace_id = assertUuid(input.workspaceId, "workspaceId");

  const { data, error } = await supabase
    .from("client_profile")
    .upsert(
      {
        workspace_id,
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? null,
      },
      { onConflict: "workspace_id,name" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
