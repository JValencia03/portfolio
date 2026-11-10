/**
 * The explicit states of the scroll experience. At any scroll position the
 * experience is in exactly one of them (see timeline.ts).
 */
export type ScrollState =
  | "HERO"
  | "ROTATING"
  | "ALIGNED"
  | "APPROACHING"
  | "PORTAL_TRANSITION"
  | "INSIDE_SECTION"
  | "EXITING"
  | "FINALE";

/**
 * Scroll distance of each stage, in viewport heights ("screens").
 * This is the one place to retime the experience: track heights in CSS and
 * every stage boundary are derived from these numbers.
 *
 * EXITING and PORTAL_TRANSITION are not listed because their length is fixed
 * by geometry: each lasts exactly one screen — the time a section's edge
 * takes to cross the viewport.
 */
export const STAGE_SCREENS = {
  /** Scroll at the top of the page during which the hero stays at rest. */
  heroHold: 0.08,
  rotate: 0.9,
  aligned: 0.15,
  approach: 0.6,
  /** Free scroll of the finale before its content is pinned (the pin adds one more screen). */
  finale: 1,
  /** Extra height of a section, so even short content rests on screen for a while. */
  dwell: 0.3,
} as const;

const { heroHold, rotate, aligned, approach, finale } = STAGE_SCREENS;

/** Screens of free scroll between a section's exit and the next one's portal. */
export const MIDDLE_SCREENS = rotate + aligned + approach;

/**
 * Screens during which a section's content stays pinned in place at its
 * start. This is where PORTAL_TRANSITION plays: the content does not slide
 * in, it is revealed where it stands. The finale's content is pinned the
 * same way while the cube comes apart around it.
 */
export const PIN_SCREENS = 1;

export type TrackKind = "fromHero" | "between" | "finale";

/**
 * Height of the empty track that separates two sections, in screens.
 *
 * Between two sections the track holds exactly the free-scroll stages: the
 * exit plays while the previous section scrolls out, and the portal plays
 * inside the next section's pin. Leaving the hero, the hero's own exit
 * overlaps the hold and the rotation, so its track is one screen shorter.
 */
export const TRACK_SCREENS: Record<TrackKind, number> = {
  fromHero: heroHold + MIDDLE_SCREENS - 1,
  between: MIDDLE_SCREENS,
  finale,
};
