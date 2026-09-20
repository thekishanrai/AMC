"use client";

import { IconLocation } from "@tabler/icons-react";

export default function NearMeButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="font-headline glass-solid flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] shadow-lg disabled:opacity-60"
    >
      <IconLocation size={16} stroke={2} className={loading ? "animate-pulse" : ""} />
      {loading ? "Finding you…" : "Spots near me"}
    </button>
  );
}
