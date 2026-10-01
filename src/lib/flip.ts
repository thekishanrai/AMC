// FLIP motion helpers: record where elements are, change the layout, then
// animate each element from its old box to its new one. Only transform and
// opacity animate (compositor-friendly) through the Web Animations API, so
// it runs on every browser the app supports, including older iPhones.

export const MORPH_MS = 420; // matches the drawer's .42s slide
export const EASE = "cubic-bezier(.22,1,.36,1)"; // matches the drawer's curve

const running = new Set<Animation>();

export function motionOK() {
  return typeof window !== "undefined"
    && typeof Element.prototype.animate === "function"
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Keep a handle on every morph so a new touch can settle them all at once.
export function track(a: Animation, cleanup?: () => void) {
  running.add(a);
  let done = false;
  const end = () => { if (done) return; done = true; running.delete(a); cleanup?.(); };
  a.addEventListener("finish", end);
  a.addEventListener("cancel", end);
  return a;
}

// Jump every running morph to its end state (e.g. the user grabs the drawer).
export function finishMorphs() {
  running.forEach((a) => { try { a.finish(); } catch { a.cancel(); } });
}

// Rect of `el` relative to `origin` (both from getBoundingClientRect).
export function relRect(el: Element, origin: DOMRect) {
  const r = el.getBoundingClientRect();
  return new DOMRect(r.left - origin.left, r.top - origin.top, r.width, r.height);
}

// Transform that draws an element laid out at `to` inside the box `from`.
export function boxTransform(from: DOMRect, to: DOMRect, uniform = false) {
  const sx = from.width / Math.max(1, to.width), sy = uniform ? sx : from.height / Math.max(1, to.height);
  return `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${sx},${sy})`;
}

export function intersects(r: DOMRect, w: number, h: number) {
  return r.right > 0 && r.bottom > 0 && r.left < w && r.top < h;
}

// A fixed, click-through layer for ghosts (snapshots of the old layout). It
// carries the drawer's state classes so cloned cards keep their old styling;
// .amc-ghost-layer strips the panel's own box styles in CSS.
export function ghostLayer(host: HTMLElement, classes: string) {
  const layer = document.createElement("div");
  layer.className = `amc-ghost-layer ${classes}`;
  layer.setAttribute("aria-hidden", "true");
  host.appendChild(layer);
  return layer;
}

// Clone `el` into `layer` at viewport rect `at`.
export function ghostOf(el: HTMLElement, at: DOMRect, layer: HTMLElement) {
  const g = el.cloneNode(true) as HTMLElement;
  g.removeAttribute("data-spot-id");
  g.querySelectorAll(".is-marquee").forEach((n) => n.classList.remove("is-marquee"));
  g.setAttribute("inert", "");
  Object.assign(g.style, {
    position: "absolute", left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px`,
    margin: "0", transformOrigin: "0 0", pointerEvents: "none",
  });
  layer.appendChild(g);
  return g;
}

// Remove a ghost layer once all its animations have ended.
export function whenDone(anims: Animation[], fn: () => void) {
  if (!anims.length) { fn(); return; }
  Promise.allSettled(anims.map((a) => a.finished)).then(fn);
}
