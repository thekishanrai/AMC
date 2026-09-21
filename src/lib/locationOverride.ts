// Once a visitor confirms their real area (quick-pick or precise GPS), we
// remember it and never touch IP geolocation again for them — it's only
// ever the first-visit best guess, never the ongoing source of truth.
export interface SavedLocation {
  lat: number;
  lng: number;
  label: string;
}

const KEY = "amc_location_v1";
const COOKIE_NAME = "amc_location";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

function parseSavedLocation(raw: string): SavedLocation | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed as SavedLocation;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSavedLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = parseSavedLocation(raw);
      if (parsed) return parsed;
    }
  } catch {
    // ignore, fall through to cookie
  }

  // localStorage is empty or unavailable (e.g. Safari ITP evicted it after
  // 7 days) — fall back to the server-set cookie, which isn't subject to
  // that cap, and reseed localStorage from it so subsequent reads are fast.
  const cookieRaw = readCookie(COOKIE_NAME);
  if (cookieRaw) {
    const parsed = parseSavedLocation(decodeURIComponent(cookieRaw));
    if (parsed) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(parsed));
      } catch {
        // non-fatal
      }
      return parsed;
    }
  }

  return null;
}

export function saveLocation(loc: SavedLocation) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loc));
  } catch {
    // private browsing, storage full, etc. — non-fatal, just won't persist
  }

  // Best-effort server cookie backstop, so the choice survives Safari's
  // 7-day script-storage eviction. Not awaited — never blocks the UI.
  fetch("/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loc),
  }).catch(() => {});
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
