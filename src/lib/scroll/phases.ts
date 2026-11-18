/**
 * The explicit states of the scroll experience. At any scroll position the
 * experience is in exactly one of them (see timeline.ts).
 *
 *   HERO                the cube whole and idle on its slot
 *   UNLOCKING           it leaves for the stage and is turned, layer by layer
 *   OPENING             its pieces fly out and what was inside is revealed
 *   CLOSING             the pieces come back and the cube solves itself
 *   ROTATING … EXITING  the journey through a face: turn, align, approach, portal, read, leave
 *   FINALE              the cube comes apart around the closing content
 *   FINALE_HOLD         that content rests, the pieces around it
 *   LOOP                the pieces gather into the cube, which returns to its slot: the start again
 */
export type ScrollState =
  | "HERO"
  | "UNLOCKING"
  | "OPENING"
  | "CLOSING"
  | "ROTATING"
  | "ALIGNED"
  | "APPROACHING"
  | "PORTAL_TRANSITION"
  | "INSIDE_SECTION"
  | "EXITING"
  | "FINALE"
  | "FINALE_HOLD"
  | "LOOP";

/**
 * Scroll distance of each stage, in viewport heights ("screens").
 * This is the one place to retime the experience: track heights in CSS and
 * every stage boundary are derived from these numbers.
 *
 * EXITING, CLOSING, OPENING and PORTAL_TRANSITION are not listed because
 * their length is fixed by geometry: each lasts exactly one screen — the time
 * a section's edge takes to cross the viewport, or its content stays pinned.
 */
export const STAGE_SCREENS = {
  /** Scroll at the top of the page during which the hero stays at rest. */
  heroHold: 0.08,
  /** Free scroll between the hero leaving and the reveal: the cube is turned here. */
  unlock: 1,
  rotate: 0.9,
  aligned: 0.15,
  approach: 0.6,
  /** Free scroll of the finale before its content is pinned (the pin adds one more screen). */
  finale: 1,
  /** How long the finale's content rests, fully revealed, before the loop takes it away. */
  finaleHold: 0.6,
  /** Free scroll between the finale leaving and the hero coming back. */
  loop: 1,
  /** Extra height of a section, so even short content rests on screen for a while. */
  dwell: 0.3,
} as const;

const { unlock, rotate, aligned, approach, finale, loop } = STAGE_SCREENS;

/** Screens of free scroll between a section's exit and the next one's portal. */
export const MIDDLE_SCREENS = rotate + aligned + approach;

/**
 * Screens during which a section's content stays pinned in place at its
 * start. This is where PORTAL_TRANSITION and OPENING play: the content does
 * not slide in, it is revealed where it stands. The finale's content is
 * pinned the same way while the cube comes apart around it.
 */
export const PIN_SCREENS = 1;

/** What a track leads to: a section revealed by the opening cube, one behind a face, the finale, or the start again. */
export type TrackKind = "opening" | "portal" | "finale" | "loop";

/**
 * Height of the empty track that separates two sections, in screens.
 *
 * A track holds exactly the free-scroll stages: what leaves plays while the
 * previous section scrolls out, and what arrives plays inside the next
 * section's pin.
 */
export const TRACK_SCREENS: Record<TrackKind, number> = {
  opening: unlock,
  portal: MIDDLE_SCREENS,
  finale,
  loop,
};
