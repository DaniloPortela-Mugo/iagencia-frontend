import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

type Json = Record<string, unknown>;

type BriefingResult = {
  summary: string;
  objective: string;
  key_message: string;
  deliverables: string[];
  tech_requirements: string;
  tone?: string;
};

type StrategyResult = {
  insight: string;
  big_idea: string;
  tone: string;
  channels: string[];
  kpis: string[];
};

type ProductionPlan = {
  timeline: Array<{ date: string; phase: string; task: string }>;
  staff_needs: Array<{ role: string; qty: number }>;
  budget_lines: Array<{ category: string; item: string; est_cost: number }>;
  risks: Array<{ severity: string; alert: string; solution: string }>;
};

const decoder = new TextDecoder();

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
  return await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
}

async function decryptSecret(value: string) {
  if (!value || !value.startsWith("enc:")) return value;
  const key = await getAesKey();
  if (!key) return value;
  try {
    const raw = b64UrlToBytes(value.slice(4));
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return decoder.decode(pt);
  } catch {
    return null;
  }
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

function mustEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function safeJson(req: Request): Promise<Json> {
  try {
    return (await req.json()) as Json;
  } catch {
    return {};
  }
}

function normalizeDeliverables(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return [];
}

function buildFallbackBriefing(payload: {
  title: string;
  raw_input: string;
  objective?: string;
  target_audience?: string;
  cta?: string;
  restrictions?: string;
  context?: string;
}): BriefingResult {
  const summary = payload.title || "Briefing gerado";
  const objective = payload.objective || "Definir objetivo e orientar produção";
  const key_message = payload.raw_input || "Mensagem principal a definir.";
  const deliverables = ["Proposta criativa", "Rascunho inicial", "Checklist de aprovação"];
  const tech_requirements = [
    payload.target_audience ? `Público: ${payload.target_audience}` : null,
    payload.cta ? `CTA: ${payload.cta}` : null,
    payload.restrictions ? `Restrições: ${payload.restrictions}` : null,
    payload.context ? "Contexto do cliente carregado." : null,
  ]
    .filter(Boolean)
    .join(" | ") || "Sem requisitos técnicos adicionais.";

  return { summary, objective, key_message, deliverables, tech_requirements, tone: "profissional" };
}

function buildFallbackStrategy(): StrategyResult {
  return {
    insight: "O publico busca clareza e resultado em meio ao excesso de informacao.",
    big_idea: "Resultado sem ruido",
    tone: "claro, direto, profissional",
    channels: ["Instagram", "LinkedIn", "Google"],
    kpis: ["Engajamento", "Leads", "CTR"],
  };
}

function buildFallbackProductionPlan(): ProductionPlan {
  return {
    timeline: [{ date: "D-7", phase: "Pre-producao", task: "Kickoff e alinhamento" }],
    staff_needs: [{ role: "Diretor", qty: 1 }, { role: "Camera", qty: 1 }],
    budget_lines: [
      { category: "pessoal", item: "Equipe base", est_cost: 3000 },
      { category: "equipamento", item: "Locacao basica", est_cost: 1500 },
    ],
    risks: [{ severity: "medium", alert: "Atraso de agenda", solution: "Plano B de datas" }],
  };
}

async function fetchTenantContext(tenantSlug: string) {
  try {
    const SB_URL = mustEnv("SB_URL");
    const SB_SERVICE_ROLE_KEY = mustEnv("SB_SERVICE_ROLE_KEY");
    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("tenant_context")
      .select("tenant_slug, source_path, content, is_binary, content_type")
      .in("tenant_slug", ["_default", tenantSlug])
      .order("tenant_slug", { ascending: true })
      .order("source_path", { ascending: true });
    if (error) return null;
    return data ?? [];
  } catch {
    return null;
  }
}

async function fetchTenantApiKey(tenantSlug: string, provider: string) {
  try {
    const SB_URL = mustEnv("SB_URL");
    const SB_SERVICE_ROLE_KEY = mustEnv("SB_SERVICE_ROLE_KEY");
    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("tenant_api_keys")
      .select("api_key")
      .eq("tenant_slug", tenantSlug)
      .eq("provider", provider)
      .maybeSingle();
    if (error) return null;
    const key = data?.api_key;
    if (key && typeof key === "string") {
      return (await decryptSecret(key)) || key;
    }
    return null;
  } catch {
    return null;
  }
}

function compileContext(rows: Array<any> | null, maxChars = 12000) {
  if (!rows || rows.length === 0) return "";
  let output = "";
  for (const row of rows) {
    if (row?.is_binary) continue;
    const header = `[${row.tenant_slug}] ${row.source_path}`;
    const chunk = String(row.content || "").trim();
    if (!chunk) continue;
    const next = `${header}\n${chunk}\n\n`;
    if (output.length + next.length > maxChars) break;
    output += next;
  }
  return output.trim();
}

function pickPrompt(rows: Array<any> | null, path: string) {
  if (!rows) return "";
  const row = rows.find((r) => r?.source_path === path && !r?.is_binary);
  return row ? String(row.content || "").trim() : "";
}

function buildSystemPrompt(flow: string, rows: Array<any> | null) {
  const base = systemByFlow(flow);
  const systemPrompt = pickPrompt(rows, "prompts/system.md");
  const flowPrompt = pickPrompt(rows, `prompts/${flow}.md`);
  return [base, systemPrompt, flowPrompt].filter(Boolean).join("\n\n");
}

function buildStrategySystem(flow: string, rows: Array<any> | null) {
  const base =
    "Voce e um estrategista de marca. Gere JSON estrito com as chaves: insight, big_idea, tone, channels (array), kpis (array).";
  const systemPrompt = pickPrompt(rows, "prompts/system.md");
  const flowPrompt = pickPrompt(rows, `prompts/${flow}.md`);
  return [base, systemPrompt, flowPrompt].filter(Boolean).join("\n\n");
}

function buildProductionPlanSystem(flow: string, rows: Array<any> | null) {
  const base =
    "Voce e um produtor executivo. Gere JSON estrito com as chaves: timeline (array de {date, phase, task}), staff_needs (array de {role, qty}), budget_lines (array de {category, item, est_cost}), risks (array de {severity, alert, solution}).";
  const systemPrompt = pickPrompt(rows, "prompts/system.md");
  const flowPrompt = pickPrompt(rows, `prompts/${flow}.md`);
  return [base, systemPrompt, flowPrompt].filter(Boolean).join("\n\n");
}

function systemByFlow(flow: string) {
  const base = "Você é um estrategista de briefing. Gere JSON estrito com as chaves: summary, objective, key_message, deliverables (array), tech_requirements, tone. Use o contexto do cliente.";
  switch (flow) {
    case "planning":
    case "planejamento":
      return `${base} Foco: planejamento estratégico, objetivos e canais.`;
    case "creation":
    case "redacao":
      return `${base} Foco: redação/copy e direção criativa.`;
    case "production":
    case "producao":
      return `${base} Foco: produção audiovisual, logística e requisitos técnicos.`;
    case "image_studio":
    case "imagem":
      return `${base} Foco: direção de arte e especificações visuais.`;
    case "video_studio":
    case "video":
      return `${base} Foco: vídeo, motion e requisitos de mídia.`;
    case "social_media":
    case "social":
      return `${base} Foco: social media, tom de voz e calendário.`;
    default:
      return `${base} Foco: atendimento e triagem de briefing.`;
  }
}

async function callOpenAI(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${text}`);
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const body = await safeJson(req);

    const tenantSlug = String(body.tenant_slug ?? "").trim();
    const title = String(body.title ?? "").trim();
    const raw_input = String(body.raw_input ?? "").trim();
    const flow = String(body.flow ?? "atendimento").trim().toLowerCase();
    const mode = String(body.mode ?? "briefing").trim().toLowerCase();

    if (!tenantSlug) return json({ error: "tenant_slug obrigatório" }, 400);
    if (mode === "briefing" && (!title || !raw_input)) {
      return json({ error: "title e raw_input são obrigatórios" }, 400);
    }

    const contextRows = await fetchTenantContext(tenantSlug);
    const contextText = compileContext(contextRows, 12000);

    const objective = String(body.objective ?? "").trim();
    const target_audience = String(body.target_audience ?? "").trim();
    const cta = String(body.cta ?? "").trim();
    const restrictions = String(body.restrictions ?? "").trim();
    const boldness = Number(body.boldness ?? 3);
    const references = String(body.references ?? "").trim();

    const system = buildSystemPrompt(flow, contextRows);
    const userPrompt = [
      `Tenant: ${tenantSlug}`,
      `Título: ${title}`,
      `Pedido bruto: ${raw_input}`,
      objective ? `Objetivo: ${objective}` : null,
      target_audience ? `Público: ${target_audience}` : null,
      cta ? `CTA: ${cta}` : null,
      restrictions ? `Restrições: ${restrictions}` : null,
      references ? `Referências: ${references}` : null,
      `Nível de ousadia (1-5): ${Number.isFinite(boldness) ? boldness : 3}`,
      contextText ? `Contexto do cliente:\n${contextText}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const provider = (Deno.env.get("AI_PROVIDER") || "openai").toLowerCase();

    if (provider === "openai") {
      const tenantKey = await fetchTenantApiKey(tenantSlug, "openai");
      const apiKey = tenantKey || Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        if (mode === "strategy") {
          return json({ ...buildFallbackStrategy(), _warning: "OPENAI_API_KEY ausente, fallback" });
        }
        if (mode === "production_plan") {
          return json({ ...buildFallbackProductionPlan(), _warning: "OPENAI_API_KEY ausente, fallback" });
        }
        if (mode === "chat") {
          return json({ response: "Chave de IA nao configurada." });
        }
        const fallback = buildFallbackBriefing({
          title,
          raw_input,
          objective,
          target_audience,
          cta,
          restrictions,
          context: contextText,
        });
        return json({ ...fallback, _warning: "OPENAI_API_KEY ausente, retornando fallback" });
      }

      const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
      if (mode === "strategy") {
        const strategySystem = buildStrategySystem(flow, contextRows);
        const strategyPrompt = [
          `Tenant: ${tenantSlug}`,
          objective ? `Objetivo: ${objective}` : null,
          target_audience ? `Público: ${target_audience}` : null,
          contextText ? `Contexto do cliente:\n${contextText}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        const result = await callOpenAI({ apiKey, model, system: strategySystem, user: strategyPrompt });
        const content = result?.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        const strategy: StrategyResult = {
          insight: String(parsed?.insight ?? "").trim(),
          big_idea: String(parsed?.big_idea ?? "").trim(),
          tone: String(parsed?.tone ?? "").trim(),
          channels: normalizeDeliverables(parsed?.channels),
          kpis: normalizeDeliverables(parsed?.kpis),
        };
        return json(strategy);
      }

      if (mode === "production_plan") {
        const planSystem = buildProductionPlanSystem(flow, contextRows);
        const planPrompt = [
          `Tenant: ${tenantSlug}`,
          objective ? `Objetivo: ${objective}` : null,
          target_audience ? `Publico: ${target_audience}` : null,
          raw_input ? `Brief: ${raw_input}` : null,
          contextText ? `Contexto do cliente:\n${contextText}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        const result = await callOpenAI({ apiKey, model, system: planSystem, user: planPrompt });
        const content = result?.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        const plan: ProductionPlan = {
          timeline: Array.isArray(parsed?.timeline) ? parsed.timeline : [],
          staff_needs: Array.isArray(parsed?.staff_needs) ? parsed.staff_needs : [],
          budget_lines: Array.isArray(parsed?.budget_lines) ? parsed.budget_lines : [],
          risks: Array.isArray(parsed?.risks) ? parsed.risks : [],
        };
        return json(plan);
      }

      if (mode === "social_grid") {
        const gridSystem = buildSystemPrompt("social_media", contextRows);
        const gridPrompt = [
          `Tenant: ${tenantSlug}`,
          raw_input ? `Contexto: ${raw_input}` : null,
          contextText ? `Contexto do cliente:\n${contextText}` : null,
          "Retorne APENAS um JSON valido de lista de linhas no formato esperado.",
        ]
          .filter(Boolean)
          .join("\n");
        const result = await callOpenAI({ apiKey, model, system: gridSystem, user: gridPrompt });
        const content = result?.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        return json({ grid: Array.isArray(parsed) ? parsed : [] });
      }

      if (mode === "chat") {
        const message = String(body.message ?? "").trim() || raw_input;
        const extraContext = String(body.extra_context ?? "").trim();
        const history = Array.isArray(body.history) ? body.history : [];
        const messages = [
          { role: "system", content: system + (contextText ? `\n\nContexto do cliente:\n${contextText}` : "") },
          ...history.filter((h: any) => h?.role && h?.content).map((h: any) => ({ role: h.role, content: String(h.content) })),
          { role: "user", content: [message, extraContext ? `Contexto extra:\n${extraContext}` : null].filter(Boolean).join("\n\n") },
        ];

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.4,
            response_format: { type: "json_object" },
          }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${text}`);
        const parsed = JSON.parse(text);
        const content = parsed?.choices?.[0]?.message?.content;
        const response = typeof content === "string" ? JSON.parse(content) : content;
        return json({ response: response?.response || response?.text || content || "" });
      }

      const result = await callOpenAI({ apiKey, model, system, user: userPrompt });
      const content = result?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;

      const briefing: BriefingResult = {
        summary: String(parsed?.summary ?? "").trim(),
        objective: String(parsed?.objective ?? "").trim(),
        key_message: String(parsed?.key_message ?? "").trim(),
        deliverables: normalizeDeliverables(parsed?.deliverables),
        tech_requirements: String(parsed?.tech_requirements ?? "").trim(),
        tone: parsed?.tone ? String(parsed.tone) : undefined,
      };

      return json(briefing);
    }

    const fallback = buildFallbackBriefing({
      title,
      raw_input,
      objective,
      target_audience,
      cta,
      restrictions,
      context: contextText,
    });
    return json({ ...fallback, _warning: `AI_PROVIDER=${provider} não suportado` });
  } catch (e) {
    return json({ error: (e as any)?.message ?? String(e) }, 500);
  }
});
