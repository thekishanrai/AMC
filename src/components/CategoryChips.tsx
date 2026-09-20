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
    <div className="glass flex max-w-[calc(100vw-32px)] items-center gap-0.5 overflow-x-auto rounded-full p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
  );
}
