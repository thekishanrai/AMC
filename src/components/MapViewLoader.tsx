"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-dvh w-dvw" style={{ background: "rgb(28 26 23)" }} />,
});

export default function MapViewLoader() {
  return <MapView />;
}
