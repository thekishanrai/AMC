"use client";

import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/types";

export default function CategoryChips({
  active,
  onChange,
}: {
  active: Category | "all";
  onChange: (category: Category | "all") => void;
}) {
  return (
    <div className="glass flex items-center gap-1 rounded-full p-1.5">
      {CATEGORIES.map(({ key, label, color, icon: Icon }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: isActive ? color : "transparent",
              color: isActive ? "#141210" : "var(--ink-muted)",
            }}
          >
            <Icon size={16} stroke={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
