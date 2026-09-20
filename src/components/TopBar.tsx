import { IconUserCircle } from "@tabler/icons-react";

export default function TopBar() {
  return (
    <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
      <div className="glass font-headline rounded-full px-4 py-2 text-[17px] tracking-tight">
        antimondayclub
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
