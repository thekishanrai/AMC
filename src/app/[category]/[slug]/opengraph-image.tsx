import { ImageResponse } from "next/og";
import { getPublishedSpots, getSpotSummariesSafe } from "@/lib/spots";
import { photoSrc } from "@/lib/photo";

// Per-spot link preview for WhatsApp and friends. Uses the spot's licensed
// cover photo when it has one, otherwise a branded card with the spot name.
export const alt = "Anti Monday Club spot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const ORANGE = "#FF5800";

// Brand fonts (Jersey 25 headlines, Share Tech body), fetched as TTF subsets.
async function googleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch { return null; }
}
const CREAM = "#fffaf2";

export default async function Image({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { slug } = await params;
  const spot = (await getPublishedSpots()).find((s) => s.slug === slug);
  const summary = spot ? (await getSpotSummariesSafe()).find((s) => s.id === spot.id) : undefined;
  const cover = photoSrc(summary?.photos?.find(Boolean));
  // Satori can't shape Devanagari conjuncts/matras correctly, so a Marathi
  // name would render garbled. Use the place's region as the headline instead.
  const rawName = spot?.name ?? "Anti Monday Club";
  const name = /[^\u0000-\u024f]/.test(rawName) ? (spot?.region ?? "Anti Monday Club") : rawName;
  const where = spot?.region ?? "Maharashtra";
  const category = (spot?.category ?? "escape").toUpperCase();

  const headText = `${name}ANTI MONDAY CLUB${category}`;
  const bodyText = `${where} · better than Monday`;
  const [jersey, shareTech] = await Promise.all([googleFont("Jersey 25", headText), googleFont("Share Tech", bodyText)]);
  const fonts = [
    ...(jersey ? [{ name: "Jersey 25", data: jersey, weight: 400 as const, style: "normal" as const }] : []),
    ...(shareTech ? [{ name: "Share Tech", data: shareTech, weight: 400 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: ORANGE, padding: 40, position: "relative" }}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", border: "6px solid #000", borderRadius: 36, background: cover ? "rgba(0,0,0,0.25)" : ORANGE, padding: 48, boxShadow: "14px 14px 0 #000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", background: "#111", color: ORANGE, borderRadius: 18, padding: "12px 22px", fontSize: 34, fontFamily: "Jersey 25", letterSpacing: 2 }}>ANTI MONDAY CLUB</div>
            <div style={{ display: "flex", background: CREAM, color: "#111", border: "4px solid #000", borderRadius: 999, padding: "8px 22px", fontSize: 30, fontFamily: "Jersey 25" }}>{category}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: name.length > 28 ? 88 : 112, fontFamily: "Jersey 25", color: cover ? CREAM : "#111", lineHeight: 1 }}>{name}</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 34, fontFamily: "Share Tech", color: cover ? CREAM : "#111" }}>{bodyText}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
