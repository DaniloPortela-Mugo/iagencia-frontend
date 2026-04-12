import { supabase } from "@/lib/supabase";
import type { Uuid } from "@/lib/id";

export async function getClientById(clientId: Uuid) {
  return supabase
    .from("client_profile")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
}

export async function getClientProfile(clientId: Uuid) {
  return supabase
    .from("client_profile")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
}

export async function upsertClientProfile(clientId: Uuid, patch: Record<string, any>) {
  return supabase
    .from("client_profile")
    .upsert({ id: clientId, ...patch }, { onConflict: "id" })
    .select("*")
    .single();
}

/** PROMPTS */
export async function listClientPrompts(clientId: Uuid) {
  return supabase
    .from("client_prompts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
}

export async function createClientPrompt(
  clientId: Uuid,
  payload: { title?: string; prompt: string; category?: string }
) {
  return supabase
    .from("client_prompts")
    .insert({
      client_id: clientId,
      title: payload.title ?? null,
      prompt: payload.prompt,
      category: payload.category ?? null,
    })
    .select("*")
    .single();
}

export async function deleteClientPrompt(id: string) {
  return supabase.from("client_prompts").delete().eq("id", id);
}

/** NEWS SOURCES */
export async function listNewsSources(clientId: Uuid) {
  return supabase
    .from("client_news_sources")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
}

export async function createNewsSource(clientId: Uuid, payload: any) {
  return supabase
    .from("client_news_sources")
    .insert({ client_id: clientId, ...payload })
    .select("*")
    .single();
}

export async function deleteNewsSource(id: string) {
  return supabase.from("client_news_sources").delete().eq("id", id);
}

/** SCHEDULED SEARCHES */
export async function getScheduledSearch(clientId: Uuid) {
  return supabase
    .from("scheduled_searches")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
}

export async function createScheduledSearch(
  clientId: Uuid,
  payload: { frequency: string; is_enabled: boolean }
) {
  return supabase
    .from("scheduled_searches")
    .insert({ client_id: clientId, ...payload })
    .select("*")
    .single();
}

export async function updateScheduledSearch(id: string, patch: Record<string, any>) {
  return supabase.from("scheduled_searches").update(patch).eq("id", id).select("*").single();
}

/** LOGS (IMPORTANTE: aqui NÃO é UUID. geralmente é BIGINT/TEXT) */
export async function listScheduledSearchLogs(scheduledSearchId: string) {
  // ajuste o nome da coluna se no seu banco for diferente:
  // "scheduled_search_id" é o mais comum
  return supabase
    .from("scheduled_search_logs")
    .select("*")
    .eq("scheduled_search_id", scheduledSearchId)
    .order("created_at", { ascending: false });
}
