import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.env.TENANT_CONTEXT_ROOT ||
  "/Users/daniloportela/Desktop/TESTES_IA/meu_app/iagencia-core/tenant_context";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MIME_BY_EXT = {
  ".json": "application/json",
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
};

function isProbablyText(buf) {
  const sample = buf.slice(0, 1024);
  let binary = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) binary++;
  }
  return binary / sample.length < 0.1;
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const tenantDirs = (await fs.promises.readdir(ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let total = 0;
  for (const tenantSlug of tenantDirs) {
    const tenantPath = path.join(ROOT, tenantSlug);
    const files = await walk(tenantPath);

    const rows = [];
    for (const file of files) {
      if (file.includes(".DS_Store")) continue;

      const rel = path.relative(tenantPath, file);
      const buf = await fs.promises.readFile(file);
      const textLike = isProbablyText(buf);
      const content = textLike ? buf.toString("utf8") : buf.toString("base64");
      const ext = path.extname(file).toLowerCase();

      rows.push({
        tenant_slug: tenantSlug,
        source_path: rel.replace(/\\/g, "/"),
        content,
        is_binary: !textLike,
        content_type: MIME_BY_EXT[ext] || "application/octet-stream",
        size_bytes: buf.length,
        content_hash: hashContent(content),
      });
    }

    // Upsert in batches
    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((r) => ({
        tenant_slug: r.tenant_slug,
        source_path: r.source_path,
        content: r.content,
        is_binary: r.is_binary,
        content_type: r.content_type,
        size_bytes: r.size_bytes,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("tenant_context")
        .upsert(batch, { onConflict: "tenant_slug,source_path" });

      if (error) {
        console.error("Upsert error:", error.message);
        process.exit(1);
      }
    }

    total += rows.length;
    console.log(`Synced ${rows.length} files for ${tenantSlug}`);
  }

  console.log(`Done. Total files: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
