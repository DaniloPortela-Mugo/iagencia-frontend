// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definido no .env");

  // Importante: Supabase geralmente exige SSL
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  _db = drizzle(pool);
  return _db;
}
