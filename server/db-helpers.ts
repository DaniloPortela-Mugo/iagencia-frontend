// server/db-helpers.ts
import { supabaseAdmin } from "./supabase-admin";

/**
 * Helpers "Supabase-first" usados pelo server (routers, scheduler, trpc ctx).
 * Aqui a gente centraliza tudo que é acesso a banco.
 */

function unwrap<T>(res: { data: T | null; error: any }, label: string): T {
  if (res.error) {
    throw new Error(`${label}: ${res.error.message || String(res.error)}`);
  }
  if (res.data == null) {
    throw new Error(`${label}: no data returned`);
  }
  return res.data;
}

/** =========================
 * USERS
 * ========================= */

export async function getOrCreateUserBySupabaseId(input: {
  supabaseUserId: string;
  email?: string | null;
  name?: string | null;
}) {
  const { supabaseUserId, email, name } = input;

  // 1) tenta buscar user já existente
  const existingRes = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("supabase_user_id", supabaseUserId)
    .maybeSingle();

  if (existingRes.error) {
    throw new Error(
      `getOrCreateUserBySupabaseId.select: ${existingRes.error.message}`
    );
  }

  if (existingRes.data) return existingRes.data;

  // 2) cria se não existir
  const insertRes = await supabaseAdmin
    .from("users")
    .insert({
      supabase_user_id: supabaseUserId,
      email: email ?? null,
      name: name ?? null,
    })
    .select("*")
    .single();

  return unwrap(insertRes, "getOrCreateUserBySupabaseId.insert");
}

/** =========================
 * CLIENTS
 * ========================= */

export async function getAllClients() {
  const res = await supabaseAdmin.from("clients").select("*").order("id", {
    ascending: true,
  });
  return unwrap(res, "getAllClients");
}

export async function getClientById(id: number) {
  const res = await supabaseAdmin.from("clients").select("*").eq("id", id).single();
  return unwrap(res, "getClientById");
}

export async function createClient(data: any) {
  const res = await supabaseAdmin.from("clients").insert(data).select("id").single();
  const row = unwrap(res, "createClient");
  return row.id;
}

export async function updateClient(id: number, data: any) {
  const res = await supabaseAdmin.from("clients").update(data).eq("id", id).select("id").single();
  unwrap(res, "updateClient");
  return true;
}

export async function deleteClient(id: number) {
  const res = await supabaseAdmin.from("clients").delete().eq("id", id).select("id").single();
  unwrap(res, "deleteClient");
  return true;
}

/** =========================
 * SCHEDULED SEARCHES
 * (tabela sugerida: scheduled_searches)
 * ========================= */

export async function getAllScheduledSearches() {
  const res = await supabaseAdmin
    .from("scheduled_searches")
    .select("*")
    .order("id", { ascending: true });

  return unwrap(res, "getAllScheduledSearches");
}

export async function getEnabledScheduledSearches() {
  const res = await supabaseAdmin
    .from("scheduled_searches")
    .select("*")
    .eq("enabled", true)
    .order("id", { ascending: true });

  return unwrap(res, "getEnabledScheduledSearches");
}

export async function getScheduledSearchByClientId(clientId: number) {
  const res = await supabaseAdmin
    .from("scheduled_searches")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (res.error) {
    throw new Error(
      `getScheduledSearchByClientId: ${res.error.message || String(res.error)}`
    );
  }

  return res.data; // pode ser null
}

export async function createScheduledSearch(data: any) {
  const res = await supabaseAdmin
    .from("scheduled_searches")
    .insert(data)
    .select("id")
    .single();

  const row = unwrap(res, "createScheduledSearch");
  return row.id;
}

export async function updateScheduledSearch(id: number, data: any) {
  const res = await supabaseAdmin
    .from("scheduled_searches")
    .update(data)
    .eq("id", id)
    .select("id")
    .single();

  unwrap(res, "updateScheduledSearch");
  return true;
}

export async function updateScheduledSearchAfterRun(id: number, data: any) {
  // só um alias semântico pra quando o scheduler roda
  return updateScheduledSearch(id, data);
}

/** =========================
 * SCHEDULED SEARCH LOGS
 * (tabela sugerida: scheduled_search_logs)
 * ========================= */

export async function createScheduledSearchLog(data: any) {
  const res = await supabaseAdmin
    .from("scheduled_search_logs")
    .insert(data)
    .select("id")
    .single();

  const row = unwrap(res, "createScheduledSearchLog");
  return row.id;
}

export async function getDueScheduledSearches() {
  // regra simples: enabled=true e next_run_at <= now()
  // Se sua tabela não tiver next_run_at, a gente ajusta depois.
  const nowIso = new Date().toISOString();

  const res = await supabaseAdmin
    .from("scheduled_searches")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true });

  return unwrap(res, "getDueScheduledSearches");
}
/** =========================
 * NEWS SOURCES
 * (tabela: news_sources)
 * ========================= */

export async function getNewsSourcesByClientId(clientId: number) {
  const res = await supabaseAdmin
    .from("news_sources")
    .select("*")
    .eq("client_id", clientId)
    .order("id", { ascending: true });

  return unwrap(res, "getNewsSourcesByClientId");
}

export async function createNewsSource(data: any) {
  const res = await supabaseAdmin
    .from("news_sources")
    .insert(data)
    .select("id")
    .single();

  const row = unwrap(res, "createNewsSource");
  return row.id;
}

export async function updateNewsSource(id: number, data: any) {
  const res = await supabaseAdmin
    .from("news_sources")
    .update(data)
    .eq("id", id)
    .select("id")
    .single();

  unwrap(res, "updateNewsSource");
  return true;
}

export async function deleteNewsSource(id: number) {
  const res = await supabaseAdmin
    .from("news_sources")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  unwrap(res, "deleteNewsSource");
  return true;
}

/** =========================
 * CLIPPINGS
 * (tabela: clippings)
 * ========================= */

export async function getClippingsByClientId(clientId: number) {
  const res = await supabaseAdmin
    .from("clippings")
    .select("*")
    .eq("client_id", clientId)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });

  return unwrap(res, "getClippingsByClientId");
}

export async function createClipping(data: any) {
  const res = await supabaseAdmin
    .from("clippings")
    .insert(data)
    .select("id")
    .single();

  const row = unwrap(res, "createClipping");
  return row.id;
}
