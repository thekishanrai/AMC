"use client";

import { IconX, IconRoute, IconCalendar, IconCar } from "@tabler/icons-react";
import { categoryMeta } from "@/lib/categories";
import type { Spot } from "@/types";

export default function SpotSheet({
  spot,
  onClose,
}: {
  spot: Spot;
  onClose: () => void;
}) {
  const meta = categoryMeta(spot.category);
  const Icon = meta.icon;

  return (
    <div className="sheet-enter glass-solid absolute inset-x-0 bottom-0 z-30 rounded-t-3xl px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-2xl">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: meta.color }}
          >
            <Icon size={18} stroke={2} color="#141210" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold leading-tight">{spot.name}</h2>
            <p className="text-xs capitalize text-[var(--ink-muted)]">{spot.category}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-muted)]"
        >
          <IconX size={18} />
        </button>
      </div>

      {spot.description && (
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink)]">
          {spot.description}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
        {spot.difficulty && (
          <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
            <IconRoute size={14} />
            <span className="capitalize">{spot.difficulty}</span>
          </div>
        )}
        {spot.best_season && (
          <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
            <IconCalendar size={14} />
            <span>{spot.best_season}</span>
          </div>
        )}
        {(spot.distance_from_mumbai_km != null || spot.distance_from_pune_km != null) && (
          <div className="col-span-2 flex items-center gap-1.5 text-[var(--ink-muted)]">
            <IconCar size={14} />
            <span>
              {spot.distance_from_mumbai_km != null && `${spot.distance_from_mumbai_km}km from Mumbai`}
              {spot.distance_from_mumbai_km != null && spot.distance_from_pune_km != null && " · "}
              {spot.distance_from_pune_km != null && `${spot.distance_from_pune_km}km from Pune`}
            </span>
          </div>
        )}
      </div>

      {spot.how_to_reach && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
            How to reach
          </p>
          <p className="mt-1 text-[13px] leading-relaxed">{spot.how_to_reach}</p>
        </div>
      )}
    </div>
  );
}
