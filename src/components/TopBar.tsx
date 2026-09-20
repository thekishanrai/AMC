import { IconUserCircle } from "@tabler/icons-react";

export default function TopBar() {
  return (
    <div
      className="absolute top-0 inset-x-0 z-20 flex items-center justify-between border-b-4 border-black px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3"
      style={{ background: "var(--pantone-orange)" }}
    >
      <div className="font-headline uppercase text-[22px] tracking-tight text-white">
        Anti Monday Club
      </div>
      <button
        type="button"
        aria-label="Account"
        className="glass flex h-9 w-9 items-center justify-center rounded-full"
      >
        <IconUserCircle size={19} stroke={1.75} />
      </button>
    </div>
  );
}
