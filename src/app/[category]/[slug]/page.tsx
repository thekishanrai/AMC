import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedSpots } from "@/lib/spots";
import { buildSlugMap, findSpotBySlug } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";
import MapView from "@/components/MapView";
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
    <main className="h-dvh w-dvw">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <MapView initialSpot={spot} />
    </main>
  );
}
