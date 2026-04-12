import { createClient } from "@supabase/supabase-js";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não definido`);
  return v;
}

export const supabaseAdmin = createClient(
  req("SUPABASE_URL"),
  req("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
