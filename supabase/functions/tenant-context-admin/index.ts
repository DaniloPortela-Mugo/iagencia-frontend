import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

type Json = Record<string, unknown>;

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

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function isProbablyText(data: Uint8Array) {
  const sample = data.subarray(0, 1024);
  for (const b of sample) {
    if (b === 0) return false;
  }
  let nontext = 0;
  for (const b of sample) {
    if (b < 9 || (b > 13 && b < 32)) nontext += 1;
  }
  return (nontext / Math.max(sample.length, 1)) < 0.1;
}

function guessContentType(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "text/yaml";
  return "application/octet-stream";
}

async function listAllFiles(
  storage: ReturnType<typeof createClient>["storage"],
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];

  async function walk(path: string) {
    const { data, error } = await storage.from(bucket).list(path, { limit: 1000, offset: 0 });
    if (error) throw new Error(error.message);
    for (const entry of data || []) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      const isFolder = !entry.id && !entry.metadata;
      if (isFolder) {
        await walk(entryPath);
      } else {
        files.push(entryPath);
      }
    }
  }

  await walk(prefix);
  return files;
}

async function requireAdmin(req: Request) {
  const SB_URL = mustEnv("SB_URL", "SUPABASE_URL");
  const SB_ANON_KEY = mustEnv("SB_ANON_KEY", "SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SB_URL, SB_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return { ok: false, error: "unauthorized" };

  const allowList = (getEnv("ADMIN_USER_IDS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowList.length > 0 && !allowList.includes(data.user.id)) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, user: data.user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  let auth: { ok: boolean; error?: string };
  try {
    auth = await requireAdmin(req);
  } catch (e) {
    return json({ error: "misconfigured", message: String(e) }, 500);
  }
  if (!auth.ok) return json({ error: auth.error }, auth.error === "forbidden" ? 403 : 401);

  let body: Json = {};
  try { body = (await req.json()) as Json; } catch { body = {}; }

  const action = asString(body.action || "");
  const tenantSlug = asString(body.tenant_slug || "").trim();
  const fromSlug = asString(body.from_slug || "_default").trim() || "_default";
  const force = Boolean(body.force);

  if (!tenantSlug) return json({ error: "tenant_slug obrigatório" }, 400);

  const SB_URL = mustEnv("SB_URL", "SUPABASE_URL");
  const SB_SERVICE_ROLE_KEY = mustEnv("SB_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const bucket = getEnv("TENANT_CONTEXT_BUCKET") || "tenant-context";
  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  try {
    if (action === "validate") {
      const required = await listAllFiles(admin.storage, bucket, fromSlug);
      const found = await listAllFiles(admin.storage, bucket, tenantSlug);

      const requiredRel = new Set(required.map((p) => p.replace(`${fromSlug}/`, "")));
      const foundRel = new Set(found.map((p) => p.replace(`${tenantSlug}/`, "")));
      const missing = [...requiredRel].filter((p) => !foundRel.has(p));
      const extra = [...foundRel].filter((p) => !requiredRel.has(p));

      return json({
        status: "ok",
        tenant_slug: tenantSlug,
        source: "storage",
        required_count: requiredRel.size,
        found_count: foundRel.size,
        missing,
        extra,
      });
    }

    if (action === "duplicate") {
      const existing = await listAllFiles(admin.storage, bucket, tenantSlug);
      if (existing.length > 0 && !force) {
        return json({ error: "tenant já possui arquivos", code: "exists" }, 409);
      }
      if (existing.length > 0 && force) {
        await admin.storage.from(bucket).remove(existing);
      }

      const sourceFiles = await listAllFiles(admin.storage, bucket, fromSlug);
      let copied = 0;
      for (const filePath of sourceFiles) {
        const rel = filePath.replace(`${fromSlug}/`, "");
        const { data: blob, error } = await admin.storage.from(bucket).download(filePath);
        if (error || !blob) throw new Error(error?.message || "Falha ao baixar arquivo");
        const destPath = `${tenantSlug}/${rel}`;
        const { error: upErr } = await admin.storage.from(bucket).upload(destPath, blob, {
          upsert: true,
          contentType: guessContentType(destPath),
        });
        if (upErr) throw new Error(upErr.message);
        copied += 1;
      }
      return json({ status: "ok", tenant_slug: tenantSlug, from_slug: fromSlug, files: copied });
    }

    if (action === "sync") {
      const required = await listAllFiles(admin.storage, bucket, fromSlug);
      const found = await listAllFiles(admin.storage, bucket, tenantSlug);

      const requiredRel = new Set(required.map((p) => p.replace(`${fromSlug}/`, "")));
      const foundRel = new Set(found.map((p) => p.replace(`${tenantSlug}/`, "")));
      const missing = [...requiredRel].filter((p) => !foundRel.has(p));
      const extra = [...foundRel].filter((p) => !requiredRel.has(p));

      if (missing.length > 0 && !force) {
        return json({ error: "contexto incompleto", code: "incomplete", missing, extra }, 409);
      }

      const rows = [];
      for (const filePath of found) {
        const rel = filePath.replace(`${tenantSlug}/`, "");
        const { data: blob, error } = await admin.storage.from(bucket).download(filePath);
        if (error || !blob) throw new Error(error?.message || "Falha ao baixar arquivo");
        const buf = new Uint8Array(await blob.arrayBuffer());
        const isText = isProbablyText(buf);
        const content = isText ? new TextDecoder("utf-8").decode(buf) : toBase64(buf);
        rows.push({
          tenant_slug: tenantSlug,
          source_path: rel,
          content,
          is_binary: !isText,
          content_type: guessContentType(rel),
          size_bytes: buf.byteLength,
          updated_at: new Date().toISOString(),
        });
      }

      if (rows.length > 0) {
        const { error } = await admin.from("tenant_context").upsert(rows, { onConflict: "tenant_slug,source_path" });
        if (error) throw new Error(error.message);
      }

      return json({
        status: "ok",
        tenant_slug: tenantSlug,
        synced: rows.length,
        missing,
        extra,
      });
    }

    if (action === "write") {
      const sourcePath = asString(body.source_path || "").trim();
      const content = asString(body.content || "");
      if (!sourcePath) return json({ error: "source_path obrigatório" }, 400);

      const bytes = new TextEncoder().encode(content);
      const storagePath = `${tenantSlug}/${sourcePath}`;
      const { error: upErr } = await admin.storage.from(bucket).upload(storagePath, new Blob([bytes]), {
        upsert: true,
        contentType: guessContentType(sourcePath),
      });
      if (upErr) throw new Error(upErr.message);

      const { error } = await admin.from("tenant_context").upsert({
        tenant_slug: tenantSlug,
        source_path: sourcePath,
        content,
        is_binary: false,
        content_type: guessContentType(sourcePath),
        size_bytes: bytes.byteLength,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_slug,source_path" });
      if (error) throw new Error(error.message);

      return json({ status: "ok", tenant_slug: tenantSlug, source_path: sourcePath });
    }

    if (action === "upload") {
      const sourcePath = asString(body.source_path || "").trim();
      const contentBase64 = asString(body.content_base64 || "");
      const contentType = asString(body.content_type || "") || guessContentType(sourcePath);
      if (!sourcePath) return json({ error: "source_path obrigatório" }, 400);
      if (!contentBase64) return json({ error: "content_base64 obrigatório" }, 400);

      const bytes = fromBase64(contentBase64);
      const storagePath = `${tenantSlug}/${sourcePath}`;
      const { error: upErr } = await admin.storage.from(bucket).upload(storagePath, new Blob([bytes]), {
        upsert: true,
        contentType,
      });
      if (upErr) throw new Error(upErr.message);

      const { error } = await admin.from("tenant_context").upsert({
        tenant_slug: tenantSlug,
        source_path: sourcePath,
        content: contentBase64,
        is_binary: true,
        content_type: contentType,
        size_bytes: bytes.byteLength,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_slug,source_path" });
      if (error) throw new Error(error.message);

      return json({ status: "ok", tenant_slug: tenantSlug, source_path: sourcePath });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
