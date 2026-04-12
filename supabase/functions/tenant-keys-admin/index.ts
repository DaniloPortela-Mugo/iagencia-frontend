import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

type Json = Record<string, unknown>;

const encoder = new TextEncoder();

function b64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(input: string) {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256Bytes(data: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

async function getAesKey() {
  const raw = (Deno.env.get("IAGENCIA_CRYPTO_KEY") || "").trim();
  if (!raw) return null;
  let keyBytes: Uint8Array;
  if (raw.startsWith("hex:")) {
    const hex = raw.slice(4);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    keyBytes = out;
  } else {
    keyBytes = b64UrlToBytes(raw);
  }
  if (keyBytes.length !== 32) {
    keyBytes = await sha256Bytes(keyBytes);
  }
  return await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
}

async function encryptSecret(value: string) {
  if (!value) return value;
  if (value.startsWith("enc:")) return value;
  const key = await getAesKey();
  if (!key) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  const packed = new Uint8Array(iv.length + ct.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ct), iv.length);
  return `enc:${b64UrlEncode(packed)}`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function getEnv(name: string, fallback?: string) {
  return Deno.env.get(name) || (fallback ? Deno.env.get(fallback) : "") || "";
}

function mustEnv(name: string, fallback?: string) {
  const v = getEnv(name, fallback);
  if (!v) throw new Error(`Missing env: ${name}${fallback ? ` or ${fallback}` : ""}`);
  return v;
}

async function requireTenantAdmin(req: Request, tenantSlug: string) {
  const SB_URL = mustEnv("SB_URL", "SUPABASE_URL");
  const SB_ANON_KEY = mustEnv("SB_ANON_KEY", "SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SB_URL, SB_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return { ok: false, error: "unauthorized" };

  const { data: access } = await userClient
    .from("user_tenants")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("tenant_slug", tenantSlug)
    .maybeSingle();

  if (!access || access.role !== "admin") return { ok: false, error: "forbidden" };
  return { ok: true, user: data.user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  let body: Json = {};
  try { body = (await req.json()) as Json; } catch { body = {}; }
  const action = String(body.action || "");
  const tenantSlug = String(body.tenant_slug || "").trim();
  const provider = String(body.provider || "openai").trim().toLowerCase();

  if (!tenantSlug) return json({ error: "tenant_slug obrigatório" }, 400);
  let auth: { ok: boolean; error?: string };
  try {
    auth = await requireTenantAdmin(req, tenantSlug);
  } catch (e) {
    return json({ error: "misconfigured", message: String(e) }, 500);
  }
  if (!auth.ok) return json({ error: auth.error }, auth.error === "forbidden" ? 403 : 401);

  const SB_URL = mustEnv("SB_URL", "SUPABASE_URL");
  const SB_SERVICE_ROLE_KEY = mustEnv("SB_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  try {
    if (action === "upsert") {
      const apiKey = String(body.api_key || "").trim();
      if (!apiKey) return json({ error: "api_key obrigatório" }, 400);
      const encrypted = await encryptSecret(apiKey);
      const { error } = await admin
        .from("tenant_api_keys")
        .upsert({ tenant_slug: tenantSlug, provider, api_key: encrypted }, { onConflict: "tenant_slug,provider" });
      if (error) throw new Error(error.message);
      return json({ status: "ok", tenant_slug: tenantSlug, provider });
    }

    if (action === "delete") {
      const { error } = await admin
        .from("tenant_api_keys")
        .delete()
        .eq("tenant_slug", tenantSlug)
        .eq("provider", provider);
      if (error) throw new Error(error.message);
      return json({ status: "ok", tenant_slug: tenantSlug, provider });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("tenant_api_keys")
        .select("provider, updated_at")
        .eq("tenant_slug", tenantSlug);
      if (error) throw new Error(error.message);
      return json({ status: "ok", tenant_slug: tenantSlug, providers: data || [] });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
