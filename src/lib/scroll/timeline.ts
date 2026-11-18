import type { SectionEntry, SectionId } from "@/data/navigation";
import { STAGE_SCREENS, type ScrollState } from "./phases.ts";

/**
 * The shared progression model.
 *
 * A timeline is built from the measured layout — where each section starts
 * and ends in the document — and maps any scroll position to one state and a
 * progress value. Everything that reacts to scroll (the 3D scene, the active
 * section, the URL) asks this model, so they cannot disagree.
 *
 * It is a pure function of scroll position and layout. There is no history:
 * scrolling back yields exactly the states seen on the way forward, stopping
 * anywhere is stable, and jumping anywhere is valid.
 *
 * Between two sections A and B, with the viewport H tall, when B is behind a
 * face of the cube:
 *
 *   A's bottom reaches the viewport bottom ── EXITING ──┐  (A scrolls out: 1 screen)
 *                                             ROTATING  │
 *                                             ALIGNED   │  (empty track: only the scene)
 *                                             APPROACHING
 *   B's top reaches the viewport top ───── PORTAL_TRANSITION  (B is pinned: 1 screen)
 *
 * How A is left and how B is reached are independent. A is left with EXITING
 * (back out of its face) or, when the cube was open while it was read, with
 * CLOSING (the pieces return). B is reached through its face as above, or by
 * the cube coming apart — UNLOCKING over the track, OPENING over B's pin — or
 * with nothing at all when it simply follows A inside the open cube.
 *
 * After the last section the document loops: its content rests for a while
 * (FINALE_HOLD), then LOOP runs until the copy of the hero that closes the
 * document sits exactly where the real one does at the top.
 */

export interface SectionBounds {
  id: SectionId;
  /**
   * Scroll position at which the section is entered and reading begins: its
   * content at the top of the viewport, fully revealed. For a pinned section
   * this is the end of its pin, not the top of its element.
   */
  top: number;
  /** Document offset of the section's bottom edge. */
  bottom: number;
  /** How the section is reached from the one before it. */
  entry: SectionEntry;
  /** Scroll distance the content stays in place after `top`, fully revealed. Only the finale has one. */
  hold?: number;
}

export interface ScrollLayout {
  /** Viewport height in pixels. */
  viewport: number;
  /** Sections in scroll order: the hero first, the finale last. */
  sections: SectionBounds[];
  /**
   * Scroll position at which the document has come back to its start: the
   * copy of the hero at its end sits where the real one does at the top.
   * Absent when the document does not loop (no scene, reduced motion).
   */
  loopEnd?: number;
}

export interface Segment {
  state: ScrollState;
  /** Scroll positions where the segment begins and ends. */
  start: number;
  end: number;
  /** Section being left, and section being reached. Equal while resting in one. */
  from: SectionId;
  to: SectionId;
}

export interface Timeline {
  viewport: number;
  /** Contiguous and ordered: each segment starts where the previous one ends. */
  segments: Segment[];
}

export interface ScrollSnapshot {
  state: ScrollState;
  /** 0 at the start of the current segment, 1 at its end. */
  progress: number;
  from: SectionId;
  to: SectionId;
  /** Index of the current segment in the timeline. */
  index: number;
}

export function createSnapshot(): ScrollSnapshot {
  return { state: "HERO", progress: 0, from: "hero", to: "hero", index: 0 };
}

/** Whether the cube is open — in pieces, out of view — while a section reached this way is read. */
const readsOpen = (entry: SectionEntry) => entry === "opening" || entry === "inside";

