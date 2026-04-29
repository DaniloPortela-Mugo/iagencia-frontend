import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  // Verifica se o chamador é admin interno (via JWT)
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
  if (authError || !caller) return json({ error: "Unauthorized" }, 401);

  const ALLOWED_ADMINS = (Deno.env.get("INTERNAL_ADMIN_IDS") ?? "").split(",").map(s => s.trim());
  if (!ALLOWED_ADMINS.includes(caller.id)) {
    return json({ error: "Forbidden: apenas admins internos podem convidar usuários." }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const email: string = (body.email ?? "").trim().toLowerCase();
  const tenantSlug: string = (body.tenant_slug ?? "").trim();
  const role: string = (body.role ?? "cliente").trim();

  if (!email || !tenantSlug) {
    return json({ error: "email e tenant_slug são obrigatórios." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Envia convite — cria o usuário no Auth e dispara e-mail
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${Deno.env.get("SITE_URL") ?? "https://iagencia-frontend3.vercel.app"}/login`,
    data: { tenant_slug: tenantSlug, role },
  });

  if (inviteError) {
    // Se o usuário já existe, apenas retorna ok (pode já estar no profiles)
    if (inviteError.message?.includes("already been registered")) {
      return json({ message: "Usuário já cadastrado. Use o botão + para adicioná-lo.", already_exists: true });
    }
    return json({ error: inviteError.message }, 400);
  }

  const userId = invited.user?.id;

  // Garante que o perfil existe
  if (userId) {
    await admin.from("profiles").upsert(
      { id: userId, email, name: email.split("@")[0] },
      { onConflict: "id" }
    );

    // Cria o acesso ao tenant imediatamente
    await admin.from("user_tenants").upsert(
      { user_id: userId, tenant_slug: tenantSlug, role, allowed_modules: [] },
      { onConflict: "user_id,tenant_slug" }
    );
  }

  return json({ message: "Convite enviado com sucesso.", user_id: userId });
});
