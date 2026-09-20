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

export function statIconSvg(kind: "pin" | "car" | "bike") {
  const path =
    kind === "pin"
      ? '<path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>'
      : kind === "car"
        ? '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><rect x="3" y="11" width="18" height="5" rx="1.5"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/>'
        : '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17h6l3-6h4"/><path d="M11 11h3l2 3"/><path d="M9 17l2-6"/>';

  return `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${path}
    </svg>
  `;
}
