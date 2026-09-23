import MapViewLoader from "@/components/MapViewLoader";
import { getSpotSummariesSafe } from "@/lib/spots";

export const revalidate = 3600;

export default async function Home() {
  const spots = await getSpotSummariesSafe();
  return (
    <main className="h-dvh w-dvw">
      <MapViewLoader initialSpots={spots} />
    </main>
  );
}
