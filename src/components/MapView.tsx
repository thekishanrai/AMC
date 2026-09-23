"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
// Desktop: the list panel is always open beside the map; no drawer states.
const DESKTOP_QUERY = "(min-width: 1024px)";
// Below this zoom, pins collapse to name-only (no stats row) so a full
// region of spots stays browsable instead of turning into a wall of pills.
const DETAIL_ZOOM_THRESHOLD = 10.5;

export default function MapView({ initialSpot = null }: { initialSpot?: Spot | null }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl")["default"] | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(() => {
    if (initialSpot) return { center: [initialSpot.lng, initialSpot.lat], zoom: 12 };
    const saved = loadSavedLocation();
    return saved ? { center: [saved.lng, saved.lat], zoom: 11 } : { center: CENTER, zoom: 8 };
  });
  const [spots, setSpots] = useState<Spot[]>(() => initialSpot ? [initialSpot] : []);
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

  const slugById = useMemo(() => buildSlugMap(spots), [spots]);

  function closeSheet() {
    setSelectedSpot(null);
    router.push("/");
  }

  // Card details update the URL without remounting the map. Browser back and
  // the mobile swipe-back gesture both emit popstate, so close the sheet when
  // history returns to the homepage entry.
  useEffect(() => {
    if (initialSpot) return;
    const onPopState = () => {
      if (window.location.pathname === "/") setSelectedSpot(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialSpot]);

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
    if (initialSpot || loadSavedLocation()) return;

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
  }, [initialSpot]);

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
    setLocating(false);
    if (!loc) {
      // A denied, unavailable or timed-out GPS request should leave the user
      // with a useful local browse state rather than an IP/VPN surprise.
      applyLocation(19.076, 72.8777, "Mumbai", { pin: false });
      return;
    }

    applyLocation(loc.lat, loc.lng, loc.city ?? "Your location", {
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

  function distanceFor(s:Spot){if(!initialView)return s.distance_from_mumbai_km??Infinity;const[lng,lat]=initialView.center;return Math.min(haversineKm(lat,lng,s.lat,s.lng),s.distance_from_mumbai_km??Infinity,s.distance_from_pune_km??Infinity)}
  const visible=spots.filter(s=>(activeCategory==="all"||s.category===activeCategory)&&distanceFor(s)<=maxDistanceKm&&(!search||`${s.name} ${s.region??""}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>distanceFor(a)-distanceFor(b));
  function focusSpot(s:Spot,withSheet=false){const desktop=typeof window!=="undefined"&&window.matchMedia(DESKTOP_QUERY).matches;const panel=desktop?Math.min(withSheet?760:440,window.innerWidth*(withSheet?.56:.4))+40:0;mapRef.current?.flyTo({center:[s.lng,s.lat],zoom:11.8,padding:desktop?{top:60,bottom:60,left:60,right:panel+40}:{bottom:drawerState==="min"?90:320,top:80,left:0,right:0}})}
  function openSpot(s:Spot){setSelectedSpot(s);const slug=slugById.get(s.id);if(slug)history.pushState(null,"",`/${s.category}/${slug}`);focusSpot(s,true)}
  function save(id:string){setSavedIds(cur=>{const n=new Set(cur);n.add(id);saveSpotIds([...n]);return n})}
  function nextDrawer(dir:number){setDrawerState(v=>{const states:["min","half","full"]=["min","half","full"];return states[Math.max(0,Math.min(2,states.indexOf(v)+dir))]})}
  useEffect(()=>{if(!mapReady||!initialSpot||!window.matchMedia(DESKTOP_QUERY).matches)return;const desktopPad=Math.min(760,window.innerWidth*.56)+80;mapRef.current?.easeTo({center:[initialSpot.lng,initialSpot.lat],zoom:12,padding:{top:60,bottom:60,left:60,right:desktopPad},duration:0})},[mapReady,initialSpot]);
useEffect(()=>{const mq=window.matchMedia(DESKTOP_QUERY);const sync=()=>{if(mq.matches)setDrawerState("half")};sync();mq.addEventListener("change",sync);return()=>mq.removeEventListener("change",sync)},[]);
useEffect(()=>{if(section!=="explore"||drawerState==="min")return;const frame=requestAnimationFrame(()=>{const panel=document.querySelector<HTMLElement>(".amc-discovery-panel"),scroll=panel?.querySelector<HTMLElement>(".amc-drawer-scroll"),card=panel?.querySelector<HTMLElement>(".amc-spot-card");if(!panel||!scroll||!card)return;const top=card.offsetTop,styles=getComputedStyle(card),cardHeight=card.offsetHeight+parseFloat(styles.marginBottom||"0"),navClearance=78,handleHeight=44,padding=24;panel.style.setProperty("--amc-default-drawer-height",`${Math.ceil(handleHeight+top+cardHeight+padding+navClearance)}px`) });return()=>cancelAnimationFrame(frame)},[section,drawerState,spots.length,visible.length,maxDistanceKm,activeCategory])
  useEffect(()=>{if(drawerState!=="half")return;const scroll=document.querySelector<HTMLElement>(".amc-discovery-panel .amc-drawer-scroll");if(scroll)scroll.scrollTop=0},[drawerState])
  return <div className={`amc-app section-${section}${selectedSpot?" has-sheet":""}`}><div className="amc-map" ref={containerRef}/>{section==="explore"&&!mapReady&&<div className="amc-map-loading amc-static-map"/>}<TopBar search={search} onSearch={value=>{setSearch(value);setCardLimit(12)}}/>{section==="explore"&&<>{gate&&!gateDismissed&&<GeoGateBanner city={gate.city} onDismiss={()=>setGateDismissed(true)} onNotify={()=>setGateDismissed(true)}/>}<div className="amc-location-float"><LocationPicker label={locationLabel} confirmed={locationConfirmed} onPick={handlePickCity} onUseGps={handleNearMe} locatingGps={locating}/></div><aside className={`amc-discovery-panel state-${drawerState}`} onClickCapture={e=>{if(drawerMoved.current){e.preventDefault();e.stopPropagation();drawerMoved.current=false}}} onPointerDown={e=>{if(window.matchMedia(DESKTOP_QUERY).matches)return;if((e.target as HTMLElement).closest(".amc-card-list"))return;if(e.pointerType==="mouse"&&e.button!==0)return;drawerStartY.current=e.clientY;drawerStartX.current=e.clientX;drawerStartTime.current=performance.now();drawerLastY.current=e.clientY;drawerLastTime.current=drawerStartTime.current;drawerMoved.current=false;drawerGesture.current="pending"}} onPointerMove={e=>{if(drawerStartY.current===null)return;const panel=e.currentTarget,dy=e.clientY-drawerStartY.current,dx=e.clientX-drawerStartX.current;if(drawerGesture.current==="pending"&&Math.max(Math.abs(dx),Math.abs(dy))>7){if(Math.abs(dx)>Math.abs(dy)){drawerGesture.current="content";drawerStartY.current=null;return}drawerStartHeight.current=panel.getBoundingClientRect().height;drawerGesture.current="drawer";drawerMoved.current=true;panel.setPointerCapture(e.pointerId);panel.classList.add("is-dragging")}if(drawerGesture.current!=="drawer")return;const min=169,max=window.innerHeight-66;panel.style.setProperty("height",`${Math.max(min,Math.min(max,drawerStartHeight.current-dy))}px`);drawerLastY.current=e.clientY;drawerLastTime.current=performance.now()}} onPointerUp={e=>{const panel=e.currentTarget;if(drawerStartY.current!==null&&drawerGesture.current==="drawer"){const d=e.clientY-drawerStartY.current,elapsed=Math.max(1,performance.now()-drawerLastTime.current),velocity=(e.clientY-drawerLastY.current)/elapsed;if(d< -30||velocity<-.35)nextDrawer(1);else if(d>30||velocity>.35)nextDrawer(-1)}drawerStartY.current=null;drawerGesture.current="pending";panel.classList.remove("is-dragging");panel.style.removeProperty("height")}} onPointerCancel={e=>{drawerStartY.current=null;drawerGesture.current="pending";e.currentTarget.classList.remove("is-dragging");e.currentTarget.style.removeProperty("height")}}><button className="amc-drawer-grab" data-drawer-handle aria-label={`Drawer ${drawerState}. Drag to resize`} onClick={()=>{if(!drawerMoved.current)nextDrawer(drawerState==="full"?-1:1);drawerMoved.current=false}}><span/></button><div className="amc-drawer-scroll" onScroll={e=>{if(!window.matchMedia(DESKTOP_QUERY).matches)return;const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-700)setCardLimit(limit=>Math.min(visible.length,limit+12))}}><div className="amc-panel-title"><div><p>NEAR {locationLabel.toUpperCase()}</p><h1>{spots.length===0?"Finding places":visible.length+" places to forget Monday exists"}</h1></div></div>{drawerState!=="min"&&<><CategoryChips active={activeCategory} onChange={value=>{setActiveCategory(value);setCardLimit(12)}} maxDistanceKm={maxDistanceKm} onDistanceChange={value=>{setMaxDistanceKm(value);setCardLimit(12)}}/><div className="amc-results-label"><span><strong>PLACES BETTER THAN MONDAY</strong><small>within {maxDistanceKm} km</small></span></div><div className="amc-card-list" onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onPointerCancel={e=>e.stopPropagation()} onScroll={e=>{const rail=e.currentTarget;const box=rail.getBoundingClientRect();const cards=[...rail.querySelectorAll<HTMLElement>("[data-spot-id]")];const best=cards.sort((a,b)=>Math.abs(a.getBoundingClientRect().left-box.left)-Math.abs(b.getBoundingClientRect().left-box.left))[0];const spot=visible.find(s=>s.id===best?.dataset.spotId);if(spot)focusSpot(spot);if(rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-460)setCardLimit(limit=>Math.min(visible.length,limit+12))}}>{spots.length===0?[0,1].map(i=><div key={i} className="amc-spot-card amc-card-skeleton"><i/><b/><span/></div>):visible.slice(0,cardLimit).map(s=><SpotCard key={s.id} spot={s} distance={distanceFor(s)} slug={slugById.get(s.id)} onFocus={()=>focusSpot(s)} onOpen={()=>openSpot(s)}/>)}</div></>}</div></aside></>}{section==="surprise"&&<SurpriseMe spots={spots} origin={initialView?.center??null} saved={savedIds} onSave={save} slugFor={s=>slugById.get(s.id)}/>} {section==="account"&&<AccountView spots={spots} saved={savedIds} distanceFor={distanceFor} slugFor={s=>slugById.get(s.id)} onFocus={focusSpot} onOpen={openSpot}/>} {selectedSpot&&<SpotSheet spot={selectedSpot} onClose={closeSheet} shareUrl={`${typeof window!=="undefined"?window.location.origin:"https://antimondayclub.com"}/${selectedSpot.category}/${slugById.get(selectedSpot.id)??""}`}/>} <BottomNav active={section} onChange={next=>{if(selectedSpot)closeSheet();setSection(next)}}/></div>;
}
