import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type { Spot } from "@/types";

export async function getPublishedSpots(): Promise<Spot[]> {
  const { data, error } = await supabase.from("spots").select("*").eq("status", "published");
  if (error || !data) return [];
  return data as Spot[];
}

// Card/pin fields only. Heavy detail (FAQs, highlights, how to reach) is
// fetched per spot when its sheet opens.
const SUMMARY_FIELDS = "id,slug,name,category,lat,lng,region,difficulty,time_by_car_minutes,distance_from_mumbai_km,distance_from_pune_km,best_season";
export const SPOT_PHOTO_BUCKET = "spot-photos";

export function spotPhotoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SPOT_PHOTO_BUCKET}/${path.replace(/^\/+/, "")}`;
}

type Cover = { spot_id: string; storage_path: string; credit_name: string | null; license: string; position: number | null };

// Cover photo per spot from spot_photos (properly sourced, credited photos
// only). The old scraped photos[] column is deliberately not read. A missing
// or empty table just means no covers: cards show the category illustration.
async function loadCovers(): Promise<Map<string, Cover>> {
  const covers = new Map<string, Cover>();
  try {
    const { data, error } = await supabase.from("spot_photos").select("spot_id,storage_path,credit_name,license,position").order("position", { ascending: true });
    if (!error && data) for (const p of data as Cover[]) if (!covers.has(p.spot_id)) covers.set(p.spot_id, p);
  } catch {}
  return covers;
}

export function creditLine(c: { credit_name: string | null; license: string }) {
  return [c.credit_name, c.license].filter(Boolean).join(" · ");
}

async function fetchSpotSummaries(): Promise<Spot[]> {
  const [{ data, error }, covers] = await Promise.all([
    supabase.from("spots").select(SUMMARY_FIELDS).eq("status", "published"),
    loadCovers(),
  ]);
  // Throwing keeps a failed read out of the cache; callers fall back.
  if (error || !data || data.length === 0) throw new Error(error?.message ?? "no spots");
  return (data as unknown as Spot[]).map((r) => {
    const c = covers.get(r.id);
    return { ...r, photos: c ? [spotPhotoUrl(c.storage_path)] : null, credit: c ? creditLine(c) : null } as Spot;
  });
}

// Cached for an hour and tagged "spots": POST /api/revalidate after editing
// spots or spot_photos in Supabase to show changes immediately.
export const getSpotSummaries = unstable_cache(fetchSpotSummaries, ["spot-summaries-v1"], { revalidate: 3600, tags: ["spots"] });

export async function getSpotSummariesSafe(): Promise<Spot[]> {
  try { return await getSpotSummaries(); } catch { return []; }
}
