import Link from "next/link";
import { notFound } from "next/navigation";
import {
  IconArrowLeft,
  IconRoute,
  IconCalendar,
  IconCar,
  IconMotorbike,
  IconMapPin,
  IconMap2,
} from "@tabler/icons-react";
import type { Metadata } from "next";
import { getPublishedSpots } from "@/lib/spots";
import { buildSlugMap, findSpotBySlug } from "@/lib/slug";
import { categoryMeta } from "@/lib/categories";
import { formatDuration } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { Category, Spot } from "@/types";

export const dynamicParams = false;

const CATEGORY_LABEL_SINGULAR: Record<Category, string> = {
  trek: "Trek",
  waterfall: "Waterfall",
  camping: "Campsite",
  adventure: "Adventure",
  activity: "Activity",
};

function pageTitle(spot: Spot): string {
  const label = CATEGORY_LABEL_SINGULAR[spot.category];
  const heading = spot.name.toLowerCase().includes(label.toLowerCase())
    ? spot.name
    : `${spot.name} ${label}`;
  return `${heading} | Everything You Need to Know`;
}

function pageDescription(spot: Spot): string {
  if (spot.description) {
    return spot.description.length > 155
      ? `${spot.description.slice(0, 152).trimEnd()}…`
      : spot.description;
  }
  return `${spot.name}: distance, difficulty, best season and how to reach, for a weekend trip near Mumbai and Pune.`;
}

export async function generateStaticParams() {
  const spots = await getPublishedSpots();
  const slugById = buildSlugMap(spots);
  return spots.map((spot) => ({
    category: spot.category,
    slug: slugById.get(spot.id)!,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const spots = await getPublishedSpots();
  const spot = findSpotBySlug(spots, slug);
  if (!spot || spot.category !== category) return {};

  const title = pageTitle(spot);
  const description = pageDescription(spot);
  const url = `/${spot.category}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function SpotPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const spots = await getPublishedSpots();
  const spot = findSpotBySlug(spots, slug);
  if (!spot || spot.category !== category) notFound();

  const Icon = categoryMeta(spot.category).icon;
  const canonicalUrl = `${SITE_URL}/${spot.category}/${slug}`;

  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: spot.name,
    description: spot.description ?? pageDescription(spot),
    url: canonicalUrl,
    geo: {
      "@type": "GeoCoordinates",
      latitude: spot.lat,
      longitude: spot.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: spot.name, item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-full bg-white px-5 pb-16 pt-[calc(env(safe-area-inset-top)+16px)] text-[var(--ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Link
        href="/"
        className="font-headline mb-6 inline-flex items-center gap-1.5 text-[13px] uppercase text-[var(--ink-muted)]"
      >
        <IconArrowLeft size={15} stroke={2} />
        Anti Monday Club
      </Link>

      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white">
            <Icon size={20} stroke={2} color="#000000" />
          </span>
          <p className="text-xs capitalize text-[var(--ink-muted)]">{spot.category}</p>
        </div>

        <h1 className="font-headline mt-3 text-[28px] leading-tight">{spot.name}</h1>

        {spot.description && (
          <p className="mt-4 text-[15px] leading-relaxed">{spot.description}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2.5 text-sm text-[var(--ink-muted)]">
          {spot.difficulty && (
            <div className="flex items-center gap-1.5">
              <IconRoute size={16} />
              <span className="capitalize">{spot.difficulty}</span>
            </div>
          )}
          {spot.best_season && (
            <div className="flex items-center gap-1.5">
              <IconCalendar size={16} />
              <span>{spot.best_season}</span>
            </div>
          )}
        </div>

        {(spot.distance_from_mumbai_km != null ||
          spot.time_by_car_minutes != null ||
          spot.time_by_bike_minutes != null ||
          spot.distance_from_pune_km != null) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {spot.distance_from_mumbai_km != null && (
              <span className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
                <IconMapPin size={15} />
                {spot.distance_from_mumbai_km} km · Mumbai
              </span>
            )}
            {spot.time_by_car_minutes != null && (
              <span className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
                <IconCar size={15} />
                {formatDuration(spot.time_by_car_minutes)}
              </span>
            )}
            {spot.time_by_bike_minutes != null && (
              <span className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
                <IconMotorbike size={15} />
                {formatDuration(spot.time_by_bike_minutes)}
              </span>
            )}
            {spot.distance_from_pune_km != null && (
              <span className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
                <IconMapPin size={15} />
                {spot.distance_from_pune_km} km · Pune
              </span>
            )}
          </div>
        )}

        {spot.how_to_reach && (
          <div className="mt-6 border-t-2 border-black pt-4">
            <p className="font-headline text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
              How to reach
            </p>
            <p className="mt-1 text-[14px] leading-relaxed">{spot.how_to_reach}</p>
          </div>
        )}

        <Link
          href={`/?spot=${slug}`}
          className="font-headline mt-8 inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-2.5 text-[13px] text-white"
          style={{ background: "var(--pantone-orange)" }}
        >
          <IconMap2 size={16} stroke={2} />
          Open in interactive map
        </Link>
      </div>
    </div>
  );
}
