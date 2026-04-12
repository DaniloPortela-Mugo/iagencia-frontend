import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "tenant-context";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listAll(prefix, acc = []) {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset: 0 });
  if (error) throw error;
  for (const item of data || []) {
    const isFolder = !item.id && !item.metadata;
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (isFolder) {
      await listAll(fullPath, acc);
    } else {
      acc.push(fullPath);
    }
  }
  return acc;
}

async function moveObject(fromPath, toPath) {
  if (fromPath === toPath) return { skipped: true };
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(fromPath);
  if (error || !blob) throw error || new Error(`Download failed: ${fromPath}`);
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(toPath, blob, { upsert: true });
  if (upErr) throw upErr;
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove([fromPath]);
  if (rmErr) throw rmErr;
  return { moved: true };
}

(async () => {
  const all = await listAll("_default");
  console.log("Found:", all);

  const targetMap = {
    "brand.json": "_default/brand.json",
    "socialmedia.json": "_default/socialmedia.json",
    "system.md": "_default/prompts/system.md",
    "socialmedia.md": "_default/prompts/socialmedia.md",
    "claims.json": "_default/rules/claims.json",
    "forbidden.txt": "_default/rules/forbidden.txt",
    "ui.json": "_default/ui/ui.json",
  };

  const planned = [];

  for (const [filename, target] of Object.entries(targetMap)) {
    const candidates = all.filter(p => p.endsWith(`/${filename}`) || p.endsWith(filename));
    if (candidates.length === 0) {
      console.log(`Missing source for ${filename}`);
      continue;
    }
    const from = candidates[0];
    if (from !== target) planned.push({ from, to: target });
  }

  console.log("Planned moves:", planned);

  if (DRY_RUN) {
    console.log("DRY_RUN=1. No changes made.");
    return;
  }

  for (const job of planned) {
    console.log(`Moving ${job.from} -> ${job.to}`);
    await moveObject(job.from, job.to);
  }

  // Remove any leftover empty/unnamed folders by deleting files under them
  const leftovers = (await listAll("_default"))
    .filter(p => p.includes("Untitled"));
  if (leftovers.length > 0) {
    console.log("Removing leftovers:", leftovers);
    const { error } = await supabase.storage.from(BUCKET).remove(leftovers);
    if (error) throw error;
  }

  console.log("Done.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
