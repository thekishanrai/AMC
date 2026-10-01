"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type mapboxgl from "mapbox-gl";
import { supabase } from "@/lib/supabase";
import { driveFrom, getGpsLocation, getIpLocation, haversineKm, isInMaharashtra } from "@/lib/geo";
import { loadSavedLocation, saveLocation, type QuickCity } from "@/lib/locationOverride";
import type { Category, Spot } from "@/types";
import TopBar from "./TopBar";
import CategoryChips, { DEFAULT_DISTANCE_KM } from "./CategoryChips";
import LocationPicker from "./LocationPicker";
import SpotSheet from "./SpotSheet";
import GeoGateBanner from "./GeoGateBanner";
import BottomNav,{type AppSection} from "./BottomNav";import{EASE,MORPH_MS,boxTransform,finishMorphs,ghostLayer,ghostOf,intersects,motionOK,relRect,track,whenDone}from"@/lib/flip";import SpotCard from "./SpotCard";import SurpriseMe from "./SurpriseMe";import AccountView from "./AccountView";import{loadSavedSpotIds,saveSpotIds}from"@/lib/savedSpots";


const CENTER: [number, number] = [73.55, 18.75];
// Desktop: the list panel is always open beside the map; no drawer states.
const DESKTOP_QUERY = "(min-width: 1024px)";
// Below this zoom, pins collapse to name-only (no stats row) so a full
// region of spots stays browsable instead of turning into a wall of pills.
const DETAIL_ZOOM_THRESHOLD = 10.5;

// On spot pages the spot name is the page h1 (in the sheet), so the list
// heading steps down to h2 while a sheet is open.
function PanelHeading({ asH2, children }: { asH2: boolean; children: ReactNode }) { return asH2 ? <h2>{children}</h2> : <h1>{children}</h1>; }

type DrawerState = "min" | "half" | "full";
// Drawer translateY per state (0 = fully open). Mirrors --amc-drawer-visible
// in globals.css: min 169px, half min(61dvh, 517px), full the whole panel.
function drawerOffsets(panel: HTMLElement): Record<DrawerState, number> {
  const full = panel.offsetHeight;
  return { min: full - 169, half: full - Math.min(window.innerHeight * 0.61, 517), full: 0 };
}
// A flick goes to the next state past the release point in its direction;
// a slow release settles on the nearest state, so one long drag can travel
// from min straight to full.
function snapDrawer(offsets: Record<DrawerState, number>, at: number, velocity: number): DrawerState {
  const byOffset: DrawerState[] = ["full", "half", "min"];
  if (velocity < -0.3) return [...byOffset].reverse().find((s) => offsets[s] < at - 1) ?? "full";
  if (velocity > 0.3) return byOffset.find((s) => offsets[s] > at + 1) ?? "min";
  return byOffset.reduce((a, b) => (Math.abs(offsets[b] - at) < Math.abs(offsets[a] - at) ? b : a));
}

