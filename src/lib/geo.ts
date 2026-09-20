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

export function getGpsLocation(): Promise<LocationResult | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          city: null,
          source: "gps",
        }),
      () => resolve(null),
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
