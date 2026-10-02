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

type SpotPhoto = { spot_id: string; storage_path: string; credit_name: string | null; license: string; position: number | null };

// Photos per spot from spot_photos (properly sourced, credited photos only),
// in gallery order; the first is the cover. The old scraped photos[] column is
// deliberately not read. A missing or empty table just means no photos: cards
// show the category illustration.
async function loadPhotos(): Promise<Map<string, SpotPhoto[]>> {
  const photos = new Map<string, SpotPhoto[]>();
  try {
    const { data, error } = await supabase.from("spot_photos").select("spot_id,storage_path,credit_name,license,position").order("position", { ascending: true });
    if (!error && data) for (const p of data as SpotPhoto[]) photos.set(p.spot_id, [...(photos.get(p.spot_id) ?? []), p]);
  } catch {}
  return photos;
}

export function creditLine(c: { credit_name: string | null; license: string }) {
  return [c.credit_name, c.license].filter(Boolean).join(" · ");
}

async function fetchSpotSummaries(): Promise<Spot[]> {
  const [{ data, error }, photos] = await Promise.all([
    supabase.from("spots").select(SUMMARY_FIELDS).eq("status", "published"),
    loadPhotos(),
  ]);
  // Throwing keeps a failed read out of the cache; callers fall back.
  if (error || !data || data.length === 0) throw new Error(error?.message ?? "no spots");
  return (data as unknown as Spot[]).map((r) => {
    const ps = photos.get(r.id);
    return ps
      ? { ...r, photos: ps.map((p) => spotPhotoUrl(p.storage_path)), credits: ps.map(creditLine), credit: creditLine(ps[0]) } as Spot
      : { ...r, photos: null, credits: null, credit: null } as Spot;
  });
}

// Cached for an hour and tagged "spots": POST /api/revalidate after editing
// spots or spot_photos in Supabase to show changes immediately.
export const getSpotSummaries = unstable_cache(fetchSpotSummaries, ["spot-summaries-v1"], { revalidate: 3600, tags: ["spots"] });

export async function getSpotSummariesSafe(): Promise<Spot[]> {
  try { return await getSpotSummaries(); } catch { return []; }
}
