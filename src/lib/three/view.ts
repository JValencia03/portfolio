import { CUBE_EDGE } from "../rubik/dimensions.ts";

/**
 * The fixed geometry of the view: where the camera rests and how large the
 * cube is drawn on stage. Pure numbers, so the scene and the math that plans
 * motion for it (lib/rubik) agree on what is in frame.
 */

/** Distance of the camera from the stage plane (z = 0) while at rest. */
export const CAMERA_REST_Z = 12;
export const CAMERA_FOV = 35;

/** Share of the viewport's smaller side that the cube's edge spans on stage. */
export const STAGE_FILL = 0.4;

export const TAN_HALF_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);

export interface StageView {
  /** Half-width and half-height of what the camera sees on the stage plane, in cube units. */
  halfWidth: number;
  halfHeight: number;
  /** Distance from the resting camera to the stage plane, in cube units. */
  distance: number;
}

/** The view of the stage for a viewport's aspect ratio (width / height), measured in cube units. */
export function stageView(aspect: number): StageView {
  // The cube's edge spans STAGE_FILL of the smaller side, which fixes the size of everything else.
  const halfSmaller = CUBE_EDGE / (2 * STAGE_FILL);
  return {
    halfWidth: aspect >= 1 ? halfSmaller * aspect : halfSmaller,
    halfHeight: aspect >= 1 ? halfSmaller : halfSmaller / aspect,
    distance: halfSmaller / (TAN_HALF_FOV * Math.min(1, aspect)),
  };
}
