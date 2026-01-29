// server/_core/loadEnv.ts
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Carrega .env e .env.local SEM depender do "dotenv/config"
 * e SEM depender de path relativo ao dist/.
 *
 * A regra aqui é simples:
 * - usa sempre a RAIZ do projeto (process.cwd())
 * - carrega .env primeiro, depois .env.local (que sobrescreve)
 */
function load(fileName: string) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return false;

  dotenv.config({
    path: filePath,
    override: true, // .env.local sobrescreve .env
  });

  return true;
}

const loadedEnv = load(".env");
const loadedEnvLocal = load(".env.local");

// debug leve pra você ver o que rolou
if (!process.env.SUPABASE_URL) {
  console.warn(
    `[loadEnv] SUPABASE_URL ainda não veio. ` +
      `cwd=${process.cwd()} | .env=${loadedEnv} | .env.local=${loadedEnvLocal}`
  );
}