export default function MapView({ initialSpot = null, initialSpots = [] }: { initialSpot?: Spot | null; initialSpots?: Spot[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl")["default"] | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const pinBucket = useRef("");
  // Drawer drag writes its offset at most once per frame (touch fires up to 120Hz).
  const drawerFrame = useRef(0), drawerTargetOffset = useRef(0);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  // origin = the visitor's reference point (filtering, distances, Surprise Me).
  // bootView = where the map opens; read once at creation and never a
  // dependency, so a location change moves the camera instead of rebuilding
  // (and re-billing) the map.
  const [origin, setOrigin] = useState<[number, number]>(() => {
    if (initialSpot) return [initialSpot.lng, initialSpot.lat];
    const saved = loadSavedLocation();
    return saved ? [saved.lng, saved.lat] : CENTER;
  });
  const bootView = useRef<{ center: [number, number]; zoom: number } | null>(null);
  if (bootView.current === null) bootView.current = { center: origin, zoom: initialSpot ? 12 : loadSavedLocation() ? 11 : 8 };
  const userChoseLocation = useRef(false);
  const [userPin, setUserPin] = useState<[number, number] | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [spots, setSpots] = useState<Spot[]>(() => initialSpots.length ? initialSpots : initialSpot ? [initialSpot] : []);
  const [loadStatus, setLoadStatus] = useState<"loading" | "error" | "ready">(() => initialSpots.length ? "ready" : "loading");
  const loadAbort = useRef<AbortController | null>(null);
  const detailCache = useRef<Map<string, Spot>>(new Map(initialSpot ? [[initialSpot.id, initialSpot]] : []));
  const detailPending = useRef<Map<string, Promise<Spot | null>>>(new Map());
  const pushedSpot = useRef(false);
  const railRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [maxDistanceKm, setMaxDistanceKm] = useState(DEFAULT_DISTANCE_KM);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(initialSpot);
  const [locating, setLocating] = useState(false);
  const [gate, setGate] = useState<{ city: string | null } | null>(() => {
    if (initialSpot) return null;
    const saved = loadSavedLocation();
    return saved && !isInMaharashtra(saved.lat, saved.lng) ? { city: saved.label } : null;
  });
  const [gateDismissed, setGateDismissed] = useState(false);
  const [locationLabel, setLocationLabel] = useState(() => initialSpot?.region ?? loadSavedLocation()?.label ?? "Locating…");
  const [locationConfirmed, setLocationConfirmed] = useState(() => initialSpot != null || loadSavedLocation() != null);
  const[section,setSection]=useState<AppSection>("explore"),[search,setSearch]=useState("");
  const[drawerState,setDrawerState]=useState<DrawerState>("half");const drawerStartY=useRef<number|null>(null),drawerStartX=useRef(0),drawerStartOffset=useRef(0),drawerLastY=useRef(0),drawerLastTime=useRef(0),drawerVelocity=useRef(0),drawerMoved=useRef(false),drawerFromHandle=useRef(false),drawerHeld=useRef(false),drawerGesture=useRef<"pending"|"drawer"|"content">("pending");
  const panelRef=useRef<HTMLElement|null>(null),drawerScrollRef=useRef<HTMLDivElement|null>(null);
  const[savedIds,setSavedIds]=useState<Set<string>>(()=>new Set(loadSavedSpotIds()));
  // Keep the horizontal rail light on mobile. More cards are appended in
  // small batches as the user approaches the end, preserving native scroll.
  const [cardLimit, setCardLimit] = useState(12);

  const slugById = useMemo(() => new Map(spots.map((s) => [s.id, s.slug])), [spots]);

  const spotsRef = useRef(spots), slugRef = useRef(slugById);
  useEffect(() => { spotsRef.current = spots; slugRef.current = slugById; });

  // History: opening a spot adds ONE entry (switching spots replaces it).
  // Closing goes back if we added it, otherwise just tidies the URL, so the
  // back button never collects junk entries.
  function pushSpotUrl(s: Spot) {
    const slug = slugById.get(s.id);
    if (!slug) return;
    const url = `/${s.category}/${slug}`;
    if (pushedSpot.current) window.history.replaceState(window.history.state, "", url);
    else { window.history.pushState(null, "", url); pushedSpot.current = true; }
  }

  function finishClose() {
    closingSheet.current = false;
    setSelectedSpot(null);
    if (pushedSpot.current) { pushedSpot.current = false; window.history.back(); }
    else if (window.location.pathname !== "/" || window.location.search) window.history.replaceState(window.history.state, "", "/");
  }

  // Closing animates first: the sheet shrinks back into its card when that
  // card is on screen; otherwise (or after a swipe-down) it slides away.
  const closingSheet = useRef(false);
  function closeSheet(animate = true) {
    const sheet = document.querySelector<HTMLElement>(".amc-spot-sheet");
    if (!animate || !sheet || !motionOK() || window.matchMedia(DESKTOP_QUERY).matches) { finishMorphs(); finishClose(); return; }
    if (closingSheet.current) return;
    closingSheet.current = true;
    finishMorphs();
    const r = sheet.getBoundingClientRect(), dragged = sheet.style.transform !== "";
    const card = !dragged && selectedSpot ? railRef.current?.querySelector<HTMLElement>(`[data-spot-id="${selectedSpot.id}"]`) : null;
    const c = card?.getBoundingClientRect();
    sheet.style.animation = "none";
    let anim: Animation;
    if (card && c && intersects(c, window.innerWidth, window.innerHeight)) {
      anim = sheet.animate([{ transformOrigin: "0 0", transform: "none", opacity: 1 }, { opacity: 1, offset: 0.3 }, { transformOrigin: "0 0", transform: boxTransform(c, r, true), opacity: 0 }], { duration: 360, easing: EASE, fill: "forwards" });
      track(card.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 0, offset: 0.3 }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE }));
    } else {
      const from = getComputedStyle(sheet).transform;
      anim = sheet.animate([{ transform: from === "none" ? "translate3d(0,0,0)" : from }, { transform: `translate3d(0,${r.height + 24}px,0)` }], { duration: 240, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
    }
    anim.finished.then(finishClose, finishClose);
  }

  // popstate (back/forward, mobile swipe-back): sync the sheet to the URL.
  useEffect(() => {
    const onPopState = () => {
      pushedSpot.current = false;
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length !== 2) { setSelectedSpot(null); return; }
      const s = spotsRef.current.find((x) => slugRef.current.get(x.id) === parts[1]) ?? null;
      setSelectedSpot(s ? detailCache.current.get(s.id) ?? s : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Full spot details are fetched only when a sheet opens (or is about to),
  // then cached, so the home list stays slim.
  function prefetchDetail(id: string): Promise<Spot | null> {
    const hit = detailCache.current.get(id);
    if (hit) return Promise.resolve(hit);
    const pending = detailPending.current.get(id);
    if (pending) return pending;
    const p = (async () => {
      try {
        const { data, error } = await supabase.from("spots").select("*").eq("id", id).single();
        if (error || !data) return null;
        const full = { ...(data as Spot), photos: spotsRef.current.find((x) => x.id === id)?.photos ?? null, credit: spotsRef.current.find((x) => x.id === id)?.credit ?? null } as Spot;
        detailCache.current.set(id, full);
        return full;
      } catch { return null; } finally { detailPending.current.delete(id); }
    })();
    detailPending.current.set(id, p);
    return p;
  }
  const selectedId = selectedSpot?.id ?? null;
  useEffect(() => {
    if (!selectedId || detailCache.current.has(selectedId)) return;
    let live = true;
    prefetchDetail(selectedId).then((full) => { if (live && full) setSelectedSpot((cur) => (cur && cur.id === full.id ? full : cur)); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  function selectSpot(s: Spot) { setSelectedSpot(detailCache.current.get(s.id) ?? s); }

  // Spot list: server-rendered into the page; this client load is only the
  // fallback/retry path. The timeout aborts the request so a hung call can
  // never resolve later and overwrite a newer retry.
  async function loadSpots() {
    loadAbort.current?.abort();
    const ctrl = new AbortController();
    loadAbort.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    setLoadStatus("loading");
    try {
      const res = await fetch("/api/spots", { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Spot[];
      if (ctrl.signal.aborted || loadAbort.current !== ctrl) return;
      if (!Array.isArray(data) || data.length === 0) throw new Error("empty");
      setSpots(data);
      setLoadStatus("ready");
    } catch {
      if (loadAbort.current === ctrl) setLoadStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  function drawUserPin(lat: number, lng: number) {
    const map = mapRef.current, mapbox = mapboxRef.current;
    if (!map || !mapbox) return;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    const pin = document.createElement("div");
    pin.style.cssText = `display: flex; flex-direction: column; align-items: center;`;
    pin.innerHTML = `
      <div class="glass-solid" style="position:relative;border-radius:14px;padding:6px 10px;margin-bottom:7px;">
        <span style="font-family:var(--font-pixel),monospace;font-size:9px;line-height:1.4;color:#111111;white-space:nowrap;letter-spacing:0.02em;">I NEED WEEKEND</span>
        <div style="position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #000000;"></div>
      </div>
      <svg width="52" height="64" viewBox="0 0 52 64">
        <defs><clipPath id="userPinPhoto"><circle cx="26" cy="24" r="17"/></clipPath></defs>
        <path d="M26 2C13.8 2 4 11.8 4 24c0 17 22 38 22 38s22-21 22-38C48 11.8 38.2 2 26 2Z" fill="#fe5000" stroke="#000" stroke-width="2.5"/>
        <image href="/user-location.jpg" x="9" y="7" width="34" height="34" clip-path="url(#userPinPhoto)" preserveAspectRatio="xMidYMid slice"/>
      </svg>
    `;
    userMarkerRef.current = new mapbox.Marker({ element: pin, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);
  }

  // Shared by every location source (IP guess, quick-pick, GPS): updates the
  // camera, the filter reference point, and — for anything but a bare IP
  // guess — persists the choice so IP geolocation is never consulted again.
  function applyLocation(lat: number, lng: number, label: string, opts?: { persist?: boolean; pin?: boolean }) {
    setOrigin([lng, lat]);
    setLocationLabel(label);
    if (opts?.persist) {
      userChoseLocation.current = true;
      saveLocation({ lat, lng, label });
      setLocationConfirmed(true);
    }
    if (!isInMaharashtra(lat, lng)) {
      setGate({ city: label });
      setGateDismissed(false);
    } else {
      setGate(null);
    }
    if (!mapRef.current) bootView.current = { center: [lng, lat], zoom: 11 };
    if (opts?.pin) setUserPin([lng, lat]);
  }

  // Before the map exists, a camera move just updates where it will open.
  function moveCamera(center: [number, number], zoom: number) {
    const map = mapRef.current;
    if (map) map.flyTo({ center, zoom });
    else bootView.current = { center, zoom };
  }

  // Open on something useful: frame the origin plus its nearest spots instead
  // of a fixed city zoom that can show 0 spots. Capped both ways: never closer
  // than zoom 12, and a far-away visitor just gets a regional view.
  const skipFit = useRef(!!initialSpot);
  useEffect(() => {
    const map = mapRef.current, mapbox = mapboxRef.current;
    if (!mapReady || !map || !mapbox || spots.length === 0) return;
    if (skipFit.current) { skipFit.current = false; return; }
    const [lng, lat] = origin;
    const nearest = spots.map((s) => ({ s, d: haversineKm(lat, lng, s.lat, s.lng) })).sort((a, b) => a.d - b.d).slice(0, 8);
    if (!nearest.length || nearest[0].d > 250) { map.flyTo({ center: origin, zoom: 7 }); return; }
    const bounds = new mapbox.LngLatBounds(origin, origin);
    nearest.forEach(({ s }) => bounds.extend([s.lng, s.lat]));
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;
    const padding = desktop ? { top: 110, bottom: 60, left: 80, right: Math.min(760, window.innerWidth * 0.56) + 60 } : { top: 140, bottom: Math.round(window.innerHeight * 0.5), left: 40, right: 40 };
    map.fitBounds(bounds, { padding, maxZoom: 12, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, origin, spots.length > 0]);

  // The GPS pin is driven by state, so it draws whenever the map is ready,
  // never racing the camera move or map creation.
  useEffect(() => {
    if (!mapReady || !userPin) return;
    drawUserPin(userPin[1], userPin[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, userPin]);

  function handlePickCity(city: QuickCity) {
    setGpsError(null);
    applyLocation(city.lat, city.lng, city.name, { persist: true });
  }

  function updatePinDetailVisibility() {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom();
    const detailed = zoom >= DETAIL_ZOOM_THRESHOLD, compact = zoom < 10.5;
    // Runs on every zoom frame: only touch the DOM when a bucket flips, so
    // pinch/fly animations don't restyle 100+ pins per frame.
    const bucket = `${detailed}|${compact}|${markersRef.current.length}`;
    if (pinBucket.current === bucket) return;
    pinBucket.current = bucket;
    // Zoomed out, names collide: show dots and let the list carry the names.
    containerRef.current?.classList.toggle("amc-pins-compact", compact);
    markersRef.current.forEach((m) => {
      const el = m.getElement();
      const detail = el.querySelector<HTMLElement>(".pin-detail");
      if (detail) detail.style.display = detailed ? "flex" : "none";
      el.style.padding = detailed ? "5px 12px" : "6px 10px";
    });
  }

  // A previously confirmed location (quick-pick or GPS) always wins — read
  // synchronously into initial state above, so IP geolocation only ever
  // runs as the first-visit best guess, never re-consulted afterward.
  useEffect(() => {
    if (initialSpot || loadSavedLocation()) return;

    let cancelled = false;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));

    Promise.race([getIpLocation(), timeout]).then((loc) => {
      if (cancelled || userChoseLocation.current) return;
      if (loc) {
        setOrigin([loc.lng, loc.lat]);
        if (!mapRef.current) bootView.current = { center: [loc.lng, loc.lat], zoom: 11 };
        setLocationLabel(loc.city ?? "your area");
        if (!isInMaharashtra(loc.lat, loc.lng)) setGate({ city: loc.city });
      } else {
        setLocationLabel("Mumbai-Pune");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialSpot]);

  // init map once we know where to open it
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let map: mapboxgl.Map | null = null;
    const start = async () => {
      // Let the shell, location state and drawer paint before loading Mapbox.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      // Mapbox is an enhancement: one retry, then a map-unavailable state
      // while the list keeps working.
      let mapbox: typeof import("mapbox-gl")["default"];
      try {
        mapbox = (await import("mapbox-gl")).default;
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;
        try { mapbox = (await import("mapbox-gl")).default; } catch { if (!cancelled) setMapFailed(true); return; }
      }
      if (cancelled || !containerRef.current) return;
      mapbox.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      mapboxRef.current = mapbox;
      const boot = bootView.current ?? { center: CENTER, zoom: 8 };
      try {
        map = new mapbox.Map({container:containerRef.current,style:"mapbox://styles/mapbox/outdoors-v12",center:boot.center,zoom:boot.zoom,attributionControl:false});
      } catch { setMapFailed(true); return; }
      map.on("load", () => { setMapReady(true); updatePinDetailVisibility(); });
      map.on("zoom", updatePinDetailVisibility);
      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map?.resize());
      resizeObserver.observe(containerRef.current);
    };
    start();
    return () => {cancelled=true;resizeObserver?.disconnect();map?.remove();mapRef.current=null;mapboxRef.current=null;setMapReady(false)};
    // Runs once: everything it reads is a ref, so there is no stale closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The list normally arrives with the page; fetch only if it didn't.
  useEffect(() => {
    if (initialSpots.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSpots();
    return () => loadAbort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // open a spot's sheet if the URL was loaded with ?spot=<slug> (e.g. a
  // shared link, or navigating in from a spot's own /[category]/[slug] page)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || spots.length === 0) return;

    const slug = new URLSearchParams(window.location.search).get("spot");
    if (!slug) return;

    const spot = spots.find((s) => slugById.get(s.id) === slug);
    if (!spot) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    selectSpot(spot);
    map.flyTo({ center: [spot.lng, spot.lat], zoom: 13, padding: { bottom: 280, top: 0, left: 0, right: 0 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, mapReady, slugById]);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const [userLng, userLat] = origin;
    const filtered = spots.filter((s) => {
      if (activeCategory !== "all" && s.category !== activeCategory) return false;
      if(search&&!`${s.name} ${s.region??""}`.toLowerCase().includes(search.toLowerCase()))return false;
      // Honest distance: straight-line km from the location the user picked
      // (or their GPS). Never borrow the Mumbai/Pune distances.
      const distanceKm = haversineKm(userLat, userLng, s.lat, s.lng);
      return distanceKm <= maxDistanceKm;
    });

    filtered.forEach((spot) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "amc-map-name-label";
      el.textContent = spot.name;
      // The card list is the accessible way to browse; 126 map pins read as
      // noise to a screen reader.
      el.setAttribute("aria-hidden", "true");
      el.tabIndex = -1;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectSpot(spot);
        map.flyTo({ center: [spot.lng, spot.lat], zoom: 13, padding: { bottom: 280, top: 0, left: 0, right: 0 } });
        pushSpotUrl(spot);
      });

      const mapbox = mapboxRef.current;
      if (!mapbox) return;
      const marker = new mapbox.Marker({ element: el, anchor: "bottom" })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);
      marker.getElement().removeAttribute("aria-label");
      markersRef.current.push(marker);
    });
    pinBucket.current = "";
    updatePinDetailVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, activeCategory, maxDistanceKm, mapReady, origin, slugById,search]);

  async function handleNearMe() {
    setLocating(true);
    setGpsError(null);
    const loc = await getGpsLocation();
    setLocating(false);
    if (!loc.ok) {
      // Never set a location the user didn't choose: keep the current one,
      // explain why, and leave the city picker open.
      setGpsError(loc.reason === "denied" ? "Location is blocked in your browser. Pick your city instead." : "Couldn't find you. Try again or pick your city.");
      setPickerOpen(true);
      return;
    }
    setPickerOpen(false);
    applyLocation(loc.lat, loc.lng, "Your location", {
      persist: true,
      pin: true,
    });
  }

  // Mapbox owns the map container after initialization, so the container must
  // stay mounted while the user visits another app section. Resize after it
  // becomes visible again so its canvas and tiles match the viewport.
  useEffect(() => {
    if (section !== "explore") return;
    const frame = requestAnimationFrame(() => mapRef.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [section]);

  function distanceFor(s:Spot){const[lng,lat]=origin;return haversineKm(lat,lng,s.lat,s.lng)}
  // "Mumbai-Pune" is the no-location fallback centre, not a real place, so
  // drive times there read as plain "drive" rather than "from Mumbai-Pune".
  const originName=locationLabel&&!["Locating…","Mumbai-Pune","your area"].includes(locationLabel)?locationLabel:""
  // Distance and drive per spot, computed once per origin; the objects stay
  // stable so memoized cards skip re-rendering.
  const cardInfo=useMemo(()=>{const[lng,lat]=origin,m=new Map<string,{distance:number;drive:ReturnType<typeof driveFrom>}>();for(const s of spots)m.set(s.id,{distance:haversineKm(lat,lng,s.lat,s.lng),drive:driveFrom(s,origin,originName)});return m},[spots,origin,originName]);
  const visible=useMemo(()=>{const q=search.toLowerCase(),d=(s:Spot)=>cardInfo.get(s.id)?.distance??Infinity;return spots.filter(s=>(activeCategory==="all"||s.category===activeCategory)&&d(s)<=maxDistanceKm&&(!q||`${s.name} ${s.region??""}`.toLowerCase().includes(q))).sort((a,b)=>d(a)-d(b))},[spots,cardInfo,activeCategory,maxDistanceKm,search]);
  // Stable card callbacks that always call the latest handlers.
  const cardActions=useRef<{open:(s:Spot)=>void;focus:(s:Spot)=>void;intent:(s:Spot)=>void}|null>(null);
  useLayoutEffect(()=>{cardActions.current={open:openSpot,focus:s=>{focusSpot(s);prefetchDetail(s.id)},intent:s=>{prefetchDetail(s.id)}}});
  const onCardOpen=useMemo(()=>(s:Spot)=>cardActions.current?.open(s),[]),onCardFocus=useMemo(()=>(s:Spot)=>cardActions.current?.focus(s),[]),onCardIntent=useMemo(()=>(s:Spot)=>cardActions.current?.intent(s),[]);
  function focusSpot(s:Spot,withSheet=false,ease=false){const desktop=typeof window!=="undefined"&&window.matchMedia(DESKTOP_QUERY).matches;const panel=desktop?Math.min(withSheet?760:440,window.innerWidth*(withSheet?.56:.4))+40:0;const opts={center:[s.lng,s.lat] as [number,number],zoom:11.8,padding:desktop?{top:60,bottom:60,left:60,right:panel+40}:{bottom:drawerState==="min"?90:320,top:80,left:0,right:0}};if(ease)mapRef.current?.easeTo({...opts,duration:450,essential:true});else mapRef.current?.flyTo(opts)}
  // Opening from a card: the card grows into the sheet (layout effect below).
  const sheetFrom=useRef<{id:string;card:HTMLElement;rect:DOMRect;state:DrawerState}|null>(null);
  function openSpot(s:Spot){const card=selectedSpot||!motionOK()||window.matchMedia(DESKTOP_QUERY).matches?null:railRef.current?.querySelector<HTMLElement>(`[data-spot-id="${s.id}"]`);sheetFrom.current=card?{id:s.id,card,rect:card.getBoundingClientRect(),state:drawerState}:null;selectSpot(s);pushSpotUrl(s);focusSpot(s,true)}
  useLayoutEffect(()=>{const from=sheetFrom.current;sheetFrom.current=null;if(!from||selectedSpot?.id!==from.id)return;const sheet=document.querySelector<HTMLElement>(".amc-spot-sheet"),app=sheet?.parentElement;if(!sheet||!app)return;finishMorphs();sheet.style.animation="none";const r=sheet.getBoundingClientRect();const layer=ghostLayer(app,`amc-discovery-panel state-${from.state}`);layer.style.zIndex="65";const g=ghostOf(from.card,from.rect,layer);
    whenDone([track(g.animate([{transform:"none",opacity:1},{opacity:1,offset:.25},{transform:boxTransform(r,from.rect,true),opacity:0}],{duration:MORPH_MS,easing:EASE})),track(sheet.animate([{transformOrigin:"0 0",transform:boxTransform(from.rect,r,true),opacity:0},{opacity:1,offset:.45},{transformOrigin:"0 0",transform:"none",opacity:1}],{duration:MORPH_MS,easing:EASE}))],()=>layer.remove())
  },[selectedSpot?.id]);
  // Card rail: an IntersectionObserver tracks which cards are mostly visible;
  // the map moves once, after scrolling settles, and only if the leading card
  // changed. No layout reads per scroll event, no map jitter mid-swipe.
  const railRatios=useRef<Map<string,number>>(new Map());const railTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function settleRail(){railTimer.current=null;const rail=railRef.current;if(!rail)return;const ids=[...rail.querySelectorAll<HTMLElement>("[data-spot-id]")].map(c=>c.dataset.spotId??"");const id=ids.find(i=>(railRatios.current.get(i)??0)>=0.6);if(!id||id===lastFocused.current)return;lastFocused.current=id;markLeadingCard();const s=spotsRef.current.find(x=>x.id===id);if(s){focusSpot(s,false,true);prefetchDetail(s.id)}}
  // Live follow: while the rail moves, pick the leading card once per frame
  // from the IntersectionObserver ratios (no layout reads) and glide the map
  // to it as soon as it changes, instead of waiting for the swipe to stop.
  const railFrame=useRef(0);
  function scheduleRailSettle(){if(railFrame.current)return;railFrame.current=requestAnimationFrame(()=>{railFrame.current=0;settleRail()})}
  const firstVisibleId=visible[0]?.id??null;const railKey=visible.slice(0,cardLimit).map(s=>s.id).join(",");
  // The card showing on load (or after a filter change) is the starting focus.
  useEffect(()=>{lastFocused.current=firstVisibleId},[firstVisibleId]);
  // Rail titles and locations stay on one line. On the card the map follows,
  // a line that doesn't fit scrolls there and back once, then rests on the
  // ellipsis (shown until the motion starts).
  const marqueeTimers=useRef<ReturnType<typeof setTimeout>[]>([]);
  function markLeadingCard(){const rail=railRef.current;if(!rail)return;marqueeTimers.current.forEach(clearTimeout);marqueeTimers.current=[];rail.querySelectorAll(".is-leading").forEach(c=>c.classList.remove("is-leading"));rail.querySelectorAll(".is-marquee").forEach(el=>el.classList.remove("is-marquee"));const card=lastFocused.current?rail.querySelector<HTMLElement>(`[data-spot-id="${lastFocused.current}"]`):null;if(!card)return;card.classList.add("is-leading");if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;card.querySelectorAll<HTMLElement>(".amc-card-name,.amc-card-region").forEach(line=>{const overflow=line.scrollWidth-line.clientWidth;if(overflow<=2)return;line.style.setProperty("--amc-marquee-x",`${-overflow-4}px`);line.style.setProperty("--amc-marquee-dur",`${Math.max(2.4,overflow/28+1.6).toFixed(2)}s`);line.addEventListener("animationend",()=>line.classList.remove("is-marquee"),{once:true});marqueeTimers.current.push(setTimeout(()=>line.classList.add("is-marquee"),800))})}
  useEffect(()=>{if(section!=="explore"||drawerState==="full")return;const frame=requestAnimationFrame(markLeadingCard);document.fonts?.ready.then(()=>requestAnimationFrame(markLeadingCard));return()=>cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[railKey,section,drawerState,firstVisibleId]);
  useEffect(()=>{const rail=railRef.current;if(!rail||section!=="explore"||window.matchMedia(DESKTOP_QUERY).matches)return;const io=new IntersectionObserver(es=>{es.forEach(e=>railRatios.current.set((e.target as HTMLElement).dataset.spotId??"",e.intersectionRatio));scheduleRailSettle()},{root:rail,threshold:[0,0.6,1]});rail.querySelectorAll("[data-spot-id]").forEach(c=>io.observe(c));const onEnd=()=>{if(railFrame.current){cancelAnimationFrame(railFrame.current);railFrame.current=0}settleRail()};rail.addEventListener("scrollend",onEnd);return()=>{io.disconnect();rail.removeEventListener("scrollend",onEnd);if(railTimer.current)clearTimeout(railTimer.current);if(railFrame.current){cancelAnimationFrame(railFrame.current);railFrame.current=0}}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[railKey,section,drawerState]);
  function save(id:string){setSavedIds(cur=>{const n=new Set(cur);n.add(id);saveSpotIds([...n]);return n})}
  function nextDrawer(dir:number){const order:DrawerState[]=["min","half","full"];commitDrawer(order[Math.max(0,Math.min(2,order.indexOf(drawerState)+dir))])}
  // Drawer morph: record cards and heading before the state class changes;
  // the layout effect below animates them into the new layout in step with
  // the drawer's slide (same duration and curve).
  type CardParts={card:DOMRect;photo:DOMRect|null;copy:DOMRect|null;share:DOMRect|null};
  const drawerMorph=useRef<{from:DrawerState;top:number;ms:number;ease:string;cards:Map<string,CardParts>;title:{el:HTMLElement;rect:DOMRect;font:number}[]}|null>(null);
  function commitDrawer(next:DrawerState,timing:{ms:number;ease:string}={ms:MORPH_MS,ease:EASE}){const panel=panelRef.current;if(next!==drawerState&&panel&&motionOK()&&!window.matchMedia(DESKTOP_QUERY).matches){finishMorphs();const o=panel.getBoundingClientRect(),cards=new Map<string,CardParts>(),part=(c:HTMLElement,sel:string)=>{const el=c.querySelector(sel);return el?relRect(el,o):null};railRef.current?.querySelectorAll<HTMLElement>("[data-spot-id]").forEach((c,i)=>{if(i<14)cards.set(c.dataset.spotId??"",{card:relRect(c,o),photo:part(c,".amc-card-photo"),copy:part(c,".amc-card-copy"),share:part(c,".amc-save-round")})});drawerMorph.current={from:drawerState,top:o.top,...timing,cards,title:[...panel.querySelectorAll<HTMLElement>(".amc-panel-title p,.amc-panel-title :is(h1,h2)")].map(el=>({el,rect:relRect(el,o),font:parseFloat(getComputedStyle(el).fontSize)}))}}setDrawerState(next)}
  useLayoutEffect(()=>{if(drawerState!=="full"&&drawerScrollRef.current)drawerScrollRef.current.scrollTop=0;const m=drawerMorph.current;drawerMorph.current=null;const panel=panelRef.current,app=panel?.parentElement,rail=railRef.current;if(!m||!panel||!app||m.from===drawerState)return;const o=panel.getBoundingClientRect(),timing={duration:m.ms,easing:m.ease};
    m.title.forEach(t=>{if(!t.el.isConnected)return;const now=relRect(t.el,o),s=t.font/parseFloat(getComputedStyle(t.el).fontSize);if(Math.abs(now.left-t.rect.left)<1&&Math.abs(now.top-t.rect.top)<1&&Math.abs(s-1)<.01)return;track(t.el.animate([{transformOrigin:"0 0",transform:`translate(${t.rect.left-now.left}px,${t.rect.top-now.top}px) scale(${s})`},{transformOrigin:"0 0",transform:"none"}],timing))});
    if(m.from==="min"||drawerState==="min"||!rail)return;
    // Cards morph part by part: the card's shell stretches from its old box
    // to its new one, the text and share button slide over crisp (no
    // scaling), and the photo crossfades from a snapshot of its old shape.
    const offs=drawerOffsets(panel),H=panel.offsetHeight,visBefore=H-offs[m.from],visAfter=H-offs[drawerState];
    const anims:Animation[]=[],oldRadius=m.from==="full"?"17px 0 0 17px":"17px 17px 0 0";
    // Read every rect first, then write: interleaving reads with DOM writes
    // would force a layout per card.
    type Job={card:HTMLElement;before:CardParts;after:DOMRect;seenBefore:boolean;cs:{bw:string;color:string;radius:string;bg:string;shadow:string};parts:{el:HTMLElement;from:DOMRect;now:DOMRect}[];photo:{el:HTMLElement;now:DOMRect}|null};
    const jobs:Job[]=[];
    rail.querySelectorAll<HTMLElement>("[data-spot-id]").forEach(card=>{const before=m.cards.get(card.dataset.spotId??"");if(!before||jobs.length>=8)return;const after=relRect(card,o),seenBefore=intersects(before.card,o.width,visBefore);if(!seenBefore&&!intersects(after,o.width,visAfter))return;const c=getComputedStyle(card),parts:Job["parts"]=[];
      ([[".amc-card-copy",before.copy],[".amc-save-round",before.share]] as const).forEach(([sel,from])=>{const el=card.querySelector<HTMLElement>(sel);if(el&&from)parts.push({el,from,now:relRect(el,o)})});
      const ph=card.querySelector<HTMLElement>(".amc-card-photo");
      jobs.push({card,before,after,seenBefore,cs:{bw:c.borderTopWidth,color:c.borderTopColor,radius:c.borderTopLeftRadius,bg:c.backgroundColor,shadow:c.boxShadow},parts,photo:ph&&before.photo?{el:ph,now:relRect(ph,o)}:null})});
    rail.classList.add("is-morphing");
    jobs.forEach(({card,before,after,seenBefore,cs,parts,photo})=>{
      const shell=document.createElement("span");shell.className="amc-morph-shell";Object.assign(shell.style,{inset:`-${cs.bw}`,border:`${cs.bw} solid ${cs.color}`,borderRadius:cs.radius,background:cs.bg,boxShadow:cs.shadow});card.prepend(shell);card.classList.add("is-morphing");
      anims.push(track(shell.animate([{transformOrigin:"0 0",transform:boxTransform(before.card,after)},{transformOrigin:"0 0",transform:"none"}],timing),()=>{shell.remove();card.classList.remove("is-morphing")}));
      parts.forEach(({el,from,now})=>anims.push(track(el.animate([{transform:`translate(${from.left-now.left}px,${from.top-now.top}px)`},{transform:"none"}],timing))));
      if(!photo||!before.photo)return;const old=before.photo,now=photo.now;
      if(!seenBefore){anims.push(track(photo.el.animate([{transformOrigin:"0 0",transform:boxTransform(old,now)},{transformOrigin:"0 0",transform:"none"}],timing)));return}
      // The old photo's snapshot rides inside the card, under the text.
      const bw=parseFloat(cs.bw)||0,g=photo.el.cloneNode(true) as HTMLElement;g.classList.add("amc-morph-photo");g.setAttribute("aria-hidden","true");Object.assign(g.style,{left:`${old.left-after.left-bw}px`,top:`${old.top-after.top-bw}px`,width:`${old.width}px`,borderRadius:oldRadius});g.style.setProperty("height",`${old.height}px`,"important");card.appendChild(g);
      anims.push(track(g.animate([{transformOrigin:"0 0",transform:"none"},{transformOrigin:"0 0",transform:boxTransform(now,old)}],timing),()=>g.remove()),track(g.animate([{opacity:1},{opacity:0}],{duration:m.ms*.55,delay:m.ms*.1,fill:"both"})),track(photo.el.animate([{opacity:0},{opacity:1}],{duration:m.ms*.5,delay:m.ms*.2,fill:"backwards"})))});
    whenDone(anims,()=>rail.classList.remove("is-morphing"));
  },[drawerState]);
  // Filter changes: cards that stay slide to their new spot, new ones fade
  // in, removed ones fade out where they were.
  const listMorph=useRef<Map<string,{rect:DOMRect;el:HTMLElement}>|null>(null);
  function morphList(change:()=>void){const panel=panelRef.current;if(panel&&motionOK()&&!window.matchMedia(DESKTOP_QUERY).matches&&drawerState!=="min"){finishMorphs();const o=panel.getBoundingClientRect(),m=new Map<string,{rect:DOMRect;el:HTMLElement}>();railRef.current?.querySelectorAll<HTMLElement>("[data-spot-id]").forEach((el,i)=>{if(i<14)m.set(el.dataset.spotId??"",{rect:relRect(el,o),el})});listMorph.current=m;requestAnimationFrame(()=>{listMorph.current=null})}change()}
  useLayoutEffect(()=>{const m=listMorph.current;listMorph.current=null;const panel=panelRef.current,app=panel?.parentElement;if(!m||!panel||!app)return;const o=panel.getBoundingClientRect(),vis=panel.offsetHeight-drawerOffsets(panel)[drawerState],seen=new Set<string>(),anims:Animation[]=[];let n=0;
    railRef.current?.querySelectorAll<HTMLElement>("[data-spot-id]").forEach(card=>{const id=card.dataset.spotId??"";seen.add(id);const now=relRect(card,o);if(n>=10||!intersects(now,o.width,vis))return;n++;const was=m.get(id);
      anims.push(track(was&&intersects(was.rect,o.width,vis)?card.animate([{transform:`translate(${was.rect.left-now.left}px,${was.rect.top-now.top}px)`},{transform:"none"}],{duration:360,easing:EASE}):card.animate([{opacity:0,transform:"scale(.92)"},{opacity:1,transform:"none"}],{duration:300,delay:80+Math.min(n,4)*30,easing:EASE,fill:"backwards"})))});
    const layer=ghostLayer(app,`amc-discovery-panel state-${drawerState}`);
    m.forEach(({rect,el},id)=>{if(seen.has(id)||!intersects(rect,o.width,vis))return;const g=ghostOf(el,new DOMRect(o.left+rect.left,o.top+rect.top,rect.width,rect.height),layer);anims.push(track(g.animate([{opacity:1,transform:"none"},{opacity:0,transform:"scale(.92)"}],{duration:140,easing:"ease-in",fill:"forwards"})))});
    whenDone(anims,()=>layer.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[activeCategory,maxDistanceKm]);
  // Tabs: the new tab's content fades up and the active pill slides across.
  const navFrom=useRef<DOMRect|null>(null),firstSection=useRef(true);
  function changeSection(next:AppSection){if(selectedSpot)closeSheet(false);if(next!==section&&motionOK()){finishMorphs();navFrom.current=document.querySelector(".amc-bottom-nav .is-active")?.getBoundingClientRect()??null}setSection(next)}
  useLayoutEffect(()=>{if(firstSection.current){firstSection.current=false;return}const from=navFrom.current;navFrom.current=null;if(!motionOK())return;
    (section==="explore"?[".amc-discovery-panel",".amc-location-float"]:[section==="surprise"?".amc-surprise":".amc-account-view"]).forEach(sel=>{const el=document.querySelector<HTMLElement>(sel);if(el)track(el.animate(section==="explore"?[{opacity:0},{opacity:1}]:[{opacity:0,transform:"translateY(14px)"},{opacity:1,transform:"none"}],{duration:260,easing:EASE}))});
    const nav=document.querySelector<HTMLElement>(".amc-bottom-nav"),to=nav?.querySelector<HTMLElement>(".is-active");if(!from||!nav||!to)return;const nr=nav.getBoundingClientRect(),t=to.getBoundingClientRect(),cs=getComputedStyle(to),pill=document.createElement("span");pill.className="amc-nav-pill";Object.assign(pill.style,{left:`${t.left-nr.left-nav.clientLeft}px`,top:`${t.top-nr.top-nav.clientTop}px`,width:`${t.width}px`,height:`${t.height}px`,borderRadius:cs.borderRadius,background:cs.backgroundColor,border:`${cs.borderTopWidth} solid ${cs.borderTopColor}`});nav.appendChild(pill);nav.classList.add("is-sliding");
    track(pill.animate([{transformOrigin:"0 0",transform:boxTransform(from,t)},{transformOrigin:"0 0",transform:"none"}],{duration:380,easing:EASE}),()=>{pill.remove();nav.classList.remove("is-sliding")});
  },[section]);
  useEffect(()=>{if(!mapReady||!initialSpot||!window.matchMedia(DESKTOP_QUERY).matches)return;const desktopPad=Math.min(760,window.innerWidth*.56)+80;mapRef.current?.easeTo({center:[initialSpot.lng,initialSpot.lat],zoom:12,padding:{top:60,bottom:60,left:60,right:desktopPad},duration:0})},[mapReady,initialSpot]);
useEffect(()=>{const mq=window.matchMedia(DESKTOP_QUERY);const sync=()=>{if(mq.matches)setDrawerState("half")};sync();mq.addEventListener("change",sync);return()=>mq.removeEventListener("change",sync)},[]);
  // Drawer gestures (mobile). min/half: any vertical drag moves the sheet,
  // horizontal drags scroll the chips and card rail natively. full: the list
  // scrolls natively; the handle, or a pull-down with the list at its top,
  // moves the sheet. CSS touch-action keeps the browser out of the sheet's
  // way in min/half; in full, touchmove below holds it off a top pull-down.
  function claimDrawer(panel:HTMLElement,pointerId:number){panel.style.removeProperty("transition");const t=getComputedStyle(panel).transform;drawerStartOffset.current=t&&t!=="none"?new DOMMatrix(t).m42:0;panel.style.transform=`translate3d(0,${drawerStartOffset.current}px,0)`;panel.classList.add("is-dragging");panel.setPointerCapture(pointerId);drawerGesture.current="drawer";drawerMoved.current=true}
  function onDrawerPointerDown(e:ReactPointerEvent<HTMLElement>){if(window.matchMedia(DESKTOP_QUERY).matches)return;finishMorphs();if(e.pointerType==="mouse"&&e.button!==0)return;drawerStartY.current=e.clientY;drawerStartX.current=e.clientX;drawerLastY.current=e.clientY;drawerLastTime.current=e.timeStamp;drawerVelocity.current=0;drawerMoved.current=false;drawerHeld.current=false;drawerFromHandle.current=!!(e.target as HTMLElement).closest("[data-drawer-handle]");drawerGesture.current="pending"}
  function onDrawerPointerMove(e:ReactPointerEvent<HTMLElement>){if(drawerStartY.current===null)return;const panel=e.currentTarget,dy=e.clientY-drawerStartY.current,dx=e.clientX-drawerStartX.current;if(drawerGesture.current==="pending"){if(Math.max(Math.abs(dx),Math.abs(dy))<=7)return;const atTop=(drawerScrollRef.current?.scrollTop??0)<=0;const sheetOwns=drawerHeld.current||(Math.abs(dy)>Math.abs(dx)&&(drawerState!=="full"||drawerFromHandle.current||(dy>0&&atTop)));if(!sheetOwns){drawerGesture.current="content";drawerStartY.current=null;return}claimDrawer(panel,e.pointerId)}if(drawerGesture.current!=="drawer")return;drawerTargetOffset.current=Math.max(0,Math.min(drawerOffsets(panel).min,drawerStartOffset.current+dy));const dt=e.timeStamp-drawerLastTime.current;if(dt>0)drawerVelocity.current=.8*((e.clientY-drawerLastY.current)/dt)+.2*drawerVelocity.current;drawerLastY.current=e.clientY;drawerLastTime.current=e.timeStamp;if(!drawerFrame.current)drawerFrame.current=requestAnimationFrame(()=>{drawerFrame.current=0;panel.style.transform=`translate3d(0,${drawerTargetOffset.current}px,0)`})}
  // Release: the snap starts at the finger's speed. Duration comes from the
  // distance left and the release velocity, and the curve's initial slope
  // matches that velocity, so a hard flick flies and a gentle release eases.
  const snapToken=useRef(0);
  function onDrawerPointerEnd(e:ReactPointerEvent<HTMLElement>){const panel=e.currentTarget;if(drawerFrame.current){cancelAnimationFrame(drawerFrame.current);drawerFrame.current=0}if(drawerGesture.current==="drawer"){const velocity=e.timeStamp-drawerLastTime.current>80?0:drawerVelocity.current,offsets=drawerOffsets(panel),at=drawerTargetOffset.current,next=snapDrawer(offsets,at,velocity),dist=Math.abs(offsets[next]-at),toward=dist<1?0:velocity*Math.sign(offsets[next]-at);
      const ms=Math.round(toward>.3?Math.min(460,Math.max(200,2.4*dist/toward)):Math.min(460,Math.max(280,260+dist*.4))),y1=dist<1?0:Math.min(1,Math.max(0,toward*ms/dist*.2)),ease=`cubic-bezier(.2,${y1.toFixed(3)},.3,1)`;
      panel.style.transition=`transform ${ms}ms ${ease}`;const token=++snapToken.current;setTimeout(()=>{if(snapToken.current===token)panel.style.removeProperty("transition")},ms+80);
      commitDrawer(next,{ms,ease});panel.classList.remove("is-dragging");panel.style.removeProperty("transform")}drawerStartY.current=null;drawerGesture.current="pending";drawerHeld.current=false}
  useEffect(()=>{const panel=panelRef.current;if(!panel)return;const onTouchMove=(e:TouchEvent)=>{if(drawerGesture.current==="drawer"){if(e.cancelable)e.preventDefault();return}if(drawerGesture.current!=="pending"||drawerStartY.current===null||!panel.classList.contains("state-full"))return;const t=e.touches[0],dy=t.clientY-drawerStartY.current,dx=t.clientX-drawerStartX.current;if(dy>0&&dy>=Math.abs(dx)&&(drawerScrollRef.current?.scrollTop??0)<=0&&e.cancelable){e.preventDefault();drawerHeld.current=true}};panel.addEventListener("touchmove",onTouchMove,{passive:false});return()=>panel.removeEventListener("touchmove",onTouchMove)},[section])
  return <div className={`amc-app section-${section}${selectedSpot?" has-sheet":""}`}><div className="amc-map" ref={containerRef}/>{section==="explore"&&!mapReady&&!mapFailed&&<div className="amc-map-loading amc-static-map"/>}{section==="explore"&&mapFailed&&<div className="amc-map-failed" role="status">Map unavailable, list still works</div>}<TopBar showSearch={section==="explore"} search={search} onSearch={value=>{setSearch(value);setCardLimit(12)}}/>{section==="explore"&&<>{gate&&!gateDismissed&&<GeoGateBanner city={gate.city} onDismiss={()=>setGateDismissed(true)} onNotify={()=>setGateDismissed(true)}/>}<div className="amc-location-float"><LocationPicker label={locationLabel} confirmed={locationConfirmed} onPick={handlePickCity} onUseGps={handleNearMe} locatingGps={locating} open={pickerOpen} onOpenChange={o=>{setPickerOpen(o);if(!o)setGpsError(null)}} error={gpsError}/></div><aside ref={panelRef} className={`amc-discovery-panel state-${drawerState}`} onClickCapture={e=>{if(drawerMoved.current){e.preventDefault();e.stopPropagation();drawerMoved.current=false}}} onPointerDown={onDrawerPointerDown} onPointerMove={onDrawerPointerMove} onPointerUp={onDrawerPointerEnd} onPointerCancel={onDrawerPointerEnd}><button className="amc-drawer-grab" data-drawer-handle aria-label={`Drawer ${drawerState}. Drag to resize`} onClick={()=>{if(!drawerMoved.current)nextDrawer(drawerState==="full"?-1:1);drawerMoved.current=false}}><span/></button><div className="amc-drawer-scroll" ref={drawerScrollRef} onScroll={e=>{if(!window.matchMedia(DESKTOP_QUERY).matches&&drawerState!=="full")return;const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-700)setCardLimit(limit=>Math.min(visible.length,limit+12))}}><div className="amc-panel-title"><div><p>NEAR {locationLabel.toUpperCase()}</p><PanelHeading asH2={!!selectedSpot}>{loadStatus==="error"&&spots.length===0?"Monday won this round.":spots.length===0?"Finding places":visible.length+" places to forget Monday exists"}</PanelHeading></div></div><div className="amc-drawer-body" inert={drawerState==="min"}><CategoryChips active={activeCategory} onChange={value=>morphList(()=>{setActiveCategory(value);setCardLimit(12)})} maxDistanceKm={maxDistanceKm} onDistanceChange={value=>morphList(()=>{setMaxDistanceKm(value);setCardLimit(12)})}/><div className="amc-results-label"><span><strong>PLACES BETTER THAN MONDAY</strong><small>within {maxDistanceKm} km</small></span></div><div className="amc-card-list" ref={railRef} onScroll={e=>{const rail=e.currentTarget;scheduleRailSettle();if(rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-460)setCardLimit(limit=>Math.min(visible.length,limit+12))}}>{loadStatus==="error"&&spots.length===0?<div className="amc-load-error" role="alert"><p>Couldn&apos;t load places.</p><button type="button" onClick={()=>loadSpots()}>Retry</button></div>:spots.length===0?[0,1].map(i=><div key={i} className="amc-spot-card amc-card-skeleton"><i/><b/><span/></div>):visible.slice(0,cardLimit).map(s=><SpotCard key={s.id} spot={s} distance={cardInfo.get(s.id)?.distance??0} drive={cardInfo.get(s.id)?.drive} slug={slugById.get(s.id)} onFocus={onCardFocus} onTouchIntent={onCardIntent} onOpen={onCardOpen}/>)}</div></div></div></aside></>}{section==="surprise"&&<SurpriseMe spots={spots} origin={origin} originName={originName} onOpen={openSpot}/>} {section==="account"&&<AccountView spots={spots} saved={savedIds} distanceFor={distanceFor} slugFor={s=>slugById.get(s.id)} onFocus={focusSpot} onOpen={openSpot}/>} {selectedSpot&&<SpotSheet spot={selectedSpot} onClose={closeSheet} shareUrl={`${typeof window!=="undefined"?window.location.origin:"https://antimondayclub.com"}/${selectedSpot.category}/${slugById.get(selectedSpot.id)??""}`}/>} <BottomNav active={section} onChange={changeSection}/></div>;
}
