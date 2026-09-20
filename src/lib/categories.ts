import { IconMountain, IconDroplet, IconTent, IconMap2 } from "@tabler/icons-react";
import type { Category } from "@/types";

export const CATEGORIES: {
  key: Category | "all";
  label: string;
  icon: typeof IconMountain;
}[] = [
  { key: "all", label: "All", icon: IconMap2 },
  { key: "trek", label: "Treks", icon: IconMountain },
  { key: "waterfall", label: "Waterfalls", icon: IconDroplet },
  { key: "camping", label: "Camping", icon: IconTent },
];

export function categoryMeta(category: Category) {
  return CATEGORIES.find((c) => c.key === category)!;
}
