import { supabase } from "@/lib/supabase";

// Slugs are stored on spots.slug and generated once at insert (see
// supabase/migrations/0008_spots_persistent_slugs.sql). Never compute them from names.
// When a slug changes, the old one lands in spot_slug_history so old links redirect.
export async function findRenamedSlug(oldSlug: string): Promise<{ category: string; slug: string } | null> {
  const { data, error } = await supabase
    .from("spot_slug_history")
    .select("spots!inner(slug,category,status)")
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (error || !data) return null;
  const spot = (Array.isArray(data.spots) ? data.spots[0] : data.spots) as { slug: string; category: string; status: string } | undefined;
  if (!spot || spot.status !== "published") return null;
  return { category: spot.category, slug: spot.slug };
}
