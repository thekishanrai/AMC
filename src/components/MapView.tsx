"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/lib/supabase";
import { categoryMeta } from "@/lib/categories";
import { markerSvg, statIconSvg } from "@/lib/markerIcon";
import { formatDuration } from "@/lib/format";
import { getGpsLocation, getIpLocation, isInMaharashtra } from "@/lib/geo";
import type { Category, Spot } from "@/types";
import TopBar from "./TopBar";
import CategoryChips from "./CategoryChips";
import NearMeButton from "./NearMeButton";
import SpotSheet from "./SpotSheet";
import GeoGateBanner from "./GeoGateBanner";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const CENTER: [number, number] = [73.55, 18.75];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [locating, setLocating] = useState(false);
  const [gate, setGate] = useState<{ city: string | null } | null>(null);
  const [gateDismissed, setGateDismissed] = useState(false);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: CENTER,
      zoom: 8,
      attributionControl: false,
    });
    map.on("load", () => setMapReady(true));
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

  // silent IP-based geo-gate check on load, no permission prompt
  useEffect(() => {
    getIpLocation().then((loc) => {
      if (loc && !isInMaharashtra(loc.lat, loc.lng)) {
        setGate({ city: loc.city });
      }
    });
  }, []);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filtered =
      activeCategory === "all" ? spots : spots.filter((s) => s.category === activeCategory);

    filtered.forEach((spot) => {
      const meta = categoryMeta(spot.category);
      const stats: string[] = [];
      if (spot.distance_from_mumbai_km != null) {
        stats.push(`<span style="display:flex;align-items:center;gap:3px;">${statIconSvg("pin")}${spot.distance_from_mumbai_km} km</span>`);
      }
      if (spot.time_by_car_minutes != null) {
        stats.push(`<span style="display:flex;align-items:center;gap:3px;">${statIconSvg("car")}${formatDuration(spot.time_by_car_minutes)}</span>`);
      }
      if (spot.time_by_bike_minutes != null) {
        stats.push(`<span style="display:flex;align-items:center;gap:3px;">${statIconSvg("bike")}${formatDuration(spot.time_by_bike_minutes)}</span>`);
      }

      const el = document.createElement("button");
      el.type = "button";
      el.className = "glass-solid";
      el.style.cssText = `
        display: flex; flex-direction: column;
        padding: 6px 14px; border-radius: 18px;
        cursor: pointer; text-align: left;
      `;
      el.innerHTML = `
        <span style="display:flex;align-items:center;gap:7px;white-space:nowrap;">
          <span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:${meta.color};flex-shrink:0;">
            ${markerSvg(spot.category, meta.color)}
          </span>
          <span style="font-family:var(--font-headline),monospace;font-size:18px;font-weight:600;">${escapeHtml(spot.name)}</span>
        </span>
        ${
          stats.length > 0
            ? `<span style="height:1px;background:rgba(245,240,230,0.16);margin:3px 8px 3px 31px;"></span>
               <span style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--ink-muted);padding-left:31px;white-space:nowrap;">${stats.join("")}</span>`
            : ""
        }
      `;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedSpot(spot);
        map.flyTo({ center: [spot.lng, spot.lat], zoom: 13, padding: { bottom: 280, top: 0, left: 0, right: 0 } });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [spots, activeCategory, mapReady]);

  async function handleNearMe() {
    setLocating(true);
    const loc = (await getGpsLocation()) ?? (await getIpLocation());
    setLocating(false);
    if (!loc || !mapRef.current) return;

    const map = mapRef.current;
    map.flyTo({ center: [loc.lng, loc.lat], zoom: 11 });

    if (userMarkerRef.current) userMarkerRef.current.remove();
    const pin = document.createElement("div");
    pin.style.cssText = `display: flex; flex-direction: column; align-items: center;`;
    pin.innerHTML = `
      <div class="glass-solid" style="position:relative;border-radius:14px;padding:6px 10px;margin-bottom:7px;box-shadow:0 6px 16px rgba(0,0,0,0.3);">
        <span style="font-family:var(--font-pixel),monospace;font-size:9px;line-height:1.4;color:#f5f1ea;white-space:nowrap;letter-spacing:0.02em;">I NEED WEEKEND</span>
        <div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid rgba(28,26,23,0.92);"></div>
      </div>
      <svg width="52" height="64" viewBox="0 0 52 64">
        <defs><clipPath id="userPinPhoto"><circle cx="26" cy="24" r="17"/></clipPath></defs>
        <path d="M26 2C13.8 2 4 11.8 4 24c0 17 22 38 22 38s22-21 22-38C48 11.8 38.2 2 26 2Z" fill="#ff5722" stroke="#fff" stroke-width="2.5"/>
        <image href="/user-location.jpg" x="9" y="7" width="34" height="34" clip-path="url(#userPinPhoto)" preserveAspectRatio="xMidYMid slice"/>
      </svg>
    `;
    userMarkerRef.current = new mapboxgl.Marker({ element: pin, anchor: "bottom" })
      .setLngLat([loc.lng, loc.lat])
      .addTo(map);

    if (!isInMaharashtra(loc.lat, loc.lng)) {
      setGate({ city: loc.city });
      setGateDismissed(false);
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
      />

      <TopBar />

      {gate && !gateDismissed && (
        <GeoGateBanner
          city={gate.city}
          onDismiss={() => setGateDismissed(true)}
          onNotify={() => setGateDismissed(true)}
        />
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <NearMeButton onClick={handleNearMe} loading={locating} />
        <CategoryChips active={activeCategory} onChange={setActiveCategory} />
      </div>

      {selectedSpot && (
        <SpotSheet spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      )}
    </div>
  );
}
