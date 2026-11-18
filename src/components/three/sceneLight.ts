import { Color } from "three";

/**
 * The colored light of the section in charge, for this frame.
 *
 * `LightingRig` writes it once per frame; whatever else glows in that color
 * (the accent cubes of the background) reads it. The strength follows the
 * scroll exactly; the color eases from one section's to the next, so reading
 * on from one project into another shifts the light instead of switching it.
 */
export const sceneLight = {
  color: new Color("#ffffff"),
  /** 0 with no colored section in charge. */
  strength: 0,
};
