import { SECTIONS, type SectionId } from "@/data/navigation";
import { buildTimeline, type Timeline } from "./timeline";

/**
 * The live timeline of the page.
 *
 * One module-level instance, because its two consumers live in different
 * React trees: the navigation coordinator (DOM) and the scene (React Three
 * Fiber has its own reconciler, so context does not reach it). Both read the
 * same object, which is the whole of the bridge between scroll and WebGL:
 * the scene samples `window.scrollY` against this timeline once per frame.
 *
 * The timeline is rebuilt from measurements whenever the layout changes
 * (resize, fonts, language, tracks collapsing), so it cannot drift from the
 * document it describes.
 */

type Listener = () => void;

/**
 * Fired on `window` after the document's layout has changed shape under the
 * visitor (the transition tracks collapsing). The navigation coordinator
 * answers by landing again on the section the URL names.
 */
export const LAYOUT_RESHAPED_EVENT = "portfolio:layout-reshaped";

/** Marks the copy of the hero that closes the document: where it starts, the document has come round. */
const LOOP_END_SELECTOR = "[data-loop-end]";

let timeline: Timeline | null = null;
let anchors: Partial<Record<SectionId, number>> = {};
let loopEnd: number | null = null;
let jumps = 0;
let laps = 0;
const listeners = new Set<Listener>();
const lapListeners = new Set<Listener>();

/**
 * How long a section's content layer stays pinned at its start: the height
 * the section has beyond its content. Zero when nothing is pinned.
 */
function pinLength(section: HTMLElement): number {
  const content = section.firstElementChild;
  if (!section.hasAttribute("data-pin") || !(content instanceof HTMLElement)) return 0;
  return Math.max(0, section.offsetHeight - content.offsetHeight);
}

/**
 * How long a section's content rests in place after it has been revealed,
 * still pinned: the `data-hold` attribute, in screens. Never more than the pin.
 */
function holdLength(section: HTMLElement, pin: number): number {
  const screens = Number(section.dataset.hold);
  return Number.isFinite(screens) ? Math.min(pin, screens * window.innerHeight) : 0;
}

function measure() {
  const scrollY = window.scrollY;
  const sections = SECTIONS.flatMap(({ id, entry }) => {
    const element = document.getElementById(id);
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    const pin = pinLength(element);
    const hold = holdLength(element, pin);
    // Reading begins where the reveal ends: the end of the pin, less any rest (see SectionBounds.top).
    return [{ id, entry, top: rect.top + scrollY + pin - hold, bottom: rect.bottom + scrollY, hold }];
  });
  // Every section must be in the document for the model to be meaningful.
  if (sections.length !== SECTIONS.length) return;

  // The document loops only while the copy of the hero that closes it is laid out.
  const replica = document.querySelector<HTMLElement>(LOOP_END_SELECTOR);
  loopEnd = replica && replica.getClientRects().length > 0 ? replica.getBoundingClientRect().top + scrollY : null;

  timeline = buildTimeline({ viewport: window.innerHeight, sections, loopEnd: loopEnd ?? undefined });
  // Browsers snap scroll offsets to device pixels, so a landing position is
  // nudged just past the boundary: always inside the section, never a hair
  // short of it and still in the portal.
  anchors = Object.fromEntries(
    sections.map((section) => [section.id, section.top > 0 ? Math.ceil(section.top) + 1 : 0]),
  );
  listeners.forEach((listener) => listener());
}

export const scrollStore = {
  /** The current timeline, or `null` before the first measurement. */
  get timeline(): Timeline | null {
    return timeline;
  },

  /** Increments on every programmatic jump, so the scene can cut instead of easing. */
  get jumps(): number {
    return jumps;
  },

  notifyJump() {
    jumps += 1;
  },

  /**
   * Scroll position at which the document has come back to its start, or
   * `null` when it does not loop. Scrolling past it continues from the top.
   */
  get loopEnd(): number | null {
    return loopEnd;
  },

  /** How many times the scroll has gone round. */
  get laps(): number {
    return laps;
  },

  notifyLap() {
    laps += 1;
    lapListeners.forEach((listener) => listener());
  },

  subscribeLaps(listener: Listener): () => void {
    lapListeners.add(listener);
    return () => {
      lapListeners.delete(listener);
    };
  },

  /** Scroll position at which a section is entered: content at the top, fully revealed. */
  anchorOf(id: SectionId): number | null {
    return anchors[id] ?? null;
  },

  measure,

  /** Notifies after each re-measurement. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Measures now and keeps measuring on layout changes. Returns the function that stops it. */
  start(): () => void {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    // The document's height changes with fonts, language, and tracks appearing or collapsing.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  },
};
