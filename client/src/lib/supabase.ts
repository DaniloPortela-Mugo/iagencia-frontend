import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = "https://tcvqsiwgkazwskdsbgqi.supabase.co";
export const supabaseAnonKey = "sb_publishable_afxNAFOQBWom50qk1vTG6Q_4VaVEGEn";

console.log("🕵️ MODO NUCLEAR ATIVADO! URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Expor no window em dev para debug rápido no console
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}
