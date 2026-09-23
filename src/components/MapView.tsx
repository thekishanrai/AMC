"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import BottomNav,{type AppSection} from "./BottomNav";import SpotCard from "./SpotCard";import SurpriseMe from "./SurpriseMe";import AccountView from "./AccountView";import{loadSavedSpotIds,saveSpotIds}from"@/lib/savedSpots";


const CENTER: [number, number] = [73.55, 18.75];
// Desktop: the list panel is always open beside the map; no drawer states.
const DESKTOP_QUERY = "(min-width: 1024px)";
// Below this zoom, pins collapse to name-only (no stats row) so a full
// region of spots stays browsable instead of turning into a wall of pills.
const DETAIL_ZOOM_THRESHOLD = 10.5;

// On spot pages the spot name is the page h1 (in the sheet), so the list
// heading steps down to h2 while a sheet is open.
function PanelHeading({ asH2, children }: { asH2: boolean; children: ReactNode }) { return asH2 ? <h2>{children}</h2> : <h1>{children}</h1>; }

export default function MapView({ initialSpot = null, initialSpots = [] }: { initialSpot?: Spot | null; initialSpots?: Spot[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl")["default"] | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
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
  const[drawerState,setDrawerState]=useState<"min"|"half"|"full">("half");const drawerStartY=useRef<number|null>(null),drawerStartX=useRef(0),drawerStartHeight=useRef(0),drawerStartTime=useRef(0),drawerLastY=useRef(0),drawerLastTime=useRef(0),drawerMoved=useRef(false),drawerGesture=useRef<"pending"|"drawer"|"content">("pending");
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

  function closeSheet() {
    setSelectedSpot(null);
    if (pushedSpot.current) { pushedSpot.current = false; window.history.back(); }
    else if (window.location.pathname !== "/" || window.location.search) window.history.replaceState(window.history.state, "", "/");
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
    const detailed = map.getZoom() >= DETAIL_ZOOM_THRESHOLD;
    // Zoomed out, names collide: show dots and let the list carry the names.
    containerRef.current?.classList.toggle("amc-pins-compact", map.getZoom() < 10.5);
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
  const originName=locationLabel&&!["Locating…","Mumbai-Pune","your area"].includes(locationLabel)?locationLabel:"";function driveFor(s:Spot){return driveFrom(s,origin,originName)}
  const visible=spots.filter(s=>(activeCategory==="all"||s.category===activeCategory)&&distanceFor(s)<=maxDistanceKm&&(!search||`${s.name} ${s.region??""}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>distanceFor(a)-distanceFor(b));
  function focusSpot(s:Spot,withSheet=false,ease=false){const desktop=typeof window!=="undefined"&&window.matchMedia(DESKTOP_QUERY).matches;const panel=desktop?Math.min(withSheet?760:440,window.innerWidth*(withSheet?.56:.4))+40:0;const opts={center:[s.lng,s.lat] as [number,number],zoom:11.8,padding:desktop?{top:60,bottom:60,left:60,right:panel+40}:{bottom:drawerState==="min"?90:320,top:80,left:0,right:0}};if(ease)mapRef.current?.easeTo({...opts,duration:400});else mapRef.current?.flyTo(opts)}
  function openSpot(s:Spot){selectSpot(s);pushSpotUrl(s);focusSpot(s,true)}
  // Card rail: an IntersectionObserver tracks which cards are mostly visible;
  // the map moves once, after scrolling settles, and only if the leading card
  // changed. No layout reads per scroll event, no map jitter mid-swipe.
  const railRatios=useRef<Map<string,number>>(new Map());const railTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function settleRail(){railTimer.current=null;const rail=railRef.current;if(!rail)return;const ids=[...rail.querySelectorAll<HTMLElement>("[data-spot-id]")].map(c=>c.dataset.spotId??"");const id=ids.find(i=>(railRatios.current.get(i)??0)>=0.6);if(!id||id===lastFocused.current)return;lastFocused.current=id;const s=spotsRef.current.find(x=>x.id===id);if(s){focusSpot(s,false,true);prefetchDetail(s.id)}}
  function scheduleRailSettle(){if(railTimer.current)clearTimeout(railTimer.current);railTimer.current=setTimeout(settleRail,150)}
  const firstVisibleId=visible[0]?.id??null;const railKey=visible.slice(0,cardLimit).map(s=>s.id).join(",");
  // The card showing on load (or after a filter change) is the starting focus.
  useEffect(()=>{lastFocused.current=firstVisibleId},[firstVisibleId]);
  useEffect(()=>{const rail=railRef.current;if(!rail||section!=="explore"||window.matchMedia(DESKTOP_QUERY).matches)return;const io=new IntersectionObserver(es=>{es.forEach(e=>railRatios.current.set((e.target as HTMLElement).dataset.spotId??"",e.intersectionRatio));scheduleRailSettle()},{root:rail,threshold:[0,0.6,1]});rail.querySelectorAll("[data-spot-id]").forEach(c=>io.observe(c));const onEnd=()=>{if(railTimer.current)clearTimeout(railTimer.current);settleRail()};rail.addEventListener("scrollend",onEnd);return()=>{io.disconnect();rail.removeEventListener("scrollend",onEnd);if(railTimer.current)clearTimeout(railTimer.current)}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[railKey,section,drawerState]);
  function save(id:string){setSavedIds(cur=>{const n=new Set(cur);n.add(id);saveSpotIds([...n]);return n})}
  function nextDrawer(dir:number){setDrawerState(v=>{const states:["min","half","full"]=["min","half","full"];return states[Math.max(0,Math.min(2,states.indexOf(v)+dir))]})}
  useEffect(()=>{if(!mapReady||!initialSpot||!window.matchMedia(DESKTOP_QUERY).matches)return;const desktopPad=Math.min(760,window.innerWidth*.56)+80;mapRef.current?.easeTo({center:[initialSpot.lng,initialSpot.lat],zoom:12,padding:{top:60,bottom:60,left:60,right:desktopPad},duration:0})},[mapReady,initialSpot]);
useEffect(()=>{const mq=window.matchMedia(DESKTOP_QUERY);const sync=()=>{if(mq.matches)setDrawerState("half")};sync();mq.addEventListener("change",sync);return()=>mq.removeEventListener("change",sync)},[]);
useEffect(()=>{if(section!=="explore"||drawerState==="min")return;const frame=requestAnimationFrame(()=>{const panel=document.querySelector<HTMLElement>(".amc-discovery-panel"),scroll=panel?.querySelector<HTMLElement>(".amc-drawer-scroll"),card=panel?.querySelector<HTMLElement>(".amc-spot-card");if(!panel||!scroll||!card)return;const top=card.offsetTop,styles=getComputedStyle(card),cardHeight=card.offsetHeight+parseFloat(styles.marginBottom||"0"),navClearance=78,handleHeight=44,padding=24;panel.style.setProperty("--amc-default-drawer-height",`${Math.ceil(handleHeight+top+cardHeight+padding+navClearance)}px`) });return()=>cancelAnimationFrame(frame)},[section,drawerState,spots.length,visible.length,maxDistanceKm,activeCategory])
  useEffect(()=>{if(drawerState!=="half")return;const scroll=document.querySelector<HTMLElement>(".amc-discovery-panel .amc-drawer-scroll");if(scroll)scroll.scrollTop=0},[drawerState])
  return <div className={`amc-app section-${section}${selectedSpot?" has-sheet":""}`}><div className="amc-map" ref={containerRef}/>{section==="explore"&&!mapReady&&!mapFailed&&<div className="amc-map-loading amc-static-map"/>}{section==="explore"&&mapFailed&&<div className="amc-map-failed" role="status">Map unavailable, list still works</div>}<TopBar showSearch={section==="explore"} search={search} onSearch={value=>{setSearch(value);setCardLimit(12)}}/>{section==="explore"&&<>{gate&&!gateDismissed&&<GeoGateBanner city={gate.city} onDismiss={()=>setGateDismissed(true)} onNotify={()=>setGateDismissed(true)}/>}<div className="amc-location-float"><LocationPicker label={locationLabel} confirmed={locationConfirmed} onPick={handlePickCity} onUseGps={handleNearMe} locatingGps={locating} open={pickerOpen} onOpenChange={o=>{setPickerOpen(o);if(!o)setGpsError(null)}} error={gpsError}/></div><aside className={`amc-discovery-panel state-${drawerState}`} onClickCapture={e=>{if(drawerMoved.current){e.preventDefault();e.stopPropagation();drawerMoved.current=false}}} onPointerDown={e=>{if(window.matchMedia(DESKTOP_QUERY).matches)return;if((e.target as HTMLElement).closest(".amc-card-list"))return;if(e.pointerType==="mouse"&&e.button!==0)return;drawerStartY.current=e.clientY;drawerStartX.current=e.clientX;drawerStartTime.current=performance.now();drawerLastY.current=e.clientY;drawerLastTime.current=drawerStartTime.current;drawerMoved.current=false;drawerGesture.current="pending"}} onPointerMove={e=>{if(drawerStartY.current===null)return;const panel=e.currentTarget,dy=e.clientY-drawerStartY.current,dx=e.clientX-drawerStartX.current;if(drawerGesture.current==="pending"&&Math.max(Math.abs(dx),Math.abs(dy))>7){if(Math.abs(dx)>Math.abs(dy)){drawerGesture.current="content";drawerStartY.current=null;return}drawerStartHeight.current=panel.getBoundingClientRect().height;drawerGesture.current="drawer";drawerMoved.current=true;panel.setPointerCapture(e.pointerId);panel.classList.add("is-dragging")}if(drawerGesture.current!=="drawer")return;const min=169,max=window.innerHeight-66;panel.style.setProperty("height",`${Math.max(min,Math.min(max,drawerStartHeight.current-dy))}px`);drawerLastY.current=e.clientY;drawerLastTime.current=performance.now()}} onPointerUp={e=>{const panel=e.currentTarget;if(drawerStartY.current!==null&&drawerGesture.current==="drawer"){const d=e.clientY-drawerStartY.current,elapsed=Math.max(1,performance.now()-drawerLastTime.current),velocity=(e.clientY-drawerLastY.current)/elapsed;if(d< -30||velocity<-.35)nextDrawer(1);else if(d>30||velocity>.35)nextDrawer(-1)}drawerStartY.current=null;drawerGesture.current="pending";panel.classList.remove("is-dragging");panel.style.removeProperty("height")}} onPointerCancel={e=>{drawerStartY.current=null;drawerGesture.current="pending";e.currentTarget.classList.remove("is-dragging");e.currentTarget.style.removeProperty("height")}}><button className="amc-drawer-grab" data-drawer-handle aria-label={`Drawer ${drawerState}. Drag to resize`} onClick={()=>{if(!drawerMoved.current)nextDrawer(drawerState==="full"?-1:1);drawerMoved.current=false}}><span/></button><div className="amc-drawer-scroll" onScroll={e=>{if(!window.matchMedia(DESKTOP_QUERY).matches&&drawerState!=="full")return;const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-700)setCardLimit(limit=>Math.min(visible.length,limit+12))}}><div className="amc-panel-title"><div><p>NEAR {locationLabel.toUpperCase()}</p><PanelHeading asH2={!!selectedSpot}>{loadStatus==="error"&&spots.length===0?"Monday won this round.":spots.length===0?"Finding places":visible.length+" places to forget Monday exists"}</PanelHeading></div></div>{drawerState!=="min"&&<><CategoryChips active={activeCategory} onChange={value=>{setActiveCategory(value);setCardLimit(12)}} maxDistanceKm={maxDistanceKm} onDistanceChange={value=>{setMaxDistanceKm(value);setCardLimit(12)}}/><div className="amc-results-label"><span><strong>PLACES BETTER THAN MONDAY</strong><small>within {maxDistanceKm} km</small></span></div><div className="amc-card-list" onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onPointerCancel={e=>e.stopPropagation()} ref={railRef} onScroll={e=>{const rail=e.currentTarget;scheduleRailSettle();if(rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-460)setCardLimit(limit=>Math.min(visible.length,limit+12))}}>{loadStatus==="error"&&spots.length===0?<div className="amc-load-error" role="alert"><p>Couldn&apos;t load places.</p><button type="button" onClick={()=>loadSpots()}>Retry</button></div>:spots.length===0?[0,1].map(i=><div key={i} className="amc-spot-card amc-card-skeleton"><i/><b/><span/></div>):visible.slice(0,cardLimit).map(s=><SpotCard key={s.id} spot={s} distance={distanceFor(s)} drive={driveFor(s)} slug={slugById.get(s.id)} onFocus={()=>{focusSpot(s);prefetchDetail(s.id)}} onOpen={()=>openSpot(s)}/>)}</div></>}</div></aside></>}{section==="surprise"&&<SurpriseMe spots={spots} origin={origin} originName={originName} onOpen={openSpot}/>} {section==="account"&&<AccountView spots={spots} saved={savedIds} distanceFor={distanceFor} slugFor={s=>slugById.get(s.id)} onFocus={focusSpot} onOpen={openSpot}/>} {selectedSpot&&<SpotSheet spot={selectedSpot} onClose={closeSheet} shareUrl={`${typeof window!=="undefined"?window.location.origin:"https://antimondayclub.com"}/${selectedSpot.category}/${slugById.get(selectedSpot.id)??""}`}/>} <BottomNav active={section} onChange={next=>{if(selectedSpot)closeSheet();setSection(next)}}/></div>;
}
