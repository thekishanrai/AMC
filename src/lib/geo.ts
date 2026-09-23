// Approximate bounding box for Maharashtra. Good enough for a soft gate,
// not a precise polygon (some border areas of neighbouring states may pass).
const MAHARASHTRA_BBOX = {
  minLat: 15.6,
  maxLat: 22.1,
  minLng: 72.6,
  maxLng: 80.9,
};

export function isInMaharashtra(lat: number, lng: number) {
  return (
    lat >= MAHARASHTRA_BBOX.minLat &&
    lat <= MAHARASHTRA_BBOX.maxLat &&
    lng >= MAHARASHTRA_BBOX.minLng &&
    lng <= MAHARASHTRA_BBOX.maxLng
  );
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export interface LocationResult {
  lat: number;
  lng: number;
  city: string | null;
  source: "gps" | "ip";
}

export type GpsResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: "denied" | "unavailable" | "timeout" };

// Reports WHY a GPS request failed instead of returning null, so callers can
// explain it rather than silently picking a location for the user.
export function getGpsLocation(): Promise<GpsResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve({ ok: false, reason: "unavailable" });
    let done = false;
    const finish = (r: GpsResult) => { if (!done) { done = true; clearTimeout(guard); resolve(r); } };
    // Some browsers never call back at all; don't leave the button spinning.
    const guard = setTimeout(() => finish({ ok: false, reason: "timeout" }), 12000);
    navigator.geolocation.getCurrentPosition(
      (pos) => finish({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => finish({ ok: false, reason: err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}

export async function getIpLocation(): Promise<LocationResult | null> {
  try {
    const res = await fetch("/api/geo", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat !== "number" || typeof data.lng !== "number") {
      return null;
    }
    return {
      lat: data.lat,
      lng: data.lng,
      city: data.city ?? null,
      source: "ip",
    };
  } catch {
    return null;
  }
}

const MUMBAI: [number, number] = [72.8777, 19.076];
const PUNE: [number, number] = [73.8567, 18.5204];

// Drive time from the chosen origin. The database stores a researched time from
// Mumbai only, so use it when the origin is Mumbai; otherwise estimate from the
// straight-line distance (Sahyadri roads wind: ~1.35x the crow-flies distance at
// ~45 km/h average) and mark it as an estimate.
export function driveFrom(spot: { lat: number; lng: number; time_by_car_minutes?: number | null }, origin: [number, number], originLabel: string): { minutes: number; from: string; estimate: boolean } {
  const [lng, lat] = origin;
  if (spot.time_by_car_minutes != null && haversineKm(lat, lng, MUMBAI[1], MUMBAI[0]) <= 20) {
    return { minutes: spot.time_by_car_minutes, from: "Mumbai", estimate: false };
  }
  const km = haversineKm(lat, lng, spot.lat, spot.lng) * 1.35;
  const minutes = Math.max(10, Math.round((km / 45) * 60 / 5) * 5);
  return { minutes, from: originLabel, estimate: true };
}
export { MUMBAI, PUNE };
