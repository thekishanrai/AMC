"use client";

import { IconX, IconBell } from "@tabler/icons-react";

export default function GeoGateBanner({
  city,
  onDismiss,
  onNotify,
}: {
  city: string | null;
  onDismiss: () => void;
  onNotify: () => void;
}) {
  return (
    <div className="banner-enter glass-solid absolute inset-x-4 top-[calc(env(safe-area-inset-top)+114px)] z-30 rounded-2xl p-4 shadow-xl">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--ink-muted)]"
      >
        <IconX size={16} />
      </button>
      <p className="pr-6 text-sm leading-snug">
        Not live in {city ?? "your city"} yet — Maharashtra only, for now. Your city is next.
      </p>
      <button
        type="button"
        onClick={onNotify}
        className="mt-3 flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-1.5 text-xs font-medium text-white"
        style={{ background: "var(--pantone-orange)" }}
      >
        <IconBell size={14} />
        Notify me when it&apos;s live
      </button>
    </div>
  );
}
