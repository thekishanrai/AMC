import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedSpots, getSpotSummariesSafe } from "@/lib/spots";
import { findRenamedSlug } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";
import MapView from "@/components/MapView";
import type { Category, Spot } from "@/types";

// Spots added after a build render on first visit, then cache for an hour.
export const dynamicParams = true;
export const revalidate = 3600;

async function findSpot(slug: string): Promise<Spot | undefined> {
  const spots = await getPublishedSpots();
  return spots.find((s) => s.slug === slug);
}

// Wrong category or a renamed spot: 308 to the one current URL.
async function redirectIfMoved(category: string, slug: string, spot: Spot | undefined): Promise<void> {
  if (spot) {
    if (spot.category !== category) permanentRedirect(`/${spot.category}/${spot.slug}`);
    return;
  }
  const moved = await findRenamedSlug(slug);
  if (moved) permanentRedirect(`/${moved.category}/${moved.slug}`);
}

const CATEGORY_LABEL_SINGULAR: Record<Category, string> = {
  trek: "Trek",
  waterfall: "Waterfall",
  camping: "Campsite",
  adventure: "Adventure",
  activity: "Activity",
};

function pageTitle(spot: Spot): string {
  return `${spot.name} | Everything You Need to Know`;
}

function pageDescription(spot: Spot): string {
  return spot.description ?? `${spot.name}: distance, difficulty, best season and how to reach, for a weekend trip near Mumbai and Pune.`;
}

export async function generateStaticParams() {
  const spots = await getPublishedSpots();
  return spots.map((spot) => ({ category: spot.category, slug: spot.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const spot = await findSpot(slug);
  if (!spot || spot.category !== category) return {};

  const title = pageTitle(spot);
  const description = pageDescription(spot);
  const url = `/${spot.category}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { title, description, url, type: "website", siteName: "Anti Monday Club" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SpotPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const found = await findSpot(slug);
  await redirectIfMoved(category, slug, found);
  if (!found) notFound();
  const spot = found;

  const canonicalUrl = `${SITE_URL}/${spot.category}/${slug}`;

  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: spot.name,
    description: spot.description ?? pageDescription(spot),
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    touristType: CATEGORY_LABEL_SINGULAR[spot.category],
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

  const faqJsonLd = spot.faqs?.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: spot.faqs
      .filter((faq) => faq.question && faq.answer)
      .map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
  } : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: spot.name, item: canonicalUrl },
    ],
  };

  const summaries = await getSpotSummariesSafe();
  const cover = summaries.find((x) => x.id === spot.id);
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
      {faqJsonLd && faqJsonLd.mainEntity.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <MapView initialSpot={{ ...spot, photos: cover?.photos ?? null, credit: cover?.credit ?? null }} initialSpots={summaries} />
    </main>
  );
}