export function buildTimeline({ viewport, sections, loopEnd }: ScrollLayout): Timeline {
  const segments: Segment[] = [];
  let cursor = 0;

  /** Appends a segment ending at `end`; boundaries can only move forward. */
  const add = (state: ScrollState, end: number, from: SectionId, to: SectionId) => {
    const clamped = Math.max(cursor, end);
    segments.push({ state, start: cursor, end: clamped, from, to });
    cursor = clamped;
  };

  /** Splits the span up to `end` among the three free-scroll stages. */
  const addMiddle = (end: number, from: SectionId, to: SectionId) => {
    const { rotate, aligned, approach } = STAGE_SCREENS;
    const span = Math.max(0, end - cursor);
    const total = rotate + aligned + approach;
    const start = cursor;
    add("ROTATING", start + (span * rotate) / total, from, to);
    add("ALIGNED", start + (span * (rotate + aligned)) / total, from, to);
    add("APPROACHING", end, from, to);
  };

  sections.forEach((section, index) => {
    const isHero = index === 0;
    const resting: ScrollState = isHero ? "HERO" : "INSIDE_SECTION";
    const next = sections[index + 1];

    if (!next) {
      // The last section. Past its start the last segment simply stays, complete —
      // unless the document loops: then the content rests and the way back begins.
      if (loopEnd === undefined || loopEnd <= section.top) return;
      add("FINALE_HOLD", Math.min(loopEnd, section.top + (section.hold ?? 0)), section.id, section.id);
      add("LOOP", loopEnd, section.id, sections[0].id);
      return;
    }

    // Resting inside the section: from its top until its bottom reaches the viewport bottom.
    add(resting, section.bottom - viewport, section.id, section.id);

    const end = Math.max(cursor, next.top);
    const span = end - cursor;

    if (next.entry === "inside") {
      // Nothing happens between the two: the next one takes over as it crosses mid-viewport.
      add(resting, cursor + span / 2, section.id, section.id);
      return;
    }

    // With the tracks collapsed (no scene, reduced motion) there is no free
    // scroll between sections. The leaving stage then takes the first half of
    // the span, so the next section becomes active as it crosses mid-viewport.
    const collapsed = span <= viewport;

    // --- Leaving the section ---------------------------------------------
    if (isHero) {
      const hold = collapsed ? span / 2 : Math.min(STAGE_SCREENS.heroHold * viewport, span - viewport);
      add("HERO", cursor + hold, section.id, section.id);
    } else {
      // One screen: the time the section's bottom takes to cross the viewport.
      const leaving: ScrollState = readsOpen(section.entry) ? "CLOSING" : "EXITING";
      add(leaving, cursor + Math.min(viewport, span / 2), section.id, section.id);
    }

    // --- Reaching the next one --------------------------------------------
    // Whatever reveals it plays over its pin: the last screen before reading begins.
    const pinStart = Math.max(cursor, end - viewport);
    if (next.entry === "opening") {
      add("UNLOCKING", pinStart, section.id, next.id);
      add("OPENING", end, section.id, next.id);
    } else if (next.entry === "finale") {
      add("FINALE", end, section.id, next.id);
    } else {
      addMiddle(pinStart, section.id, next.id);
      add("PORTAL_TRANSITION", end, section.id, next.id);
    }
  });

  return { viewport, segments };
}

/** Resolves a scroll position into `out` (reused to avoid per-frame allocation). */
export function resolveTimeline(out: ScrollSnapshot, timeline: Timeline, scroll: number): ScrollSnapshot {
  const { segments } = timeline;
  // Past the last boundary the last segment stays, complete.
  let index = segments.length - 1;
  for (let i = 0; i < segments.length; i++) {
    const candidate = segments[i];
    // Empty segments (a stage with no room in this layout) are never "current".
    if (candidate.end > candidate.start && scroll < candidate.end) {
      index = i;
      break;
    }
  }

  const segment = segments[index];
  const length = segment.end - segment.start;
  out.state = segment.state;
  out.progress = length > 0 ? Math.min(1, Math.max(0, (scroll - segment.start) / length)) : scroll >= segment.end ? 1 : 0;
  out.from = segment.from;
  out.to = segment.to;
  out.index = index;
  return out;
}

/** Share of LOOP after which the hero is in charge again: its copy is about to come into view. */
export const LOOP_HANDOVER = 0.5;

/**
 * The section in charge of the URL, the navbar and the ambient color.
 * A destination takes over once the way into it has begun — the approach to
 * its face, or the cube's pieces flying out; until then the section being
 * left stays active.
 */
export function activeSectionOf(snapshot: ScrollSnapshot): SectionId {
  switch (snapshot.state) {
    case "HERO":
    case "EXITING":
    case "CLOSING":
    case "UNLOCKING":
    case "ROTATING":
    case "ALIGNED":
      return snapshot.from;
    case "LOOP":
      return snapshot.progress < LOOP_HANDOVER ? snapshot.from : snapshot.to;
    default:
      return snapshot.to;
  }
}
