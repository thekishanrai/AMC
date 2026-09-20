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
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return null;
    }
    return {
      lat: data.latitude,
      lng: data.longitude,
      city: data.city ?? null,
      source: "ip",
    };
  } catch {
    return null;
  }
}
