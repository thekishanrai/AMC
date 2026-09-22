"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { supabase } from "@/lib/supabase";
import { getGpsLocation, getIpLocation, haversineKm, isInMaharashtra } from "@/lib/geo";
import { loadSavedLocation, saveLocation, type QuickCity } from "@/lib/locationOverride";
import { buildSlugMap } from "@/lib/slug";
import type { Category, Spot } from "@/types";
import TopBar from "./TopBar";
import CategoryChips, { DEFAULT_DISTANCE_KM } from "./CategoryChips";
import LocationPicker from "./LocationPicker";
import SpotSheet from "./SpotSheet";
import GeoGateBanner from "./GeoGateBanner";
import BottomNav,{type AppSection} from "./BottomNav";import SpotCard from "./SpotCard";import SurpriseMe from "./SurpriseMe";import AccountView from "./AccountView";import{loadSavedSpotIds,saveSpotIds}from"@/lib/savedSpots";


const CENTER: [number, number] = [73.55, 18.75];
// Below this zoom, pins collapse to name-only (no stats row) so a full
// region of spots stays browsable instead of turning into a wall of pills.
const DETAIL_ZOOM_THRESHOLD = 10.5;

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl")["default"] | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(() => {
    const saved = loadSavedLocation();
    return saved ? { center: [saved.lng, saved.lat], zoom: 11 } : { center: CENTER, zoom: 8 };
  });
  const [spots, setSpots] = useState<Spot[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [maxDistanceKm, setMaxDistanceKm] = useState(DEFAULT_DISTANCE_KM);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [locating, setLocating] = useState(false);
  const [gate, setGate] = useState<{ city: string | null } | null>(() => {
    const saved = loadSavedLocation();
    return saved && !isInMaharashtra(saved.lat, saved.lng) ? { city: saved.label } : null;
  });
  const [gateDismissed, setGateDismissed] = useState(false);
  const [locationLabel, setLocationLabel] = useState(() => loadSavedLocation()?.label ?? "Locating…");
  const [locationConfirmed, setLocationConfirmed] = useState(() => loadSavedLocation() != null);
  const[section,setSection]=useState<AppSection>("explore"),[search,setSearch]=useState("");
  const[drawerState,setDrawerState]=useState<"min"|"half"|"full">("half");const drawerStartY=useRef<number|null>(null),drawerMoved=useRef(false);
  const[savedIds,setSavedIds]=useState<Set<string>>(()=>new Set(loadSavedSpotIds()));

  const slugById = useMemo(() => buildSlugMap(spots), [spots]);

  function closeSheet() {
    setSelectedSpot(null);
    window.history.pushState(null, "", "/");
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
    setInitialView({ center: [lng, lat], zoom: 11 });
    setLocationLabel(label);
    if (opts?.persist) {
      saveLocation({ lat, lng, label });
      setLocationConfirmed(true);
    }
    if (!isInMaharashtra(lat, lng)) {
      setGate({ city: label });
      setGateDismissed(false);
    } else {
      setGate(null);
    }
    const map = mapRef.current;
    if (map) map.flyTo({ center: [lng, lat], zoom: 11 });
    if (opts?.pin) drawUserPin(lat, lng);
  }

  function handlePickCity(city: QuickCity) {
    applyLocation(city.lat, city.lng, city.name, { persist: true });
  }

  function updatePinDetailVisibility() {
    const map = mapRef.current;
    if (!map) return;
    const detailed = map.getZoom() >= DETAIL_ZOOM_THRESHOLD;
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
    if (loadSavedLocation()) return;

    let cancelled = false;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));

    Promise.race([getIpLocation(), timeout]).then((loc) => {
      if (cancelled) return;
      if (loc) {
        setInitialView({ center: [loc.lng, loc.lat], zoom: 11 });
        setLocationLabel(loc.city ?? "your area");
        if (!isInMaharashtra(loc.lat, loc.lng)) setGate({ city: loc.city });
      } else {
        setInitialView({ center: CENTER, zoom: 8 });
        setLocationLabel("Mumbai-Pune");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // init map once we know where to open it
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !initialView) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let map: mapboxgl.Map | null = null;
    const start = async () => {
      // Let the shell, location state and drawer paint before loading Mapbox.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const mapbox = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapbox.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      mapboxRef.current = mapbox;
      map = new mapbox.Map({container:containerRef.current,style:"mapbox://styles/mapbox/outdoors-v12",center:initialView.center,zoom:initialView.zoom,attributionControl:false});
      map.on("load", () => setMapReady(true));
      map.on("zoom", updatePinDetailVisibility);
      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map?.resize());
      resizeObserver.observe(containerRef.current);
    };
    start();
    return () => {cancelled=true;resizeObserver?.disconnect();map?.remove();mapRef.current=null;mapboxRef.current=null};
  }, [initialView]);

  // fetch spots once
  useEffect(() => {
    supabase
      .from("spots")
      .select("*")
      .eq("status", "published")
      .then(({ data, error }) => {
        if (!error && data) setSpots(data as Spot[]);
      });
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
    setSelectedSpot(spot);
    map.flyTo({ center: [spot.lng, spot.lat], zoom: 13, padding: { bottom: 280, top: 0, left: 0, right: 0 } });
  }, [spots, mapReady, slugById]);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !initialView) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const [userLng, userLat] = initialView.center;
    const filtered = spots.filter((s) => {
      if (activeCategory !== "all" && s.category !== activeCategory) return false;
      if(search&&!`${s.name} ${s.region??""}`.toLowerCase().includes(search.toLowerCase()))return false;
      // Distance from the visitor's detected location personalizes results, but
      // a bad/generic geolocation (VPN, unresolvable IP, edge fallback) must
      // never hide every spot — falling back to the fixed Mumbai/Pune anchors
      // guarantees the core Sahyadri set stays visible either way.
      const distanceKm = Math.min(
        haversineKm(userLat, userLng, s.lat, s.lng),
        s.distance_from_mumbai_km ?? Infinity,
        s.distance_from_pune_km ?? Infinity
      );
      return distanceKm <= maxDistanceKm;
    });

    filtered.forEach((spot) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "amc-map-name-label";
      el.textContent = spot.name;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedSpot(spot);
        map.flyTo({ center: [spot.lng, spot.lat], zoom: 13, padding: { bottom: 280, top: 0, left: 0, right: 0 } });
        const slug = slugById.get(spot.id);
        if (slug) window.history.pushState(null, "", `/${spot.category}/${slug}`);
      });

      const mapbox = mapboxRef.current;
      if (!mapbox) return;
      const marker = new mapbox.Marker({ element: el, anchor: "bottom" })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [spots, activeCategory, maxDistanceKm, mapReady, initialView, slugById,search]);

  async function handleNearMe() {
    setLocating(true);
    const loc = await getGpsLocation();
    const resolved = loc ?? (await getIpLocation());
    setLocating(false);
    if (!resolved) return;

    // Only a real GPS fix is trustworthy enough to save as "this is where I
    // am" — an IP fallback here is still just a guess, so it isn't persisted.
    applyLocation(resolved.lat, resolved.lng, resolved.city ?? "Your location", {
      persist: loc != null,
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

  function distanceFor(s:Spot){if(!initialView)return s.distance_from_mumbai_km??Infinity;const[lng,lat]=initialView.center;return Math.min(haversineKm(lat,lng,s.lat,s.lng),s.distance_from_mumbai_km??Infinity,s.distance_from_pune_km??Infinity)}
  const visible=spots.filter(s=>(activeCategory==="all"||s.category===activeCategory)&&distanceFor(s)<=maxDistanceKm&&(!search||`${s.name} ${s.region??""}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>distanceFor(a)-distanceFor(b));
  function focusSpot(s:Spot){mapRef.current?.flyTo({center:[s.lng,s.lat],zoom:11.8,padding:{bottom:drawerState==="min"?90:320,top:80,left:0,right:0}})}
  function openSpot(s:Spot){setSelectedSpot(s);const slug=slugById.get(s.id);if(slug)history.pushState(null,"",`/${s.category}/${slug}`);focusSpot(s)}
  function save(id:string){setSavedIds(cur=>{const n=new Set(cur);n.add(id);saveSpotIds([...n]);return n})}
  function nextDrawer(dir:number){setDrawerState(v=>{const states:["min","half","full"]=["min","half","full"];return states[Math.max(0,Math.min(2,states.indexOf(v)+dir))]})}
  return <div className={`amc-app section-${section}`}><div className="amc-map" ref={containerRef}/>{section==="explore"&&!mapReady&&<div className="amc-map-loading amc-map-skeleton"/>}<TopBar search={search} onSearch={setSearch}/>{section==="explore"&&<>{gate&&!gateDismissed&&<GeoGateBanner city={gate.city} onDismiss={()=>setGateDismissed(true)} onNotify={()=>setGateDismissed(true)}/>}<div className="amc-location-float"><LocationPicker label={locationLabel} confirmed={locationConfirmed} onPick={handlePickCity} onUseGps={handleNearMe} locatingGps={locating}/></div><aside className={`amc-discovery-panel state-${drawerState}`}><button className="amc-drawer-grab" aria-label={`Drawer ${drawerState}`} onClick={()=>{if(!drawerMoved.current)nextDrawer(drawerState==="full"?-1:1);drawerMoved.current=false}} onPointerDown={e=>{drawerStartY.current=e.clientY;drawerMoved.current=false;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drawerStartY.current!==null&&Math.abs(e.clientY-drawerStartY.current)>12)drawerMoved.current=true}} onPointerUp={e=>{if(drawerStartY.current!==null){const d=e.clientY-drawerStartY.current;if(d< -35)nextDrawer(1);else if(d>35)nextDrawer(-1)}drawerStartY.current=null}}><span/></button><div className="amc-drawer-scroll"><div className="amc-panel-title"><div><p>NEAR {locationLabel.toUpperCase()}</p><h1>{spots.length===0?"Finding spots":visible.length+" spots better than Monday"} <span>· {maxDistanceKm} km</span></h1></div></div>{drawerState!=="min"&&<><CategoryChips active={activeCategory} onChange={setActiveCategory} maxDistanceKm={maxDistanceKm} onDistanceChange={setMaxDistanceKm}/><div className="amc-results-label"><span>ALL WITHIN {maxDistanceKm} KM</span><span>NEAREST FIRST ↓</span></div><div className="amc-card-list" onScroll={e=>{const box=(e.currentTarget as HTMLElement).getBoundingClientRect();const cards=[...e.currentTarget.querySelectorAll<HTMLElement>("[data-spot-id]")];const best=cards.sort((a,b)=>Math.abs(a.getBoundingClientRect().left-box.left)-Math.abs(b.getBoundingClientRect().left-box.left))[0];const spot=visible.find(s=>s.id===best?.dataset.spotId);if(spot)focusSpot(spot)}}>{spots.length===0?[0,1].map(i=><div key={i} className="amc-spot-card amc-card-skeleton"><i/><b/><span/></div>):visible.map(s=><SpotCard key={s.id} spot={s} distance={distanceFor(s)} slug={slugById.get(s.id)} onFocus={()=>focusSpot(s)} onOpen={()=>openSpot(s)}/>)}</div></>}</div></aside></>}{section==="surprise"&&<SurpriseMe spots={spots} origin={initialView?.center??null} saved={savedIds} onSave={save} slugFor={s=>slugById.get(s.id)}/>} {section==="account"&&<AccountView spots={spots} saved={savedIds} distanceFor={distanceFor} slugFor={s=>slugById.get(s.id)} onFocus={focusSpot} onOpen={openSpot}/>} {selectedSpot&&<SpotSheet spot={selectedSpot} onClose={closeSheet}/>}<BottomNav active={section} onChange={setSection}/></div>;
}
