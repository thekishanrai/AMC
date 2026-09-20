"use client";

import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/types";

export const MIN_DISTANCE_KM = 20;
export const MAX_DISTANCE_KM = 500;
export const DEFAULT_DISTANCE_KM = 280;
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
    <div
      className="w-full border-t-4 border-black px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]"
      style={{ background: "var(--pantone-orange)" }}
    >
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className="font-headline flex shrink-0 items-center gap-1.5 rounded-full border-2 border-black px-3 py-1.5 text-[13px] transition-colors"
              style={{
                background: isActive ? "#000000" : "#ffffff",
                color: isActive ? "#ffffff" : "#000000",
              }}
            >
              <Icon size={15} stroke={2} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <div className="font-headline mb-1.5 text-[10px] uppercase tracking-wide text-white">
          Maximum distance
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative h-[22px] flex-1 overflow-hidden rounded-full border-2 border-black bg-white">
            <div className="absolute inset-y-0 left-0 bg-black" style={{ width: `${fillPct}%` }} />
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
          <span className="font-headline text-[12px] whitespace-nowrap text-white">
            {maxDistanceKm} km
          </span>
        </div>
      </div>
    </div>
  );
}
