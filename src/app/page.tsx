import type { Metadata } from "next";
import MapViewLoader from "@/components/MapViewLoader";
import { getSpotSummariesSafe } from "@/lib/spots";

export const revalidate = 3600;

const TITLE = "Anti Monday Club | Bury Monday Somewhere Scenic";
const DESCRIPTION =
  "We pick the spot. You bring the shovel. Offbeat places, hidden spots and weekend escapes Monday will never find.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Anti Monday Club", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function Home() {
  const spots = await getSpotSummariesSafe();
  return (
    <main className="h-dvh w-dvw">
      <MapViewLoader initialSpots={spots} />
    </main>
  );
}
