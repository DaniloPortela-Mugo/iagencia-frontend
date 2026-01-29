// server/_core/env.ts
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const msg = parsed.error.issues
    .map((i) => `- ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`ENV inválido:\n${msg}`);
}

export const ENV = parsed.data;
