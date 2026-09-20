import { supabase } from "./supabase";
import type { Spot } from "@/types";

export async function getPublishedSpots(): Promise<Spot[]> {
  const { data, error } = await supabase.from("spots").select("*").eq("status", "published");
  if (error || !data) return [];
  return data as Spot[];
}
