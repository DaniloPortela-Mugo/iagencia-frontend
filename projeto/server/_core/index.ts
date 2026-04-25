// server/_core/index.ts
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { systemRouter } from "./systemRouter";

export type Context = {
  supabase: SupabaseClient;
};

export function createContext(): Context {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  return { supabase };
}

export type AppRouter = typeof systemRouter;

export const trpcServer = createHTTPServer({
  router: systemRouter,
  createContext,
});
