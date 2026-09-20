import type { Spot } from "@/types";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Deterministic slug per spot id, stable across builds regardless of fetch
// order. Collisions (two spots slugifying to the same string) get a -2, -3…
// suffix, resolved in a fixed order (by id) so the same spot always gets the
// same suffix.
export function buildSlugMap(spots: Spot[]): Map<string, string> {
  const counts = new Map<string, number>();
  const slugById = new Map<string, string>();
  const sorted = [...spots].sort((a, b) => a.id.localeCompare(b.id));

  for (const spot of sorted) {
    const base = slugify(spot.name) || spot.id;
    const seen = (counts.get(base) ?? 0) + 1;
    counts.set(base, seen);
    slugById.set(spot.id, seen === 1 ? base : `${base}-${seen}`);
  }

  return slugById;
}

export function findSpotBySlug(spots: Spot[], slug: string): Spot | undefined {
  const slugById = buildSlugMap(spots);
  return spots.find((s) => slugById.get(s.id) === slug);
}
