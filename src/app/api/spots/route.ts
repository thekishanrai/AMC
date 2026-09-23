import { NextResponse } from "next/server";
import { getSpotSummaries } from "@/lib/spots";

// Slim spot list for the client retry path (the page normally ships it).
export async function GET() {
  try {
    const spots = await getSpotSummaries();
    return NextResponse.json(spots, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
