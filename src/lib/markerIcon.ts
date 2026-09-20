import type { Category } from "@/types";

const PATHS: Record<Category, string> = {
  trek: "M3 19h18L14 6l-3 5-2-2Z",
  waterfall: "M12 3c2.5 3 3.5 5.2 3.5 7.2a3.5 3.5 0 1 1-7 0C8.5 8.2 9.5 6 12 3Z M9 15c0 2.2 1.3 4 3 4s3-1.8 3-4",
  camping: "M12 4 3 19h18L12 4Z M12 4 6 19 M12 4l6 15",
};

export function markerSvg(category: Category, color: string) {
  return `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#141210" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="${PATHS[category]}" />
    </svg>
  `;
}
