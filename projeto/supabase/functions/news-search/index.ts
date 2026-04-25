import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

function mustEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function buildQuery(qDefault: string, include?: string | null, exclude?: string | null) {
  let q = (qDefault ?? "").trim();
  const inc = (include ?? "").trim();
  const exc = (exclude ?? "").trim();

  if (inc) q = q ? `${q} ${inc}` : inc;

  // GNews aceita operadores tipo -palavra
  if (exc) {
    const parts = exc.split(",").map(s => s.trim()).filter(Boolean);
    for (const p of parts) q += ` -${p.replace(/\s+/g, "_")}`;
  }

  return q.trim();
}

async function fetchGnews(params: {
  apiKey: string;
  q: string;
  lang: string;
  country: string;
  max: number;
}) {
  const { apiKey, q, lang, country, max } = params;

  // endpoint de search (GNews)
  const url = new URL("https://gnews.io/api/v4/search");
  url.searchParams.set("q", q);
  url.searchParams.set("lang", lang);
  url.searchParams.set("country", country);
  url.searchParams.set("max", String(max));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`GNews error: ${res.status} ${text}`);
  }

  return JSON.parse(text) as {
    totalArticles?: number;
    articles?: Array<{
      title?: string;
      description?: string;
      content?: string;
      url?: string;
      image?: string;
      publishedAt?: string;
      source?: { name?: string; url?: string };
    }>;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const SB_URL = mustEnv("SB_URL");
    const SB_SERVICE_ROLE_KEY = mustEnv("SB_SERVICE_ROLE_KEY");
    const GNEWS_API_KEY = mustEnv("GNEWS_API_KEY");

    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

    const body = (await req.json().catch(() => ({}))) as Json;

    const clientId = String(body.clientId ?? "").trim();
    if (!clientId) return json({ error: "clientId obrigatório" }, 400);

    // 1) Puxa settings do cliente
    const { data: settings, error: sErr } = await supabase
      .from("client_news_settings")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!settings || settings.is_active === false) {
      return json({ error: "Sem settings ativas para este cliente" }, 400);
    }

    const qDefault = String(settings.query_default ?? "").trim();
    if (!qDefault) return json({ error: "query_default vazia nas settings" }, 400);

    const q = buildQuery(qDefault, settings.include_keywords, settings.exclude_keywords);

    const lang = String(settings.language ?? "pt");
    const country = String(settings.country ?? "br");
    const max = Number(settings.max_results ?? 10);

    // 2) Chama GNews
    const g = await fetchGnews({
      apiKey: GNEWS_API_KEY,
      q,
      lang,
      country,
      max,
    });

    const articles = g.articles ?? [];

    // 3) Salva em clippings (dedupe simples por URL)
    //    (Se quiser dedupe forte: criar unique index em clippings(url, client_id))
    const rows = articles
      .filter(a => a.url && a.title)
      .map(a => ({
        client_id: clientId,
        title: a.title ?? "",
        url: a.url ?? "",
        source: a.source?.name ?? "GNews",
        summary: a.description ?? null,
        sentiment: null,
        is_competitor: 0,
        published_date: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
      }));

    let inserted = 0;

    for (const r of rows) {
      // evita duplicar por URL
      const { data: exists } = await supabase
        .from("clippings")
        .select("id")
        .eq("client_id", clientId)
        .eq("url", r.url)
        .limit(1);

      if (exists && exists.length) continue;

      const { error: insErr } = await supabase.from("clippings").insert([r]);
      if (!insErr) inserted++;
    }

    return json({
      ok: true,
      clientId,
      usedQuery: q,
      fetched: rows.length,
      inserted,
    });
  } catch (e) {
    return json({ error: (e as any)?.message ?? String(e) }, 500);
  }
});
