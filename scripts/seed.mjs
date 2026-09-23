import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const spots = JSON.parse(
  readFileSync(path.join(root, "supabase/seed/spots.json"), "utf8")
);

const { data, error } = await supabase
  .from("spots")
  // slug is not sent: the spots_slug_insert trigger generates it once for new rows and never changes it on upsert.
  .upsert(spots, { onConflict: "name" })
  .select("id, name");

if (error) {
  console.error("Seed failed:", error);
  process.exit(1);
}

console.log(`Seeded ${data.length} spots.`);
