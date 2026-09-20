import { IconMountain, IconDroplet, IconTent, IconMap2 } from "@tabler/icons-react";
import type { Category } from "@/types";

export const CATEGORIES: {
  key: Category | "all";
  label: string;
  color: string;
  icon: typeof IconMountain;
}[] = [
  { key: "all", label: "All", color: "var(--accent)", icon: IconMap2 },
  { key: "trek", label: "Treks", color: "var(--trek)", icon: IconMountain },
  { key: "waterfall", label: "Waterfalls", color: "var(--waterfall)", icon: IconDroplet },
  { key: "camping", label: "Camping", color: "var(--camping)", icon: IconTent },
];

export function categoryMeta(category: Category) {
  return CATEGORIES.find((c) => c.key === category)!;
}
