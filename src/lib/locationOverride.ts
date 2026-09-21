// Once a visitor confirms their real area (quick-pick or precise GPS), we
// remember it and never touch IP geolocation again for them — it's only
// ever the first-visit best guess, never the ongoing source of truth.
export interface SavedLocation {
  lat: number;
  lng: number;
  label: string;
}

const KEY = "amc_location_v1";

export function loadSavedLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed as SavedLocation;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocation(loc: SavedLocation) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loc));
  } catch {
    // private browsing, storage full, etc. — non-fatal, just won't persist
  }
}

export interface QuickCity {
  name: string;
  lat: number;
  lng: number;
}

// Curated, not geocoded — avoids adding another external accuracy dependency
// for a short, known list of base cities this app's audience actually starts from.
export const QUICK_CITIES: QuickCity[] = [
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Navi Mumbai", lat: 19.033, lng: 73.0297 },
  { name: "Thane", lat: 19.2183, lng: 72.9781 },
  { name: "Kalyan", lat: 19.2437, lng: 73.1355 },
  { name: "Panvel", lat: 18.9894, lng: 73.1175 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Nashik", lat: 19.9975, lng: 73.7898 },
];
