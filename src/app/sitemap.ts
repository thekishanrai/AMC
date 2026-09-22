import type { MetadataRoute } from "next";
import { getPublishedSpots } from "@/lib/spots";
import { buildSlugMap } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const spots = await getPublishedSpots();
  const slugById = buildSlugMap(spots);

  const spotUrls: MetadataRoute.Sitemap = spots.map((spot) => ({
    url: `${SITE_URL}/${spot.category}/${slugById.get(spot.id)}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }, ...spotUrls];
}
