// Uploads the hand-picked Wikimedia Commons photos in supabase/seed/spot_photos.json
// into the spot-photos bucket and replaces each listed spot's spot_photos rows.
//
//   node scripts/upload-photos.mjs            # upload + write rows
//   node scripts/upload-photos.mjs --dry-run  # resolve files and credits only, no writes
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
// (the dry run works without them). Safe to re-run: spots not in the file are
// untouched, and a listed spot ends up with exactly the photos in the file.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const DRY = process.argv.includes("--dry-run");
const BUCKET = "spot-photos";
const WIDTH = 1920; // Commons thumbnail width; originals can exceed the 10 MB bucket limit
const UA = "AntiMondayClub/1.0 (https://antimondayclub.com; photo import)";
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const picks = JSON.parse(readFileSync(path.join(root, "supabase/seed/spot_photos.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikimedia rate-limits bursts; back off on 429/5xx and honour Retry-After.
async function get(url) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } }).catch(() => null);
    if (res?.ok) return res;
    if (res && res.status < 500 && res.status !== 429) throw new Error(`${res.status} for ${url}`);
    const wait = Number(res?.headers.get("retry-after")) * 1000 || 2000 * 2 ** i;
    await sleep(Math.min(wait, 60000));
  }
  throw new Error(`gave up on ${url}`);
}

// One API call per 50 files: a 1920px thumbnail URL plus the uploader, used
// as the credit when the file page names no author.
async function resolve(files) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const titles = files.slice(i, i + 50).map((f) => `File:${f}`).join("|");
    const qs = new URLSearchParams({ action: "query", format: "json", formatversion: "2", titles, prop: "imageinfo", iiprop: "url|user|mime", iiurlwidth: String(WIDTH) });
    const data = await (await get(`https://commons.wikimedia.org/w/api.php?${qs}`)).json();
    const norm = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of data.query.pages) {
      const ii = p.imageinfo?.[0];
      const asked = (norm.get(p.title) ?? p.title).replace(/^File:/, "");
      if (ii) out.set(asked, { url: ii.thumburl ?? ii.url, user: ii.user });
    }
    await sleep(1000);
  }
  return out;
}

const safeName = (file) => file.replace(/\.[a-z0-9]+$/i, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80);

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;
if (!supabase && !DRY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

let ids = new Map();
if (supabase) {
  const { data, error } = await supabase.from("spots").select("id,name");
  if (error) { console.error("Could not read spots:", error.message); process.exit(1); }
  ids = new Map(data.map((s) => [s.name, s.id]));
}

const resolved = await resolve(picks.flatMap((s) => s.photos.map((p) => p.file)));
let uploaded = 0, failed = 0;

for (const spot of picks) {
  const spotId = ids.get(spot.name);
  if (supabase && !spotId) { console.warn(`skip ${spot.name}: not in spots table`); continue; }
  const rows = [];
  for (const [position, p] of spot.photos.entries()) {
    const r = resolved.get(p.file);
    if (!r) { console.warn(`  ${spot.name}: ${p.file} not found on Commons`); failed++; continue; }
    const credit_name = p.credit_name ?? r.user ?? null;
    if (DRY) { console.log(`${spot.name} #${position + 1}: ${p.file} · ${credit_name} · ${p.license}`); continue; }
    try {
      const res = await get(r.url);
      const type = (res.headers.get("content-type") ?? "").split(";")[0];
      if (!EXT[type]) throw new Error(`unsupported type ${type}`);
      const storage_path = `${spotId}/${safeName(p.file)}.${EXT[type]}`;
      const { error } = await supabase.storage.from(BUCKET).upload(storage_path, Buffer.from(await res.arrayBuffer()), { contentType: type, upsert: true, cacheControl: "31536000" });
      if (error) throw error;
      rows.push({ spot_id: spotId, storage_path, credit_name, credit_url: p.credit_url, license: p.license, position });
      uploaded++;
    } catch (e) {
      console.warn(`  ${spot.name}: ${p.file} failed: ${e.message}`); failed++;
    }
    await sleep(500);
  }
  if (DRY || rows.length === 0) continue;

  // Swap the spot's rows, then drop stored files no row points at any more.
  const del = await supabase.from("spot_photos").delete().eq("spot_id", spotId);
  if (del.error) { console.warn(`  ${spot.name}: could not clear old rows: ${del.error.message}`); continue; }
  const ins = await supabase.from("spot_photos").insert(rows);
  if (ins.error) { console.warn(`  ${spot.name}: could not save rows: ${ins.error.message}`); continue; }
  const keep = new Set(rows.map((r) => r.storage_path));
  const { data: stored } = await supabase.storage.from(BUCKET).list(spotId, { limit: 1000 });
  const stale = (stored ?? []).map((o) => `${spotId}/${o.name}`).filter((p) => !keep.has(p));
  if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
  console.log(`${spot.name}: ${rows.length} photo${rows.length === 1 ? "" : "s"}`);
}

console.log(DRY ? `Dry run: ${resolved.size} files resolved, ${failed} missing.` : `Uploaded ${uploaded} photos, ${failed} failed.`);
if (!DRY) console.log(`Refresh the live site now:\n  curl -X POST https://antimondayclub.com/api/revalidate -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"`);
if (failed) process.exitCode = 1;
