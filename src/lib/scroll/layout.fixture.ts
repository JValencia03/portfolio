import { SECTIONS } from "../../data/navigation.ts";
import { PIN_SCREENS, STAGE_SCREENS, TRACK_SCREENS } from "./phases.ts";
import type { ScrollLayout } from "./timeline.ts";

/** Viewport height used by the tests. */
export const H = 1000;

/**
 * Lays the sections out the way the page does: an empty track before each
 * section that the scene leads into, a pin of one screen where the content
 * is revealed in place, and — after the finale — the track and the copy of
 * the hero that close the loop.
 *
 * `sceneScale` 0 reproduces the page without a scene: no tracks, no pins, no loop.
 */
export function layoutWith(sceneScale: number, contentScreens = 1 + STAGE_SCREENS.dwell): ScrollLayout {
  let y = 0;
  const sections = SECTIONS.map(({ id, entry }) => {
    if (entry === "opening" || entry === "portal" || entry === "finale") {
      y += TRACK_SCREENS[entry] * H * sceneScale;
    }
    // Everything the scene reveals is pinned for a screen first; what follows inside the cube just scrolls.
    const pin = entry === "start" || entry === "inside" ? 0 : PIN_SCREENS * H * sceneScale;
    // The finale's content then rests in place for a while longer.
    const hold = entry === "finale" ? STAGE_SCREENS.finaleHold * H * sceneScale : 0;
    const height = (entry === "start" || entry === "finale" ? 1 : contentScreens) * H;
    // Reading starts where the reveal ends.
    const bounds = { id, entry, top: y + pin, bottom: y + pin + hold + height, hold };
    y += pin + hold + height;
    return bounds;
  });
  return {
    viewport: H,
    sections,
    // The copy of the hero starts one track below the finale.
    loopEnd: sceneScale > 0 ? y + TRACK_SCREENS.loop * H * sceneScale : undefined,
  };
}
