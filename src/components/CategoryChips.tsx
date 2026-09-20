"use client";

import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/types";

export const MIN_DISTANCE_KM = 20;
export const MAX_DISTANCE_KM = 500;
export const DEFAULT_DISTANCE_KM = 250;
const DISTANCE_STEP_KM = 10;

export default function CategoryChips({
  active,
  onChange,
  maxDistanceKm,
  onDistanceChange,
}: {
  active: Category | "all";
  onChange: (category: Category | "all") => void;
  maxDistanceKm: number;
  onDistanceChange: (km: number) => void;
}) {
  const fillPct = Math.round(
    ((maxDistanceKm - MIN_DISTANCE_KM) / (MAX_DISTANCE_KM - MIN_DISTANCE_KM)) * 100
  );

  return (
    <div className="glass flex w-full max-w-[calc(100vw-32px)] flex-col rounded-[26px] p-1.5">
      <div className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(({ key, label, color, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className="font-headline flex shrink-0 items-center gap-1 rounded-full px-2.5 py-2 text-[13px] transition-colors"
              style={{
                background: isActive ? color : "transparent",
                color: isActive ? "#141210" : "var(--ink-muted)",
              }}
            >
              <Icon size={15} stroke={2} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mx-2 my-1.5 h-px" style={{ background: "rgba(245,240,230,0.16)" }} />

      <div className="px-3 pb-1.5 pt-0.5">
        <div
          className="font-headline mb-1 text-[10px] uppercase"
          style={{ color: "var(--ink-muted)", letterSpacing: "0.04em" }}
        >
          Maximum distance
        </div>
        <div
          className="relative h-[26px] overflow-hidden rounded-full"
          style={{ background: "rgba(245,240,230,0.1)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${fillPct}%`,
              background: "linear-gradient(90deg, rgba(254,80,0,0.3), rgba(254,80,0,0.85))",
            }}
          />
          <div className="font-headline relative flex h-full items-center justify-end pr-3 text-[12px]">
            {maxDistanceKm} km
          </div>
          <input
            type="range"
            min={MIN_DISTANCE_KM}
            max={MAX_DISTANCE_KM}
            step={DISTANCE_STEP_KM}
            value={maxDistanceKm}
            onChange={(e) => onDistanceChange(Number(e.target.value))}
            aria-label="Maximum distance in kilometers"
            className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}
