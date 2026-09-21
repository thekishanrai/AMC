"use client";

import { useState } from "react";
import { IconMapPin, IconX, IconLocation } from "@tabler/icons-react";
import { QUICK_CITIES, type QuickCity } from "@/lib/locationOverride";

export default function LocationPicker({
  label,
  onPick,
  onUseGps,
  locatingGps,
}: {
  label: string;
  onPick: (city: QuickCity) => void;
  onUseGps: () => void;
  locatingGps: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-solid flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium shadow-lg"
      >
        <IconMapPin size={16} stroke={2} />
        Select your location
      </button>

      {open && (
        <div className="absolute inset-0 z-40 flex items-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="sheet-enter relative w-full rounded-t-3xl border-t-4 border-black bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline text-[18px]">Select your location</h2>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Currently: {label}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="glass-chip flex h-8 w-8 items-center justify-center rounded-full"
              >
                <IconX size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onUseGps();
                setOpen(false);
              }}
              disabled={locatingGps}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-black px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--pantone-orange)" }}
            >
              <IconLocation size={17} />
              {locatingGps ? "Finding you…" : "Use my precise location"}
            </button>

            <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
              Or pick your area
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {QUICK_CITIES.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => {
                    onPick(city);
                    setOpen(false);
                  }}
                  className="rounded-xl border-2 border-black bg-white px-3 py-2.5 text-sm font-medium"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
