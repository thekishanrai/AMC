import { NextRequest, NextResponse } from "next/server";

// Reads Vercel's edge-computed IP geolocation headers, present on every
// request in production. Absent in local `next dev` (no edge in front),
// so callers should treat a null response as "location unknown," same as
// any other geolocation failure.
export async function GET(request: NextRequest) {
  const lat = request.headers.get("x-vercel-ip-latitude");
  const lng = request.headers.get("x-vercel-ip-longitude");
  const city = request.headers.get("x-vercel-ip-city");

  if (!lat || !lng) {
    return NextResponse.json({ lat: null, lng: null, city: null });
  }

  return NextResponse.json({
    lat: Number(lat),
    lng: Number(lng),
    city: city ? decodeURIComponent(city) : null,
  });
}
