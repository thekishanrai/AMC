"use client";

import { useState } from "react";
import {
  IconX,
  IconRoute,
  IconCalendar,
  IconCar,
  IconMotorbike,
  IconMapPin,
  IconClock,
  IconRuler2,
  IconSparkles,
  IconBackpack,
  IconAlertTriangle,
  IconDirections,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconTrain,
  IconHelpCircle,
} from "@tabler/icons-react";
import { categoryMeta } from "@/lib/categories";
import { formatDuration, youtubeThumbnail } from "@/lib/format";
import type { Spot } from "@/types";


function SheetPhoto({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`amc-sheet-photo ${loaded ? "is-loaded" : "is-loading"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onLoad={() => setLoaded(true)} onError={onError} />
    </div>
  );
}

// Shared "at a glance" chip used for the quick-facts row. Kept distinct from
// the glass-chip travel pills below so the two rows read as separate groups.
function FactChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-xl border-2 border-black bg-white px-3 py-2 text-xs capitalize">
      {icon}
      {label}
    </span>
  );
}

export default function SpotSheet({
  spot,
  onClose,
}: {
  spot: Spot;
  onClose: () => void;
}) {
  const meta = categoryMeta(spot.category);
  const Icon = meta.icon;
  const photos = spot.photos?.filter(Boolean) ?? [];
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set());
  const visiblePhotos = photos.filter((src) => !failedPhotos.has(src));
  const highlights = spot.highlights?.filter(Boolean) ?? [];
  const thingsToCarry = spot.things_to_carry?.filter(Boolean) ?? [];
  const faqs = spot.faqs?.filter((f) => f.question && f.answer) ?? [];
  const videoThumb = spot.youtube_url ? youtubeThumbnail(spot.youtube_url) : null;

  const hasFacts =
    spot.difficulty || spot.altitude_m != null || spot.duration_label || spot.best_season;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${spot.name} — ${directionsUrl}`
  )}`;

  return (
    <div className="sheet-enter amc-spot-sheet absolute inset-x-0 bottom-0 z-30 flex max-h-[85vh] flex-col rounded-t-3xl border-t-4 border-black bg-white shadow-2xl">
      <div className="amc-sheet-scroll flex-1 overflow-y-auto rounded-t-[20px]">
        {/* Hero photo strip, falls back to a black-outline icon panel when there are no photos yet */}
        <div className="amc-sheet-hero relative">
          {visiblePhotos.length > 0 ? (
            <div className="amc-sheet-gallery flex snap-x snap-mandatory gap-0 overflow-x-auto rounded-t-[20px]">
              {visiblePhotos.map((src, i) => (
                <SheetPhoto key={src + i} src={src} alt={`${spot.name} photo ${i + 1}`} onError={() => setFailedPhotos((current) => new Set(current).add(src))} />
              ))}
            </div>
          ) : (
            <div className="amc-sheet-photo-fallback">
              <span><Icon size={30} stroke={2} /></span>
              <small>{spot.category.toUpperCase()} ESCAPE</small>
              <strong>{spot.name}</strong>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 mx-auto mt-2 h-1 w-10 rounded-full bg-black/30" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="glass-chip absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="amc-sheet-content px-5 pt-4">
          <div className="amc-sheet-title flex items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-black bg-white">
              <Icon size={18} stroke={2} color="#000" />
            </span>
            <div>
              <h2 className="font-headline text-[19px] leading-tight">{spot.name}</h2>
              <p className="text-xs text-[var(--ink-muted)]">
                {spot.region ? spot.region : <span className="capitalize">{spot.category}</span>}
              </p>
            </div>
          </div>

          {hasFacts && (
            <div className="amc-sheet-facts mt-4 flex flex-wrap gap-2">
              {spot.difficulty && <FactChip icon={<IconRoute size={14} />} label={spot.difficulty} />}
              {spot.altitude_m != null && (
                <FactChip icon={<IconRuler2 size={14} />} label={`${spot.altitude_m} m`} />
              )}
              {spot.duration_label && <FactChip icon={<IconClock size={14} />} label={spot.duration_label} />}
              {spot.best_season && <FactChip icon={<IconCalendar size={14} />} label={spot.best_season} />}
            </div>
          )}

          {spot.description && (
            <p className="amc-sheet-description mt-3 text-[14px] leading-relaxed text-[var(--ink)]">{spot.description}</p>
          )}

          {highlights.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
                  <IconSparkles size={14} className="mt-0.5 flex-shrink-0 text-[var(--pantone-orange)]" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          {videoThumb && (
            <a
              href={spot.youtube_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-3.5 block aspect-video overflow-hidden rounded-2xl border-2 border-black bg-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={videoThumb} alt={`${spot.name} video`} className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <span className="flex h-11 w-14 items-center justify-center rounded-xl bg-[#ff0000]">
                  <IconBrandYoutube size={22} color="#fff" stroke={1.6} />
                </span>
              </span>
            </a>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {spot.distance_from_mumbai_km != null && (
              <span className="flex items-center gap-1.5 glass-chip rounded-full px-3 py-1.5 text-xs">
                <IconMapPin size={15} />
                {spot.distance_from_mumbai_km} km · Mumbai
              </span>
            )}
            {spot.time_by_car_minutes != null && (
              <span className="flex items-center gap-1.5 glass-chip rounded-full px-3 py-1.5 text-xs">
                <IconCar size={15} />
                {formatDuration(spot.time_by_car_minutes)}
              </span>
            )}
            {spot.time_by_bike_minutes != null && (
              <span className="flex items-center gap-1.5 glass-chip rounded-full px-3 py-1.5 text-xs">
                <IconMotorbike size={15} />
                {formatDuration(spot.time_by_bike_minutes)}
              </span>
            )}
            {spot.distance_from_pune_km != null && (
              <span className="flex items-center gap-1.5 glass-chip rounded-full px-3 py-1.5 text-xs">
                <IconMapPin size={15} />
                {spot.distance_from_pune_km} km · Pune
              </span>
            )}
          </div>

          {spot.how_to_reach && (
            <div className="mt-4 border-t-2 border-black pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                How to reach
              </p>
              <p className="mt-1 text-[13px] leading-relaxed">{spot.how_to_reach}</p>
            </div>
          )}

          {spot.nearest_station && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                <IconTrain size={14} />
                Nearest station
              </p>
              <p className="mt-1 text-[13px] leading-relaxed">{spot.nearest_station}</p>
            </div>
          )}

          {thingsToCarry.length > 0 && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                <IconBackpack size={14} />
                Things to carry
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {thingsToCarry.map((item, i) => (
                  <span key={i} className="glass-chip rounded-full px-3 py-1.5 text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {spot.safety_note && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border-2 border-[var(--pantone-orange)] bg-[#fff3ec] px-3 py-2.5">
              <IconAlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[var(--pantone-orange)]" />
              <p className="text-[12.5px] leading-relaxed">{spot.safety_note}</p>
            </div>
          )}

          {faqs.length > 0 && (
            <div className="mt-4 border-t-2 border-black pt-3 pb-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                <IconHelpCircle size={14} />
                FAQs
              </p>
              <div className="mt-2 space-y-2.5">
                {faqs.map((faq, i) => (
                  <div key={i}>
                    <p className="text-[13px] font-medium leading-snug">{faq.question}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="amc-sheet-actions flex flex-shrink-0 gap-2.5 border-t-2 border-black bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-black bg-black px-4 py-3 text-sm font-medium text-white"
        >
          <IconDirections size={18} />
          Get directions
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-black bg-black px-4 py-3 text-sm font-medium text-white"
        >
          <IconBrandWhatsapp size={18} />
          Share
        </a>
      </div>
    </div>
  );
}
