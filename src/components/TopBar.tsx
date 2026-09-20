import { IconBell } from "@tabler/icons-react";

export default function TopBar() {
  return (
    <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
      <div className="glass font-headline rounded-full px-4 py-2 text-[17px] tracking-tight">
        antimondayclub
      </div>
      <div className="flex items-center gap-2">
        <div className="glass rounded-full px-3 py-2 text-xs font-medium text-[var(--ink-muted)]">
          Mumbai · Pune
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="glass flex h-9 w-9 items-center justify-center rounded-full"
        >
          <IconBell size={17} stroke={1.75} />
        </button>
      </div>
    </div>
  );
}
