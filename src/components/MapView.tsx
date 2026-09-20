"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/lib/supabase";
import { categoryMeta } from "@/lib/categories";
import { markerSvg } from "@/lib/markerIcon";
import { getGpsLocation, getIpLocation, isInMaharashtra } from "@/lib/geo";
import type { Category, Spot } from "@/types";
import TopBar from "./TopBar";
import CategoryChips from "./CategoryChips";
import NearMeButton from "./NearMeButton";
import SpotSheet from "./SpotSheet";
import GeoGateBanner from "./GeoGateBanner";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const CENTER: [number, number] = [73.55, 18.75];

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
      const el = document.createElement("button");
      el.type = "button";
      el.className = "glass-solid";
      el.style.cssText = `
        display: flex; align-items: center; gap: 6px;
        padding: 6px 10px 6px 6px; border-radius: 999px;
        font-size: 12px; font-weight: 600; white-space: nowrap;
        cursor: pointer;
      `;
      el.innerHTML = `
        <span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:${meta.color};flex-shrink:0;">
          ${markerSvg(spot.category, meta.color)}
        </span>
        <span>${spot.name}</span>
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
    const dot = document.createElement("div");
    dot.style.cssText = `
      width: 16px; height: 16px; border-radius: 999px;
      background: #3d7ab5; border: 3px solid white;
      box-shadow: 0 0 0 4px rgba(61,122,181,0.25);
    `;
    userMarkerRef.current = new mapboxgl.Marker({ element: dot })
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
